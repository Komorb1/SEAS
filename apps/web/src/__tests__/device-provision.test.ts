import bcrypt from "bcrypt";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

import { POST as provisionPOST } from "@/app/api/devices/provision/route";

type ProvisionResponse = {
  device_secret: string;
};

function asNextRequest(r: Request): NextRequest {
  return r as unknown as NextRequest;
}

function makeReq(body: unknown) {
  return new Request("http://localhost", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function readJson<T>(res: Response): Promise<T> {
  const t = await res.text();
  return JSON.parse(t) as T;
}

describe("Device provisioning", () => {
  let siteId = "";
  let deviceId = "";
  let serialNumber = "";

  beforeEach(async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    serialNumber = `SEAS-PROVISION-${suffix}`;

    const site = await prisma.site.create({
      data: {
        name: `Provision Test Site ${suffix}`,
        status: "active",
      },
      select: { site_id: true },
    });
    siteId = site.site_id;

    const device = await prisma.device.create({
      data: {
        site_id: siteId,
        serial_number: serialNumber,
        device_type: "esp32",
        secret_hash: null,
        status: "offline",
      },
      select: {
        device_id: true,
      },
    });
    deviceId = device.device_id;
  });

  afterEach(async () => {
    if (deviceId) {
      await prisma.device.deleteMany({
        where: { device_id: deviceId },
      });
    }

    if (siteId) {
      await prisma.site.deleteMany({
        where: { site_id: siteId },
      });
    }

    siteId = "";
    deviceId = "";
    serialNumber = "";
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test("registered unprovisioned device can provision and receives secret once", async () => {
    const req = makeReq({
      serial_number: serialNumber,
    });

    const res = await provisionPOST(asNextRequest(req));
    expect(res.status).toBe(200);

    const body = await readJson<ProvisionResponse>(res);
    expect(typeof body.device_secret).toBe("string");
    expect(body.device_secret.length).toBeGreaterThan(20);

    const dbDevice = await prisma.device.findUnique({
      where: { serial_number: serialNumber },
      select: {
        secret_hash: true,
      },
    });

    expect(dbDevice?.secret_hash).toBeTruthy();
    expect(dbDevice?.secret_hash).not.toBe(body.device_secret);

    const matches = await bcrypt.compare(
      body.device_secret,
      dbDevice!.secret_hash!,
    );
    expect(matches).toBe(true);
  });

  test("already provisioned device cannot provision again", async () => {
    const firstReq = makeReq({
      serial_number: serialNumber,
    });
    const firstRes = await provisionPOST(asNextRequest(firstReq));
    expect(firstRes.status).toBe(200);

    const secondReq = makeReq({
      serial_number: serialNumber,
    });
    const secondRes = await provisionPOST(asNextRequest(secondReq));
    expect(secondRes.status).toBe(409);

    const body = await readJson<{ error: string }>(secondRes);
    expect(body.error).toBe("Device already provisioned");
  });

  test("unknown serial number returns not found", async () => {
    const req = makeReq({
      serial_number: "SEAS-UNKNOWN-12345",
    });

    const res = await provisionPOST(asNextRequest(req));
    expect(res.status).toBe(404);

    const body = await readJson<{ error: string }>(res);
    expect(body.error).toBe("Device not found");
  });
});