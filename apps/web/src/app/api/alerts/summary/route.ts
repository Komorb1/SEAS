import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-request";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);

    const latest = await prisma.emergencyEvent.findFirst({
      where: {
        site: {
          site_users: {
            some: {
              user_id: userId,
            },
          },
        },
      },
      orderBy: {
        started_at: "desc",
      },
      select: {
        event_id: true,
        status: true,
        started_at: true,
      },
    });

    const openCount = await prisma.emergencyEvent.count({
      where: {
        status: {
          in: ["new", "acknowledged"],
        },
        site: {
          site_users: {
            some: {
              user_id: userId,
            },
          },
        },
      },
    });

    return Response.json({
      latestEventId: latest?.event_id ?? null,
      latestStatus: latest?.status ?? null,
      latestStartedAt: latest?.started_at?.toISOString() ?? null,
      openCount,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "unauthenticated") {
      return Response.json({ error: "Unauthenticated" }, { status: 401 });
    }

    console.error("Alerts summary lookup failed:", error);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}