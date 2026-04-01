import bcrypt from "bcrypt";
import crypto from "crypto";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { AuditActionType, AuditTargetType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { safeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

const ProvisionSchema = z.object({
  serial_number: z.string().min(3).max(120),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ProvisionSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { serial_number } = parsed.data;

    const device = await prisma.device.findUnique({
      where: { serial_number },
      select: {
        device_id: true,
        serial_number: true,
        site_id: true,
        secret_hash: true,
      },
    });

    if (!device) {
      return Response.json({ error: "Device not found" }, { status: 404 });
    }

    if (device.secret_hash) {
      return Response.json(
        { error: "Device already provisioned" },
        { status: 409 }
      );
    }

    const rawSecret = crypto.randomBytes(32).toString("hex");
    const secretHash = await bcrypt.hash(rawSecret, 10);

    await prisma.device.update({
      where: { device_id: device.device_id },
      data: { secret_hash: secretHash },
    });

    await safeAuditLog({
      action_type: AuditActionType.other,
      target_type: AuditTargetType.device,
      target_id: device.device_id,
      details: {
        kind: "device_provisioned",
        site_id: device.site_id,
        serial_number: device.serial_number,
      },
    });

    return Response.json(
      {
        device_secret: rawSecret,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Device provision error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}