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
    location_label: string | null;
  };
  device_secret: string;
};

type ListDevicesResponse = {
  devices: Array<{
    device_id: string;
    serial_number: string;
    status: string;
    location_label: string | null;
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

describe("Devices management (Task #8 / Task #34)", () => {
  const OWNER_USER_ID = "00000000-0000-0000-0000-000000000002";
  const ADMIN_USER_ID = "00000000-0000-0000-0000-000000000003";
  const VIEWER_USER_ID = "00000000-0000-0000-0000-000000000004";

  const cookie = "auth_token=user:test";
  const TEST_SITE_NAME = "Device Test Site";

  const OWNER_USERNAME = "mock_user_devices";
  const OWNER_EMAIL = "mock_user_devices@example.com";
  const ADMIN_USERNAME = "mock_admin_devices";
  const ADMIN_EMAIL = "mock_admin_devices@example.com";
  const VIEWER_USERNAME = "mock_viewer_devices";
  const VIEWER_EMAIL = "mock_viewer_devices@example.com";

  let siteId = "";

  async function setMockUser(userId: string) {
    process.env.MOCK_USER_ID = userId;
  }

  async function setSiteRole(
    userId: string,
    role: "owner" | "admin" | "viewer"
  ) {
    if (!siteId) {
      throw new Error("siteId was not initialized before setSiteRole()");
    }

    await prisma.siteUser.upsert({
      where: {
        site_id_user_id: {
          site_id: siteId,
          user_id: userId,
        },
      },
      update: { role },
      create: {
        site_id: siteId,
        user_id: userId,
        role,
      },
    });
  }

  async function ensureOwnerMembership() {
    await setSiteRole(OWNER_USER_ID, "owner");
  }

  async function registerTestDevice(
    customSerial?: string,
    customLocationLabel?: string | null
    ) {
    const serialNumber = customSerial ?? makeSerial();

    const req = makeReq(
      "POST",
      {
        serial_number: serialNumber,
        device_type: "esp32",
        location_label: customLocationLabel ?? null,
      },
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
            user_id: {
              in: [OWNER_USER_ID, ADMIN_USER_ID, VIEWER_USER_ID],
            },
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
          { user_id: OWNER_USER_ID },
          { user_id: ADMIN_USER_ID },
          { user_id: VIEWER_USER_ID },
          { username: OWNER_USERNAME },
          { username: ADMIN_USERNAME },
          { username: VIEWER_USERNAME },
          { email: OWNER_EMAIL },
          { email: ADMIN_EMAIL },
          { email: VIEWER_EMAIL },
        ],
      },
    });
  }

  beforeAll(async () => {
    await cleanupDeviceTestData();

    await prisma.user.create({
      data: {
        user_id: OWNER_USER_ID,
        full_name: "Mock Owner",
        username: OWNER_USERNAME,
        email: OWNER_EMAIL,
        phone: null,
        password_hash: "x",
        status: "active",
      },
    });

    await prisma.user.create({
      data: {
        user_id: ADMIN_USER_ID,
        full_name: "Mock Admin",
        username: ADMIN_USERNAME,
        email: ADMIN_EMAIL,
        phone: null,
        password_hash: "x",
        status: "active",
      },
    });

    await prisma.user.create({
      data: {
        user_id: VIEWER_USER_ID,
        full_name: "Mock Viewer",
        username: VIEWER_USERNAME,
        email: VIEWER_EMAIL,
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
    await setMockUser(OWNER_USER_ID);
  });

  beforeEach(async () => {
    await ensureOwnerMembership();
    await setMockUser(OWNER_USER_ID);
  });

  afterEach(async () => {
    await ensureOwnerMembership();
    await setMockUser(OWNER_USER_ID);
  });

  afterAll(async () => {
    delete process.env.MOCK_USER_ID;
    await cleanupDeviceTestData();
  });

  test("register device under site (owner) returns secret once and stores location", async () => {
    await setMockUser(OWNER_USER_ID);

    const locationLabel = "Main entrance";
    const { res, body, serialNumber } = await registerTestDevice(
      undefined,
      locationLabel
    );

    expect(res.status).toBe(201);
    expect(body.device.serial_number).toBe(serialNumber);
    expect(body.device.location_label).toBe(locationLabel);
    expect(typeof body.device_secret).toBe("string");
    expect(body.device_secret.length).toBeGreaterThan(20);

    const dbDevice = await prisma.device.findUnique({
      where: { device_id: body.device.device_id },
      select: { secret_hash: true, location_label: true },
    });

    expect(dbDevice?.secret_hash).toBeTruthy();
    expect(dbDevice?.secret_hash).not.toBe(body.device_secret);
    expect(dbDevice?.location_label).toBe(locationLabel);
  });

  test("admin can register device under site", async () => {
    await setSiteRole(ADMIN_USER_ID, "admin");
    await setMockUser(ADMIN_USER_ID);

    const serialNumber = makeSerial("SN-ADMIN");

    const req = makeReq(
      "POST",
      {
        serial_number: serialNumber,
        device_type: "esp32",
        location_label: "Server room",
      },
      cookie
    );

    const res = await devicesPOST(req as never, {
      params: Promise.resolve({ siteId }),
    });

    expect(res.status).toBe(201);

    const body = await readJson<RegisterDeviceResponse>(res);
    expect(body.device.serial_number).toBe(serialNumber);
    expect(body.device.location_label).toBe("Server room");
    expect(typeof body.device_secret).toBe("string");
  });

  test("viewer cannot register device under site", async () => {
    await setSiteRole(VIEWER_USER_ID, "viewer");
    await setMockUser(VIEWER_USER_ID);

    const req = makeReq(
      "POST",
      { serial_number: makeSerial("SN-VIEWER"), device_type: "esp32" },
      cookie
    );

    const res = await devicesPOST(req as never, {
      params: Promise.resolve({ siteId }),
    });

    expect(res.status).toBe(403);
  });

  test("unauthenticated user cannot register device under site", async () => {
    delete process.env.MOCK_USER_ID;

    const req = makeReq("POST", {
      serial_number: makeSerial("SN-NOAUTH"),
      device_type: "esp32",
    });

    const res = await devicesPOST(req as never, {
      params: Promise.resolve({ siteId }),
    });

    expect(res.status).toBe(401);
  });

  test("unique serial_number enforced (409)", async () => {
    await setMockUser(OWNER_USER_ID);

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
    await setSiteRole(VIEWER_USER_ID, "viewer");
    await setMockUser(OWNER_USER_ID);

    const { body: created } = await registerTestDevice();

    await setMockUser(VIEWER_USER_ID);

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
    await setMockUser(OWNER_USER_ID);

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
    await setMockUser(OWNER_USER_ID);

    const { body: created } = await registerTestDevice();
    const deviceId = created.device.device_id;

    await setSiteRole(VIEWER_USER_ID, "viewer");
    await setMockUser(VIEWER_USER_ID);

    const req = makeReq("PATCH", { status: "online" }, cookie);

    const res = await deviceStatusPATCH(req as never, {
      params: Promise.resolve({ deviceId }),
    });

    expect(res.status).toBe(403);
  });
});