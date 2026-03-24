import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireCurrentUserId } from "@/lib/auth";

type AlertAction = "acknowledge" | "resolve";

type RouteContext = {
  params: Promise<{
    alertId: string;
  }>;
};

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const userId = await requireCurrentUserId();
    const { alertId } = await params;

    const body = (await req.json()) as { action?: AlertAction };
    const action = body.action;

    if (action !== "acknowledge" && action !== "resolve") {
      return Response.json({ error: "Invalid action" }, { status: 400 });
    }

    const existingAlert = await prisma.emergencyEvent.findFirst({
      where: {
        event_id: alertId,
        site: {
          site_users: {
            some: {
              user_id: userId,
            },
          },
        },
      },
      select: {
        event_id: true,
        status: true,
        acknowledged_at: true,
        resolved_at: true,
      },
    });

    if (!existingAlert) {
      return Response.json({ error: "Alert not found" }, { status: 404 });
    }

    if (action === "acknowledge") {
      if (existingAlert.status !== "new") {
        return Response.json(
          { error: "Only new alerts can be acknowledged" },
          { status: 409 }
        );
      }

      const now = new Date();

      const updated = await prisma.$transaction(async (tx) => {
        const alert = await tx.emergencyEvent.update({
          where: {
            event_id: existingAlert.event_id,
          },
          data: {
            status: "acknowledged",
            acknowledged_at: existingAlert.acknowledged_at ?? now,
          },
          select: {
            event_id: true,
            status: true,
            acknowledged_at: true,
            resolved_at: true,
          },
        });

        await tx.auditLog.create({
          data: {
            user_id: userId,
            event_id: existingAlert.event_id,
            action_type: "ack",
            target_type: "event",
            target_id: existingAlert.event_id,
            details: {
              previous_status: existingAlert.status,
              next_status: alert.status,
              acknowledged_at: alert.acknowledged_at?.toISOString() ?? null,
            },
          },
        });

        return alert;
      });

      revalidatePath("/alerts");
      revalidatePath(`/alerts/${alertId}`);

      return Response.json({ ok: true, alert: updated });
    }

    if (existingAlert.status === "resolved") {
      return Response.json(
        { error: "Alert is already resolved" },
        { status: 409 }
      );
    }

    if (existingAlert.status === "false_alarm") {
      return Response.json(
        { error: "False alarm alerts cannot be resolved from this action" },
        { status: 409 }
      );
    }

    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const alert = await tx.emergencyEvent.update({
        where: {
          event_id: existingAlert.event_id,
        },
        data: {
          status: "resolved",
          acknowledged_at: existingAlert.acknowledged_at ?? now,
          resolved_at: now,
        },
        select: {
          event_id: true,
          status: true,
          acknowledged_at: true,
          resolved_at: true,
        },
      });

      await tx.auditLog.create({
        data: {
          user_id: userId,
          event_id: existingAlert.event_id,
          action_type: "resolve",
          target_type: "event",
          target_id: existingAlert.event_id,
          details: {
            previous_status: existingAlert.status,
            next_status: alert.status,
            acknowledged_at: alert.acknowledged_at?.toISOString() ?? null,
            resolved_at: alert.resolved_at?.toISOString() ?? null,
          },
        },
      });

      return alert;
    });

    revalidatePath("/alerts");
    revalidatePath(`/alerts/${alertId}`);

    return Response.json({ ok: true, alert: updated });
  } catch (error) {
    console.error("PATCH /api/alerts/[alertId]/status failed", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}