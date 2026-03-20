import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { POST as readingsPOST } from "@/app/api/readings/route";

function asNextRequest(r: Request): NextRequest {
  return r as unknown as NextRequest;
}

function makeReq(body: unknown, token?: string) {
  return new Request("http://localhost", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function readJson<T>(res: Response): Promise<T> {
  const t = await res.text();
  return JSON.parse(t) as T;
}

describe("Sensor reading ingestion (Task #11)", () => {
  const DEVICE_ID = "00000000-0000-0000-0000-000000000010";
  const SITE_ID = "00000000-0000-0000-0000-000000000020";

  let sensorId = "";

  beforeAll(async () => {
    // Clean slate (child -> parent)
    await prisma.alertNotification.deleteMany({
      where: {
        event: {
          OR: [{ site_id: SITE_ID }, { device_id: DEVICE_ID }],
        },
      },
    });

    await prisma.sensorReading.deleteMany({
      where: {
        OR: [
          { sensor: { device_id: DEVICE_ID } },
          { event: { site_id: SITE_ID } },
        ],
      },
    });

    await prisma.emergencyEvent.deleteMany({
      where: {
        OR: [{ site_id: SITE_ID }, { device_id: DEVICE_ID }],
      },
    });

    await prisma.sensor.deleteMany({ where: { device_id: DEVICE_ID } });
    await prisma.device.deleteMany({ where: { device_id: DEVICE_ID } });
    await prisma.site.deleteMany({ where: { site_id: SITE_ID } });

    // Create parent records
    await prisma.site.create({
      data: { site_id: SITE_ID, name: "Readings Site", status: "active" },
      select: { site_id: true },
    });

    await prisma.device.create({
      data: {
        device_id: DEVICE_ID,
        site_id: SITE_ID,
        serial_number: `SN-READ-${Date.now()}`,
        device_type: "esp32",
        secret_hash: "x",
        status: "offline",
      },
      select: { device_id: true },
    });

    const sensor = await prisma.sensor.create({
      data: {
        device_id: DEVICE_ID,
        sensor_type: "temp",
        is_enabled: true,
        status: "ok",
      },
      select: { sensor_id: true },
    });

    sensorId = sensor.sensor_id;
  });

  afterAll(async () => {
    await prisma.alertNotification.deleteMany({
      where: {
        event: {
          OR: [{ site_id: SITE_ID }, { device_id: DEVICE_ID }],
        },
      },
    });

    await prisma.sensorReading.deleteMany({
      where: {
        OR: [
          ...(sensorId ? [{ sensor_id: sensorId }] : []),
          { event: { site_id: SITE_ID } },
        ],
      },
    });

    await prisma.emergencyEvent.deleteMany({
      where: {
        OR: [
          ...(sensorId ? [{ sensor_id: sensorId }] : []),
          { device_id: DEVICE_ID },
          { site_id: SITE_ID },
        ],
      },
    });

    if (sensorId) {
      await prisma.sensor.deleteMany({ where: { sensor_id: sensorId } });
    }

    await prisma.device.deleteMany({ where: { device_id: DEVICE_ID } });
    await prisma.site.deleteMany({ where: { site_id: SITE_ID } });
  });

  test("stores SensorReading and sets received_at automatically", async () => {
    const res = await readingsPOST(
      asNextRequest(
        makeReq(
          { sensor_id: sensorId, value: 23.5, unit: "C" },
          "device:ok"
        )
      )
    );

    expect(res.status).toBe(201);

    const body = await readJson<{
      reading: { reading_id: string; received_at: string; quality_flag: string };
    }>(res);

    expect(body.reading.reading_id).toBeTruthy();
    expect(body.reading.received_at).toBeTruthy();
    expect(body.reading.quality_flag).toBe("ok");

    const db = await prisma.sensorReading.findUnique({
      where: { reading_id: body.reading.reading_id },
      select: { received_at: true },
    });

    expect(db?.received_at).toBeTruthy();
  });

  test("quality_flag can be set to suspect", async () => {
    const res = await readingsPOST(
      asNextRequest(
        makeReq(
          { sensor_id: sensorId, value: "999", quality_flag: "suspect" },
          "device:ok"
        )
      )
    );

    expect(res.status).toBe(201);
    const body = await readJson<{ reading: { quality_flag: string } }>(res);
    expect(body.reading.quality_flag).toBe("suspect");
  });

  test("rejects requests without device token", async () => {
    const res = await readingsPOST(
      asNextRequest(makeReq({ sensor_id: sensorId, value: 1 }))
    );
    expect(res.status).toBe(401);
  });
});