import { z } from "zod";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-request";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ deviceId: string }>;
};

const SensorTypeSchema = z.enum(["gas", "smoke", "flame", "motion", "door"]);

const CreateSensorSchema = z.object({
  sensor_type: SensorTypeSchema,
  location_label: z.string().min(1).max(120).optional(),
  external_key: z.string().min(1).max(100),
});

function isOwnerOrAdmin(role: string): boolean {
  return role === "owner" || role === "admin";
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const userId = await requireUserId(req);
    const { deviceId } = await ctx.params;

    const body = await req.json();
    const parsed = CreateSensorSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const device = await prisma.device.findUnique({
      where: { device_id: deviceId },
      select: { site_id: true },
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

    const sensor = await prisma.sensor.create({
      data: {
          device_id: deviceId,
          external_key: parsed.data.external_key,
          sensor_type: parsed.data.sensor_type,
          location_label: parsed.data.location_label ?? null,
          is_enabled: true,
          status: "ok",
        },
        select: {
          sensor_id: true,
          device_id: true,
          external_key: true,
          sensor_type: true,
          location_label: true,
          is_enabled: true,
          status: true,
          installed_at: true,
        },
      });

    return Response.json({ sensor }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "unauthenticated") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (typeof err === "object" && err !== null && "code" in err) {
      const code = (err as { code?: string }).code;
      if (code === "P2002") {
        return Response.json(
          { error: "external_key already exists for this device" },
          { status: 409 }
        );
      }
    }

    console.error("Create sensor error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const userId = await requireUserId(req);
    const { deviceId } = await ctx.params;

    const device = await prisma.device.findUnique({
      where: { device_id: deviceId },
      select: { site_id: true },
    });

    if (!device) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    // Any site member can list sensors
    const membership = await prisma.siteUser.findUnique({
      where: { site_id_user_id: { site_id: device.site_id, user_id: userId } },
      select: { role: true },
    });

    if (!membership) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const sensors = await prisma.sensor.findMany({
      where: { device_id: deviceId },
      select: {
        sensor_id: true,
        device_id: true,
        external_key: true,
        sensor_type: true,
        location_label: true,
        is_enabled: true,
        status: true,
        installed_at: true,
      },
      orderBy: { sensor_id: "desc" },
    });

    return Response.json({ sensors }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "unauthenticated") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("List sensors error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}