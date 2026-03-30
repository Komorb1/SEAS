import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-request";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { AuditActionType, AuditTargetType } from "@prisma/client";
import { safeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ siteId: string; userId: string }>;
};

const UpdateSiteMemberRoleSchema = z.object({
  role: z.enum(["admin", "viewer"]),
});

async function getMembership(siteId: string, userId: string) {
  return prisma.siteUser.findUnique({
    where: {
      site_id_user_id: {
        site_id: siteId,
        user_id: userId,
      },
    },
    select: {
      role: true,
    },
  });
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const currentUserId = await requireUserId(req);
    const { siteId, userId } = await ctx.params;

    const currentMembership = await getMembership(siteId, currentUserId);

    if (!currentMembership || currentMembership.role !== "owner") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = UpdateSiteMemberRoleSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const targetMembership = await prisma.siteUser.findUnique({
      where: {
        site_id_user_id: {
          site_id: siteId,
          user_id: userId,
        },
      },
      include: {
        user: {
          select: {
            user_id: true,
            full_name: true,
            username: true,
            email: true,
            status: true,
          },
        },
      },
    });

    if (!targetMembership) {
      return Response.json({ error: "Member not found" }, { status: 404 });
    }

    if (targetMembership.role === "owner") {
      return Response.json(
        { error: "Owner role cannot be changed here" },
        { status: 400 }
      );
    }

    const updatedMember = await prisma.siteUser.update({
      where: {
        site_id_user_id: {
          site_id: siteId,
          user_id: userId,
        },
      },
      data: {
        role: parsed.data.role,
      },
      include: {
        user: {
          select: {
            user_id: true,
            full_name: true,
            username: true,
            email: true,
            status: true,
          },
        },
      },
    });

    await safeAuditLog({
      user_id: currentUserId,
      action_type: AuditActionType.other,
      target_type: AuditTargetType.site,
      target_id: siteId,
      details: {
        kind: "site_member_role_updated",
        member_user_id: userId,
        new_role: parsed.data.role,
      },
    });

    return Response.json(
      { member: updatedMember, message: "Member role updated successfully" },
      { status: 200 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "unauthenticated") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Update site member role error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const currentUserId = await requireUserId(req);
    const { siteId, userId } = await ctx.params;

    const currentMembership = await getMembership(siteId, currentUserId);

    if (!currentMembership || currentMembership.role !== "owner") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const targetMembership = await prisma.siteUser.findUnique({
      where: {
        site_id_user_id: {
          site_id: siteId,
          user_id: userId,
        },
      },
      include: {
        user: {
          select: {
            user_id: true,
            full_name: true,
            username: true,
            email: true,
          },
        },
      },
    });

    if (!targetMembership) {
      return Response.json({ error: "Member not found" }, { status: 404 });
    }

    if (targetMembership.role === "owner") {
      return Response.json(
        { error: "Owner cannot be removed from this flow" },
        { status: 400 }
      );
    }

    await prisma.siteUser.delete({
      where: {
        site_id_user_id: {
          site_id: siteId,
          user_id: userId,
        },
      },
    });

    await safeAuditLog({
      user_id: currentUserId,
      action_type: AuditActionType.other,
      target_type: AuditTargetType.site,
      target_id: siteId,
      details: {
        kind: "site_member_removed",
        member_user_id: userId,
        member_email: targetMembership.user.email,
        member_username: targetMembership.user.username,
      },
    });

    return Response.json(
      { message: "Member removed successfully" },
      { status: 200 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "unauthenticated") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Remove site member error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}