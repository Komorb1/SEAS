import { z } from "zod";
import type { NextRequest } from "next/server";
import { AuditActionType, AuditTargetType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-request";
import { safeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ sensorId: string }>;
};

const UpdateSensorSchema = z
  .object({
    is_enabled: z.boolean().optional(),
    status: z.enum(["ok", "faulty", "disabled"]).optional(),
    location_label: z.string().min(1).max(120).nullable().optional(),
  })
  .refine(
    (v) =>
      v.is_enabled !== undefined ||
      v.status !== undefined ||
      v.location_label !== undefined,
    {
      message: "Provide at least one field to update",
    }
  );

function isOwnerOrAdmin(role: string): boolean {
  return role === "owner" || role === "admin";
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const userId = await requireUserId(req);
    const { sensorId } = await ctx.params;

    const body = await req.json();
    const parsed = UpdateSensorSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const sensor = await prisma.sensor.findUnique({
      where: { sensor_id: sensorId },
      select: {
        sensor_id: true,
        device_id: true,
        is_enabled: true,
        status: true,
        location_label: true,
      },
    });

    if (!sensor) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const device = await prisma.device.findUnique({
      where: { device_id: sensor.device_id },
      select: { site_id: true },
    });

    if (!device) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const membership = await prisma.siteUser.findUnique({
      where: { site_id_user_id: { site_id: device.site_id, user_id: userId } },
      select: { role: true },
    });

    if (!membership || !isOwnerOrAdmin(membership.role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const changed_fields: string[] = [];

    if (
      parsed.data.is_enabled !== undefined &&
      parsed.data.is_enabled !== sensor.is_enabled
    ) {
      changed_fields.push("is_enabled");
    }

    if (
      parsed.data.status !== undefined &&
      parsed.data.status !== sensor.status
    ) {
      changed_fields.push("status");
    }

    if (
      parsed.data.location_label !== undefined &&
      parsed.data.location_label !== sensor.location_label
    ) {
      changed_fields.push("location_label");
    }

    const updated = await prisma.sensor.update({
      where: { sensor_id: sensorId },
      data: {
        ...(parsed.data.is_enabled !== undefined
          ? { is_enabled: parsed.data.is_enabled }
          : {}),
        ...(parsed.data.status !== undefined
          ? { status: parsed.data.status }
          : {}),
        ...(parsed.data.location_label !== undefined
          ? { location_label: parsed.data.location_label }
          : {}),
      },
      select: {
        sensor_id: true,
        is_enabled: true,
        status: true,
        location_label: true,
      },
    });

    if (changed_fields.length > 0) {
      await safeAuditLog({
        user_id: userId,
        action_type: AuditActionType.other,
        target_type: AuditTargetType.sensor,
        target_id: updated.sensor_id,
        details: {
          kind: "sensor_updated",
          site_id: device.site_id,
          device_id: sensor.device_id,
          changed_fields,
        },
      });
    }

    return Response.json({ sensor: updated }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "unauthenticated") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Update sensor error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}