import { z } from "zod";
import type { NextRequest } from "next/server";
import { AuditActionType, AuditTargetType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-request";
import { safeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ siteId: string }>;
};

const RegisterDeviceSchema = z.object({
  serial_number: z.string().min(3).max(100),
  device_type: z.string().min(2).max(100),
  location_label: z.string().min(2).max(100).optional().nullable(),
});

function isOwnerOrAdmin(role: string): boolean {
  return role === "owner" || role === "admin";
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const userId = await requireUserId(req);
    const { siteId } = await ctx.params;

    const body = await req.json();
    const parsed = RegisterDeviceSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const membership = await prisma.siteUser.findUnique({
      where: { site_id_user_id: { site_id: siteId, user_id: userId } },
      select: { role: true },
    });

    if (!membership || !isOwnerOrAdmin(membership.role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const device = await prisma.device.create({
      data: {
        site_id: siteId,
        serial_number: parsed.data.serial_number,
        device_type: parsed.data.device_type,
        secret_hash: null,
        location_label: parsed.data.location_label ?? null,
        status: "offline",
      },
      select: {
        device_id: true,
        site_id: true,
        serial_number: true,
        device_type: true,
        location_label: true,
        status: true,
        created_at: true,
      },
    });

    await safeAuditLog({
      user_id: userId,
      action_type: AuditActionType.other,
      target_type: AuditTargetType.device,
      target_id: device.device_id,
      details: {
        kind: "device_registered",
        site_id: device.site_id,
        serial_number: device.serial_number,
        device_type: device.device_type,
        status: device.status,
        provisioned: false,
      },
    });

    return Response.json(
      {
        device,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "unauthenticated") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (typeof err === "object" && err !== null && "code" in err) {
      const code = (err as { code?: string }).code;
      if (code === "P2002") {
        return Response.json(
          { error: "serial_number already exists" },
          { status: 409 }
        );
      }
    }

    console.error("Register device error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const userId = await requireUserId(req);
    const { siteId } = await ctx.params;

    const membership = await prisma.siteUser.findUnique({
      where: { site_id_user_id: { site_id: siteId, user_id: userId } },
      select: { role: true },
    });

    if (!membership) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const devices = await prisma.device.findMany({
      where: { site_id: siteId },
      select: {
        device_id: true,
        site_id: true,
        serial_number: true,
        device_type: true,
        status: true,
        location_label: true,
        last_seen_at: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
    });

    return Response.json({ devices }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "unauthenticated") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("List devices error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}