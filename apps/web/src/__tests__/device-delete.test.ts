import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

import { DELETE as deviceDELETE } from "@/app/api/devices/[deviceId]/route";

function asNextRequest(r: Request): NextRequest {
  return r as unknown as NextRequest;
}

function makeReq(cookie?: string) {
  return new Request("http://localhost", {
    method: "DELETE",
    headers: {
      ...(cookie ? { cookie } : {}),
    },
  });
}

async function readJson<T>(res: Response): Promise<T> {
  const t = await res.text();
  return JSON.parse(t) as T;
}

describe("Device deletion", () => {
  const OWNER_ID = crypto.randomUUID();
  const VIEWER_ID = crypto.randomUUID();

  let siteId = "";
  let emptyDeviceId = "";
  let sensorDeviceId = "";
  let readingDeviceId = "";
  let eventDeviceId = "";

  let ownerUsername = "";
  let viewerUsername = "";
  let ownerEmail = "";
  let viewerEmail = "";

  beforeEach(async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    ownerUsername = `owner_delete_${suffix}`;
    viewerUsername = `viewer_delete_${suffix}`;
    ownerEmail = `owner_delete_${suffix}@example.com`;
    viewerEmail = `viewer_delete_${suffix}@example.com`;

    delete process.env.MOCK_USER_ID;

    await prisma.user.create({
      data: {
        user_id: OWNER_ID,
        full_name: "Owner Delete",
        username: ownerUsername,
        email: ownerEmail,
        phone: null,
        password_hash: "x",
        status: "active",
      },
    });

    await prisma.user.create({
      data: {
        user_id: VIEWER_ID,
        full_name: "Viewer Delete",
        username: viewerUsername,
        email: viewerEmail,
        phone: null,
        password_hash: "x",
        status: "active",
      },
    });

    const site = await prisma.site.create({
      data: {
        name: `Delete Test Site ${suffix}`,
        status: "active",
      },
      select: { site_id: true },
    });
    siteId = site.site_id;

    await prisma.siteUser.create({
      data: {
        site_id: siteId,
        user_id: OWNER_ID,
        role: "owner",
      },
    });

    await prisma.siteUser.create({
      data: {
        site_id: siteId,
        user_id: VIEWER_ID,
        role: "viewer",
      },
    });

    const emptyDevice = await prisma.device.create({
      data: {
        site_id: siteId,
        serial_number: `DELETE-EMPTY-${suffix}`,
        device_type: "esp32",
        secret_hash: null,
        status: "offline",
      },
      select: { device_id: true },
    });
    emptyDeviceId = emptyDevice.device_id;

    const sensorDevice = await prisma.device.create({
      data: {
        site_id: siteId,
        serial_number: `DELETE-SENSOR-${suffix}`,
        device_type: "esp32",
        secret_hash: null,
        status: "offline",
      },
      select: { device_id: true },
    });
    sensorDeviceId = sensorDevice.device_id;

    const readingDevice = await prisma.device.create({
      data: {
        site_id: siteId,
        serial_number: `DELETE-READING-${suffix}`,
        device_type: "esp32",
        secret_hash: null,
        status: "offline",
      },
      select: { device_id: true },
    });
    readingDeviceId = readingDevice.device_id;

    const eventDevice = await prisma.device.create({
      data: {
        site_id: siteId,
        serial_number: `DELETE-EVENT-${suffix}`,
        device_type: "esp32",
        secret_hash: null,
        status: "offline",
      },
      select: { device_id: true },
    });
    eventDeviceId = eventDevice.device_id;

    await prisma.sensor.create({
      data: {
        device_id: sensorDeviceId,
        external_key: "smoke-1",
        sensor_type: "smoke",
        location_label: "Hallway",
        is_enabled: true,
        status: "ok",
      },
    });

    const readingSensor = await prisma.sensor.create({
      data: {
        device_id: readingDeviceId,
        external_key: "gas-1",
        sensor_type: "gas",
        location_label: "Kitchen",
        is_enabled: true,
        status: "ok",
      },
      select: { sensor_id: true },
    });

    await prisma.sensorReading.create({
      data: {
        sensor_id: readingSensor.sensor_id,
        value: "120",
        unit: "ppm",
        quality_flag: "ok",
      },
    });

    await prisma.emergencyEvent.create({
      data: {
        site_id: siteId,
        device_id: eventDeviceId,
        event_type: "gas",
        severity: "high",
        status: "new",
        title: "Gas alert",
        description: "Seeded event",
        started_at: new Date(),
      },
    });
  });

  afterEach(async () => {
    delete process.env.MOCK_USER_ID;

    if (siteId) {
      await prisma.sensorReading.deleteMany({
        where: {
          sensor: {
            device: {
              site_id: siteId,
            },
          },
        },
      });

      await prisma.emergencyEvent.deleteMany({
        where: {
          site_id: siteId,
        },
      });

      await prisma.sensor.deleteMany({
        where: {
          device: {
            site_id: siteId,
          },
        },
      });

      await prisma.device.deleteMany({
        where: {
          site_id: siteId,
        },
      });

      await prisma.siteUser.deleteMany({
        where: {
          site_id: siteId,
        },
      });

      await prisma.site.deleteMany({
        where: {
          site_id: siteId,
        },
      });
    }

    await prisma.user.deleteMany({
      where: {
        user_id: {
          in: [OWNER_ID, VIEWER_ID],
        },
      },
    });

    siteId = "";
    emptyDeviceId = "";
    sensorDeviceId = "";
    readingDeviceId = "";
    eventDeviceId = "";
  });

  afterAll(async () => {
    delete process.env.MOCK_USER_ID;
    await prisma.$disconnect();
  });

  test("owner can delete device with no related sensors, readings, or alerts", async () => {
    process.env.MOCK_USER_ID = OWNER_ID;

    const req = makeReq();
    const res = await deviceDELETE(asNextRequest(req), {
      params: Promise.resolve({ deviceId: emptyDeviceId }),
    });

    expect(res.status).toBe(200);

    const body = await readJson<{ success: boolean }>(res);
    expect(body.success).toBe(true);

    const dbDevice = await prisma.device.findUnique({
      where: { device_id: emptyDeviceId },
    });

    expect(dbDevice).toBeNull();
  });

  test("viewer cannot delete device", async () => {
    process.env.MOCK_USER_ID = VIEWER_ID;

    const req = makeReq();
    const res = await deviceDELETE(asNextRequest(req), {
      params: Promise.resolve({ deviceId: emptyDeviceId }),
    });

    expect(res.status).toBe(403);

    const dbDevice = await prisma.device.findUnique({
      where: { device_id: emptyDeviceId },
    });

    expect(dbDevice).not.toBeNull();
  });

  test("owner cannot delete device when it has sensors", async () => {
    process.env.MOCK_USER_ID = OWNER_ID;

    const req = makeReq();
    const res = await deviceDELETE(asNextRequest(req), {
      params: Promise.resolve({ deviceId: sensorDeviceId }),
    });

    expect(res.status).toBe(409);

    const body = await readJson<{ error: string }>(res);
    expect(body.error).toContain("cannot be deleted");
  });

  test("owner cannot delete device when it has readings", async () => {
    process.env.MOCK_USER_ID = OWNER_ID;

    const req = makeReq();
    const res = await deviceDELETE(asNextRequest(req), {
      params: Promise.resolve({ deviceId: readingDeviceId }),
    });

    expect(res.status).toBe(409);

    const body = await readJson<{ error: string }>(res);
    expect(body.error).toContain("cannot be deleted");
  });

  test("owner cannot delete device when it has alerts", async () => {
    process.env.MOCK_USER_ID = OWNER_ID;

    const req = makeReq();
    const res = await deviceDELETE(asNextRequest(req), {
      params: Promise.resolve({ deviceId: eventDeviceId }),
    });

    expect(res.status).toBe(409);

    const body = await readJson<{ error: string }>(res);
    expect(body.error).toContain("cannot be deleted");
  });
});