import bcrypt from "bcrypt";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { SignJWT } from "jose";
import { AuditActionType, AuditTargetType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { safeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

const AuthSchema = z.object({
  serial_number: z.string().min(3).max(120),
  secret: z.string().min(10).max(500),
});

// Basic in-memory rate limiting (works fine for dev / single server)
// If you deploy multi-instance, replace with Redis/Upstash later.
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);

  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  if (b.count >= limit) {
    return { ok: false, remaining: 0, resetAt: b.resetAt };
  }

  b.count += 1;
  return { ok: true, remaining: limit - b.count };
}

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    const body = await req.json();
    const parsed = AuthSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { serial_number, secret } = parsed.data;

    const rl = rateLimit(`${ip}:${serial_number}`, 10, 60_000);
    if (!rl.ok) {
      return Response.json(
        { error: "Too many attempts" },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rl.resetAt! - Date.now()) / 1000)),
          },
        }
      );
    }

    const device = await prisma.device.findUnique({
      where: { serial_number },
      select: {
        device_id: true,
        secret_hash: true,
        status: true,
        site_id: true,
      },
    });

    if (!device) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ok = await bcrypt.compare(secret, device.secret_hash);
    if (!ok) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secretKey = process.env.DEVICE_JWT_SECRET ?? process.env.JWT_SECRET;
    if (!secretKey) {
      return Response.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const token = await new SignJWT({
      device_id: device.device_id,
      site_id: device.site_id,
      typ: "device",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(new TextEncoder().encode(secretKey));

    const previousStatus = device.status;

    await prisma.device.update({
      where: { device_id: device.device_id },
      data: { last_seen_at: new Date(), status: "online" },
    });

    await safeAuditLog({
      action_type: AuditActionType.other,
      target_type: AuditTargetType.device,
      target_id: device.device_id,
      details: {
        kind: "device_authenticated",
        site_id: device.site_id,
        serial_number,
        previous_status: previousStatus,
        new_status: "online",
      },
    });

    return Response.json(
      { device_token: token, expires_in_seconds: 15 * 60 },
      { status: 200 }
    );
  } catch (err) {
    console.error("Device auth error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}