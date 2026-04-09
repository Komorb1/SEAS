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

    await prisma.device.update({
      where: { device_id: deviceId },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        status: "offline",
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Delete device failed:", error);
    return Response.json({ error: "Failed to delete device" }, { status: 500 });
  }
}