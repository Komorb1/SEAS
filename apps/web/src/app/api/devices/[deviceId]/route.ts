import { prisma } from "@/lib/prisma";
import { requireCurrentUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ deviceId: string }> }
) {
  try {
    const userId = await requireCurrentUserId();
    const { deviceId } = await context.params;

    const device = await prisma.device.findFirst({
      where: {
        device_id: deviceId,
      },
      select: {
        device_id: true,
        site_id: true,
        site: {
          select: {
            site_users: {
              where: {
                user_id: userId,
              },
              select: {
                role: true,
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!device) {
      return Response.json({ error: "Device not found" }, { status: 404 });
    }

    const role = device.site.site_users[0]?.role;
    const canDelete = role === "owner" || role === "admin";

    if (!canDelete) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const [sensorCount, readingCount, eventCount] = await Promise.all([
      prisma.sensor.count({
        where: { device_id: deviceId },
      }),
      prisma.sensorReading.count({
        where: { sensor: { device_id: deviceId } },
      }),
      prisma.emergencyEvent.count({
        where: { device_id: deviceId },
      }),
    ]);

    if (sensorCount > 0 || readingCount > 0 || eventCount > 0) {
      return Response.json(
        {
          error:
            "This device cannot be deleted because it has related sensors, readings, or alerts.",
        },
        { status: 409 }
      );
    }

    await prisma.device.delete({
      where: {
        device_id: deviceId,
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Delete device failed:", error);
    return Response.json({ error: "Failed to delete device" }, { status: 500 });
  }
}