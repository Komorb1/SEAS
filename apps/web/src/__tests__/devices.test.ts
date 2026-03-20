import { prisma } from "@/lib/prisma";

import {
  POST as devicesPOST,
  GET as devicesGET,
} from "@/app/api/sites/[siteId]/devices/route";
import { PATCH as deviceStatusPATCH } from "@/app/api/devices/[deviceId]/status/route";

type RegisterDeviceResponse = {
  device: {
    device_id: string;
    serial_number: string;
    status: string;
  };
  device_secret: string;
};

type ListDevicesResponse = {
  devices: Array<{
    device_id: string;
    serial_number: string;
    status: string;
  }>;
};

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
  const text = await res.text();
  return JSON.parse(text) as T;
}

function makeSerial(prefix = "SN-TEST") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

describe("Devices management (Task #8)", () => {
  const MOCK_USER_ID = "00000000-0000-0000-0000-000000000002";
  const cookie = "auth_token=user:0002";
  const TEST_SITE_NAME = "Device Test Site";
  const TEST_USERNAME = "mock_user_devices";
  const TEST_EMAIL = "mock_user_devices@example.com";

  let siteId = "";

  async function ensureOwnerMembership() {
    if (!siteId) {
      throw new Error("siteId was not initialized before ensureOwnerMembership()");
    }

    await prisma.siteUser.upsert({
      where: {
        site_id_user_id: {
          site_id: siteId,
          user_id: MOCK_USER_ID,
        },
      },
      update: { role: "owner" },
      create: {
        site_id: siteId,
        user_id: MOCK_USER_ID,
        role: "owner",
      },
    });
  }

  async function registerTestDevice(customSerial?: string) {
    const serialNumber = customSerial ?? makeSerial();

    const req = makeReq(
      "POST",
      { serial_number: serialNumber, device_type: "esp32" },
      cookie
    );

    const res = await devicesPOST(req as never, {
      params: Promise.resolve({ siteId }),
    });

    const body = await readJson<RegisterDeviceResponse>(res);

    return {
      res,
      body,
      serialNumber,
    };
  }

  async function cleanupDeviceTestData() {
    await prisma.alertNotification.deleteMany({
      where: {
        event: {
          site: {
            name: TEST_SITE_NAME,
          },
        },
      },
    });

    await prisma.sensorReading.deleteMany({
      where: {
        OR: [
          {
            sensor: {
              device: {
                site: {
                  name: TEST_SITE_NAME,
                },
              },
            },
          },
          {
            event: {
              site: {
                name: TEST_SITE_NAME,
              },
            },
          },
        ],
      },
    });

    await prisma.emergencyEvent.deleteMany({
      where: {
        site: {
          name: TEST_SITE_NAME,
        },
      },
    });

    await prisma.sensor.deleteMany({
      where: {
        device: {
          site: {
            name: TEST_SITE_NAME,
          },
        },
      },
    });

    await prisma.device.deleteMany({
      where: {
        site: {
          name: TEST_SITE_NAME,
        },
      },
    });

    await prisma.siteUser.deleteMany({
      where: {
        OR: [
          {
            site: {
              name: TEST_SITE_NAME,
            },
          },
          {
            user_id: MOCK_USER_ID,
          },
        ],
      },
    });

    await prisma.site.deleteMany({
      where: {
        name: TEST_SITE_NAME,
      },
    });

    await prisma.user.deleteMany({
      where: {
        OR: [
          { user_id: MOCK_USER_ID },
          { username: TEST_USERNAME },
          { email: TEST_EMAIL },
        ],
      },
    });
  }

  beforeAll(async () => {
    await cleanupDeviceTestData();

    await prisma.user.upsert({
      where: { user_id: MOCK_USER_ID },
      update: {
        full_name: "Mock User",
        username: TEST_USERNAME,
        email: TEST_EMAIL,
        phone: null,
        password_hash: "x",
        status: "active",
      },
      create: {
        user_id: MOCK_USER_ID,
        full_name: "Mock User",
        username: TEST_USERNAME,
        email: TEST_EMAIL,
        phone: null,
        password_hash: "x",
        status: "active",
      },
    });

    const site = await prisma.site.create({
      data: { name: TEST_SITE_NAME, status: "active" },
      select: { site_id: true },
    });

    siteId = site.site_id;

    await ensureOwnerMembership();
  });

  beforeEach(async () => {
    await ensureOwnerMembership();
  });

  afterEach(async () => {
    await ensureOwnerMembership();
  });

  afterAll(async () => {
    await cleanupDeviceTestData();
  });

  test("register device under site (owner) returns secret once", async () => {
    const { res, body, serialNumber } = await registerTestDevice();

    expect(res.status).toBe(201);
    expect(body.device.serial_number).toBe(serialNumber);
    expect(typeof body.device_secret).toBe("string");
    expect(body.device_secret.length).toBeGreaterThan(20);

    const dbDevice = await prisma.device.findUnique({
      where: { device_id: body.device.device_id },
      select: { secret_hash: true },
    });

    expect(dbDevice?.secret_hash).toBeTruthy();
    expect(dbDevice?.secret_hash).not.toBe(body.device_secret);
  });

  test("unique serial_number enforced (409)", async () => {
    const serialNumber = makeSerial("SN-UNIQUE");

    const first = await devicesPOST(
      makeReq(
        "POST",
        { serial_number: serialNumber, device_type: "esp32" },
        cookie
      ) as never,
      {
        params: Promise.resolve({ siteId }),
      }
    );

    expect(first.status).toBe(201);

    const second = await devicesPOST(
      makeReq(
        "POST",
        { serial_number: serialNumber, device_type: "esp32" },
        cookie
      ) as never,
      {
        params: Promise.resolve({ siteId }),
      }
    );

    expect(second.status).toBe(409);
  });

  test("list devices per site (member can list)", async () => {
    const { body: created } = await registerTestDevice();

    const req = makeReq("GET", undefined, cookie);
    const res = await devicesGET(req as never, {
      params: Promise.resolve({ siteId }),
    });

    expect(res.status).toBe(200);

    const body = await readJson<ListDevicesResponse>(res);
    expect(Array.isArray(body.devices)).toBe(true);
    expect(
      body.devices.some((d) => d.device_id === created.device.device_id)
    ).toBe(true);
  });

  test("update device status (owner/admin only)", async () => {
    const { body: created } = await registerTestDevice();
    const deviceId = created.device.device_id;

    const req = makeReq("PATCH", { status: "maintenance" }, cookie);

    const res = await deviceStatusPATCH(req as never, {
      params: Promise.resolve({ deviceId }),
    });

    expect(res.status).toBe(200);

    const updated = await prisma.device.findUnique({
      where: { device_id: deviceId },
      select: { status: true },
    });

    expect(updated?.status).toBe("maintenance");
  });

  test("viewer cannot modify device", async () => {
    const { body: created } = await registerTestDevice();
    const deviceId = created.device.device_id;

    await prisma.siteUser.upsert({
      where: {
        site_id_user_id: {
          site_id: siteId,
          user_id: MOCK_USER_ID,
        },
      },
      update: { role: "viewer" },
      create: {
        site_id: siteId,
        user_id: MOCK_USER_ID,
        role: "viewer",
      },
    });

    const req = makeReq("PATCH", { status: "online" }, cookie);

    const res = await deviceStatusPATCH(req as never, {
      params: Promise.resolve({ deviceId }),
    });

    expect(res.status).toBe(403);
  });
});