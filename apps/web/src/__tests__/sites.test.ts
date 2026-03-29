import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { POST as sitesPOST, GET as sitesGET } from "@/app/api/sites/route";
import { PATCH as statusPATCH } from "@/app/api/sites/[siteId]/status/route";
import { DELETE as siteDELETE } from "@/app/api/sites/[siteId]/route";
import type { NextRequest } from "next/server";

function asNextRequest(r: Request): NextRequest {
  return r as unknown as NextRequest;
}

type SitesResponse = {
  sites: { site_id: string; name: string; status: string }[];
};

type CreateSiteResponse = {
  site: { site_id: string };
};

function makeJsonRequest(body: unknown, cookie?: string) {
  return new Request("http://localhost", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(cookie?: string) {
  return new Request("http://localhost", {
    method: "GET",
    headers: cookie ? { cookie } : {},
  });
}

async function readJson<T>(res: Response): Promise<T> {
  const t = await res.text();
  return JSON.parse(t) as T;
}

describe("Sites RBAC", () => {
  const OWNER_USER_ID = crypto.randomUUID();
  const ADMIN_USER_ID = crypto.randomUUID();
  const VIEWER_USER_ID = crypto.randomUUID();

  const OWNER_USERNAME = "siteowner_test";
  const OWNER_EMAIL = "siteowner_test@example.com";
  const ADMIN_USERNAME = "siteadmin_test";
  const ADMIN_EMAIL = "siteadmin_test@example.com";
  const VIEWER_USERNAME = "siteviewer_test";
  const VIEWER_EMAIL = "siteviewer_test@example.com";

  const cookie = "auth_token=fake";
  let siteId = "";

  async function setMockUser(userId: string) {
    process.env.MOCK_USER_ID = userId;
  }

  async function setSiteRole(
    userId: string,
    role: "owner" | "admin" | "viewer"
  ) {
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

  beforeAll(async () => {
    await prisma.siteUser.deleteMany({
      where: {
        user_id: {
          in: [OWNER_USER_ID, ADMIN_USER_ID, VIEWER_USER_ID],
        },
      },
    });

    await prisma.site.deleteMany({
      where: {
        name: "Test Site",
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

    await prisma.user.create({
      data: {
        user_id: OWNER_USER_ID,
        full_name: "Site Owner",
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
        full_name: "Site Admin",
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
        full_name: "Site Viewer",
        username: VIEWER_USERNAME,
        email: VIEWER_EMAIL,
        phone: null,
        password_hash: "x",
        status: "active",
      },
    });

    await setMockUser(OWNER_USER_ID);
  });

  afterEach(async () => {
    if (siteId) {
      await setSiteRole(OWNER_USER_ID, "owner");
    }
    await setMockUser(OWNER_USER_ID);
  });

  afterAll(async () => {
    delete process.env.MOCK_USER_ID;

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
          in: [OWNER_USER_ID, ADMIN_USER_ID, VIEWER_USER_ID],
        },
      },
    });
  });

  test("create site creates SiteUser owner", async () => {
    await setMockUser(OWNER_USER_ID);

    const res = await sitesPOST(
      makeJsonRequest(
        { name: "Test Site", city: "Istanbul", country: "TR" },
        cookie
      )
    );
    expect(res.status).toBe(201);

    const body = await readJson<CreateSiteResponse>(res);
    siteId = body.site.site_id;

    const membership = await prisma.siteUser.findUnique({
      where: {
        site_id_user_id: {
          site_id: siteId,
          user_id: OWNER_USER_ID,
        },
      },
      select: { role: true },
    });

    expect(membership?.role).toBe("owner");
  });

  test("list sites returns sites user has access to", async () => {
    await setMockUser(OWNER_USER_ID);

    const res = await sitesGET(makeGetRequest(cookie));
    expect(res.status).toBe(200);

    const body = await readJson<SitesResponse>(res);
    expect(body.sites.some((s) => s.site_id === siteId)).toBe(true);
  });

  test("update status allowed for owner", async () => {
    await setMockUser(OWNER_USER_ID);

    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ status: "inactive" }),
    });

    const res = await statusPATCH(asNextRequest(req), {
      params: Promise.resolve({ siteId }),
    });

    expect(res.status).toBe(200);
  });

  test("admin can update site status", async () => {
    await setSiteRole(ADMIN_USER_ID, "admin");
    await setMockUser(ADMIN_USER_ID);

    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ status: "active" }),
    });

    const res = await statusPATCH(asNextRequest(req), {
      params: Promise.resolve({ siteId }),
    });

    expect(res.status).toBe(200);
  });

  test("viewer cannot update site status", async () => {
    await setSiteRole(VIEWER_USER_ID, "viewer");
    await setMockUser(VIEWER_USER_ID);

    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ status: "inactive" }),
    });

    const res = await statusPATCH(asNextRequest(req), {
      params: Promise.resolve({ siteId }),
    });

    expect(res.status).toBe(403);
  });

  test("unauthenticated user cannot update site status", async () => {
    delete process.env.MOCK_USER_ID;

    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "inactive" }),
    });

    const res = await statusPATCH(asNextRequest(req), {
      params: Promise.resolve({ siteId }),
    });

    expect(res.status).toBe(401);
  });

  test("viewer cannot delete site", async () => {
    await setSiteRole(VIEWER_USER_ID, "viewer");
    await setMockUser(VIEWER_USER_ID);

    const req = new Request("http://localhost", {
      method: "DELETE",
      headers: { cookie },
    });

    const res = await siteDELETE(asNextRequest(req), {
      params: Promise.resolve({ siteId }),
    });

    expect(res.status).toBe(403);
  });

  test("admin cannot delete site", async () => {
    await setSiteRole(ADMIN_USER_ID, "admin");
    await setMockUser(ADMIN_USER_ID);

    const req = new Request("http://localhost", {
      method: "DELETE",
      headers: { cookie },
    });

    const res = await siteDELETE(asNextRequest(req), {
      params: Promise.resolve({ siteId }),
    });

    expect(res.status).toBe(403);
  });

  test("unauthenticated user cannot delete site", async () => {
    delete process.env.MOCK_USER_ID;

    const req = new Request("http://localhost", {
      method: "DELETE",
    });

    const res = await siteDELETE(asNextRequest(req), {
      params: Promise.resolve({ siteId }),
    });

    expect(res.status).toBe(401);
  });

  test("delete site allowed for owner", async () => {
    await setMockUser(OWNER_USER_ID);

    const req = new Request("http://localhost", {
      method: "DELETE",
      headers: { cookie },
    });

    const res = await siteDELETE(asNextRequest(req), {
      params: Promise.resolve({ siteId }),
    });

    expect(res.status).toBe(200);

    siteId = "";
  });
});