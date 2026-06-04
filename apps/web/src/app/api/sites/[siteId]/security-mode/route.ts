import { z } from "zod";
import type { NextRequest } from "next/server";
import { AuditActionType, AuditTargetType } from "@prisma/client";

import { requireCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

const SecurityModeSchema = z.object({
  security_mode: z.enum(["armed", "disarmed"]),
});

type RouteContext = {
  params: Promise<{
    siteId: string;
  }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const userId = await requireCurrentUserId();
    const { siteId } = await context.params;

    const body = await req.json();
    const parsed = SecurityModeSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const membership = await prisma.siteUser.findUnique({
      where: {
        site_id_user_id: {
          site_id: siteId,
          user_id: userId,
        },
      },
      select: {
        role: true,
        site: {
          select: {
            site_id: true,
            is_deleted: true,
          },
        },
      },
    });

    if (!membership || membership.site.is_deleted) {
      return Response.json({ error: "Site not found" }, { status: 404 });
    }

    if (membership.role !== "owner" && membership.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const site = await prisma.site.update({
      where: { site_id: siteId },
      data: {
        security_mode: parsed.data.security_mode,
      },
      select: {
        site_id: true,
        security_mode: true,
      },
    });

    await safeAuditLog({
      user_id: userId,
      action_type: AuditActionType.update_settings,
      target_type: AuditTargetType.site,
      target_id: site.site_id,
      details: {
        kind: "site_security_mode_updated",
        security_mode: site.security_mode,
      },
    });

    return Response.json({ site });
  } catch (err) {
    console.error("Update site security mode error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
