import { z } from "zod";
import type { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireDevice } from "@/lib/device-auth";

export const runtime = "nodejs";

const SensorTypeSchema = z.enum([
  "gas",
  "smoke",
  "flame",
  "motion",
  "door",
]);

const SyncSensorsSchema = z.object({
  sensors: z
    .array(
      z.object({
        external_key: z.string().min(1).max(100),
        sensor_type: SensorTypeSchema,
        location_label: z.string().min(1).max(120).optional().nullable(),
      })
    )
    .min(1),
});

export async function POST(req: NextRequest) {
  try {
    const deviceAuth = await requireDevice(req);
    const deviceId = deviceAuth.device_id;

    const body = await req.json();
    const parsed = SyncSensorsSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const syncedSensors = [];

    for (const input of parsed.data.sensors) {
      const existing = await prisma.sensor.findUnique({
        where: {
          device_id_external_key: {
            device_id: deviceId,
            external_key: input.external_key,
          },
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

      if (existing) {
        syncedSensors.push(existing);
        continue;
      }

      const created = await prisma.sensor.create({
        data: {
          device_id: deviceId,
          external_key: input.external_key,
          sensor_type: input.sensor_type,
          location_label: input.location_label ?? null,
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

      syncedSensors.push(created);
    }

    return Response.json({ sensors: syncedSensors }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";

    if (msg === "device_unauthenticated") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Sync sensors error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}