import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-request";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);

    const latestCriticalAlert = await prisma.emergencyEvent.findFirst({
      where: {
        severity: "critical",
        status: { in: ["new", "acknowledged"] },
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
        event_type: true,
        severity: true,
        started_at: true,
        status: true,
        site: {
          select: {
            name: true,
          },
        },
        device: {
          select: {
            serial_number: true,
          },
        },
      },
    });

    return Response.json({ alert: latestCriticalAlert }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "unauthenticated") {
      return Response.json({ error: "Unauthenticated" }, { status: 401 });
    }

    console.error("Latest critical alert lookup failed:", error);
    return Response.json({ alert: null }, { status: 500 });
  }
}