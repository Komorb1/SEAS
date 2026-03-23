import { z } from "zod";
import type { NextRequest } from "next/server";
import { AuditActionType, AuditTargetType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-request";
import { safeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ deviceId: string }>;
};

const UpdateDeviceStatusSchema = z.object({
  status: z.enum(["online", "offline", "maintenance"]),
});

function isOwnerOrAdmin(role: string): boolean {
  return role === "owner" || role === "admin";
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const userId = await requireUserId(req);
    const { deviceId } = await ctx.params;

    const body = await req.json();
    const parsed = UpdateDeviceStatusSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const device = await prisma.device.findUnique({
      where: { device_id: deviceId },
      select: {
        device_id: true,
        site_id: true,
        status: true,
      },
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

    const nextStatus = parsed.data.status;

    const updated = await prisma.device.update({
      where: { device_id: deviceId },
      data: { status: nextStatus },
      select: {
        device_id: true,
        status: true,
      },
    });

    if (device.status !== updated.status) {
      await safeAuditLog({
        user_id: userId,
        action_type: AuditActionType.other,
        target_type: AuditTargetType.device,
        target_id: updated.device_id,
        details: {
          kind: "device_status_changed",
          site_id: device.site_id,
          old_status: device.status,
          new_status: updated.status,
        },
      });
    }

    return Response.json({ device: updated }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "unauthenticated") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Update device status error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}