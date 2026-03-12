import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

import { POST as sensorsPOST, GET as sensorsGET } from "@/app/api/devices/[deviceId]/sensors/route";
import { PATCH as sensorPATCH } from "@/app/api/sensors/[sensorId]/route";

type CreateSensorResponse = {
  sensor: {
    sensor_id: string;
    device_id: string;
    sensor_type: string;
    is_enabled: boolean;
    status: string;
  };
};

type ListSensorsResponse = {
  sensors: Array<{
    sensor_id: string;
    device_id: string;
    sensor_type: string;
    is_enabled: boolean;
    status: string;
  }>;
};

function asNextRequest(r: Request): NextRequest {
  return r as unknown as NextRequest;
}

function makeReq(method: string, body?: unknown, cookie?: string) {
  return new Request("http://localhost", {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function readJson<T>(res: Response): Promise<T> {
  const t = await res.text();
  return JSON.parse(t) as T;
}

describe("Sensors management (Task #9)", () => {
  const OWNER_ID = crypto.randomUUID();
  const VIEWER_ID = crypto.randomUUID();

  let siteId = "";
  let deviceId = "";
  let sensorId = "";

  let ownerUsername = "";
  let viewerUsername = "";
  let ownerEmail = "";
  let viewerEmail = "";

  beforeEach(async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    ownerUsername = `owner_sensors_${suffix}`;
    viewerUsername = `viewer_sensors_${suffix}`;
    ownerEmail = `owner_sensors_${suffix}@example.com`;
    viewerEmail = `viewer_sensors_${suffix}@example.com`;

    delete process.env.MOCK_USER_ID;

    // Create users first
    await prisma.user.create({
      data: {
        user_id: OWNER_ID,
        full_name: "Owner User",
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
        full_name: "Viewer User",
        username: viewerUsername,
        email: viewerEmail,
        phone: null,
        password_hash: "x",
        status: "active",
      },
    });

    // Create site
    const site = await prisma.site.create({
      data: {
        name: `Sensors Test Site ${suffix}`,
        status: "active",
      },
      select: { site_id: true },
    });
    siteId = site.site_id;

    // Create memberships
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

    // Create device
    const device = await prisma.device.create({
      data: {
        site_id: siteId,
        serial_number: `SN-SENS-${suffix}`,
        device_type: "esp32",
        secret_hash: "x",
        status: "offline",
      },
      select: { device_id: true },
    });
    deviceId = device.device_id;

    // Seed one sensor so read/update tests do not depend on another test
    const sensor = await prisma.sensor.create({
      data: {
        device_id: deviceId,
        sensor_type: "smoke",
        location_label: "Kitchen ceiling",
        is_enabled: true,
        status: "ok",
      },
      select: { sensor_id: true },
    });
    sensorId = sensor.sensor_id;
  });

  afterEach(async () => {
    delete process.env.MOCK_USER_ID;

    if (deviceId) {
      await prisma.sensor.deleteMany({
        where: { device_id: deviceId },
      });
    }

    if (deviceId) {
      await prisma.device.deleteMany({
        where: { device_id: deviceId },
      });
    }

    if (siteId) {
      await prisma.siteUser.deleteMany({
        where: { site_id: siteId },
      });

      await prisma.site.deleteMany({
        where: { site_id: siteId },
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
    deviceId = "";
    sensorId = "";
  });

  afterAll(async () => {
    delete process.env.MOCK_USER_ID;
    await prisma.$disconnect();
  });

  test("owner can add sensor to device", async () => {
    process.env.MOCK_USER_ID = OWNER_ID;

    const req = makeReq("POST", {
      sensor_type: "gas",
      location_label: "Living room",
    });

    const res = await sensorsPOST(asNextRequest(req), {
      params: Promise.resolve({ deviceId }),
    });

    expect(res.status).toBe(201);

    const body = await readJson<CreateSensorResponse>(res);
    expect(body.sensor.sensor_id).toMatch(
      /^[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}$/i,
    );
    expect(body.sensor.device_id).toBe(deviceId);
    expect(body.sensor.sensor_type).toBe("gas");
    expect(body.sensor.is_enabled).toBe(true);
  });

  test("list sensors per device (viewer can read)", async () => {
    process.env.MOCK_USER_ID = VIEWER_ID;

    const req = makeReq("GET");
    const res = await sensorsGET(asNextRequest(req), {
      params: Promise.resolve({ deviceId }),
    });

    expect(res.status).toBe(200);

    const body = await readJson<ListSensorsResponse>(res);
    expect(body.sensors.some((s) => s.sensor_id === sensorId)).toBe(true);
  });

  test("owner can disable sensor", async () => {
    process.env.MOCK_USER_ID = OWNER_ID;

    const req = makeReq("PATCH", { is_enabled: false });
    const res = await sensorPATCH(asNextRequest(req), {
      params: Promise.resolve({ sensorId }),
    });

    expect(res.status).toBe(200);

    const updated = await prisma.sensor.findUnique({
      where: { sensor_id: sensorId },
      select: { is_enabled: true },
    });

    expect(updated?.is_enabled).toBe(false);
  });

  test("owner can update sensor status", async () => {
    process.env.MOCK_USER_ID = OWNER_ID;

    const req = makeReq("PATCH", { status: "faulty" });
    const res = await sensorPATCH(asNextRequest(req), {
      params: Promise.resolve({ sensorId }),
    });

    expect(res.status).toBe(200);

    const updated = await prisma.sensor.findUnique({
      where: { sensor_id: sensorId },
      select: { status: true },
    });

    expect(updated?.status).toBe("faulty");
  });

  test("viewer cannot modify sensor", async () => {
    process.env.MOCK_USER_ID = VIEWER_ID;

    const req = makeReq("PATCH", { status: "ok" });
    const res = await sensorPATCH(asNextRequest(req), {
      params: Promise.resolve({ sensorId }),
    });

    expect(res.status).toBe(403);
  });
});