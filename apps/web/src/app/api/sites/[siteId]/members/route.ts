import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-request";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { AuditActionType, AuditTargetType } from "@prisma/client";
import { safeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ siteId: string }>;
};

const AddSiteMemberSchema = z.object({
  user_identifier: z.string().trim().min(1, "User is required"),
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

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const userId = await requireUserId(req);
    const { siteId } = await ctx.params;

    const membership = await getMembership(siteId, userId);

    if (!membership) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const members = await prisma.siteUser.findMany({
      where: {
        site_id: siteId,
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
      orderBy: {
        created_at: "asc",
      },
    });

    return Response.json({ members }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "unauthenticated") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Get site members error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const currentUserId = await requireUserId(req);
    const { siteId } = await ctx.params;

    const membership = await getMembership(siteId, currentUserId);

    if (!membership || membership.role !== "owner") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = AddSiteMemberSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { user_identifier, role } = parsed.data;

    const targetUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: user_identifier },
          { username: user_identifier },
        ],
      },
      select: {
        user_id: true,
        full_name: true,
        username: true,
        email: true,
        status: true,
      },
    });

    if (!targetUser) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const existingMember = await prisma.siteUser.findUnique({
      where: {
        site_id_user_id: {
          site_id: siteId,
          user_id: targetUser.user_id,
        },
      },
      select: {
        user_id: true,
      },
    });

    if (existingMember) {
      return Response.json(
        { error: "User is already a member of this site" },
        { status: 409 }
      );
    }

    const member = await prisma.siteUser.create({
      data: {
        site_id: siteId,
        user_id: targetUser.user_id,
        role,
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
        kind: "site_member_added",
        member_user_id: targetUser.user_id,
        member_email: targetUser.email,
        member_username: targetUser.username,
        assigned_role: role,
      },
    });

    return Response.json(
      { member, message: "Member added successfully" },
      { status: 201 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "unauthenticated") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Add site member error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}