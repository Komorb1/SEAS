import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-request";
import type { NextRequest } from "next/server";
import { AuditActionType, AuditTargetType } from "@prisma/client";
import { safeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ siteId: string }>;
};

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const userId = await requireUserId(req);
    const { siteId } = await ctx.params;

    const membership = await prisma.siteUser.findUnique({
      where: { site_id_user_id: { site_id: siteId, user_id: userId } },
      select: { role: true },
    });

    if (!membership || membership.role !== "owner") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const existingSite = await prisma.site.findUnique({
      where: { site_id: siteId },
      select: {
        site_id: true,
        name: true,
        status: true,
        city: true,
        country: true,
      },
    });

    if (!existingSite) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.site.delete({
      where: { site_id: siteId },
    });

    await safeAuditLog({
      user_id: userId,
      action_type: AuditActionType.other,
      target_type: AuditTargetType.site,
      target_id: existingSite.site_id,
      details: {
        kind: "site_deleted",
        name: existingSite.name,
        status: existingSite.status,
        city: existingSite.city,
        country: existingSite.country,
      },
    });

    return Response.json({ message: "Site deleted" }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "unauthenticated") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Delete site error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}