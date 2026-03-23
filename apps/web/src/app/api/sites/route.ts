import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-request";
import { AuditActionType, AuditTargetType } from "@prisma/client";
import { safeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

type SitesTx = {
  site: typeof prisma.site;
  siteUser: typeof prisma.siteUser;
};

const CreateSiteSchema = z.object({
  name: z.string().min(2, "Site name is required"),
  address_line: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const userId = await requireUserId(req);

    const body = await req.json();
    const parsed = CreateSiteSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, address_line, city, country } = parsed.data;

    const result = await prisma.$transaction(async (tx: SitesTx) => {
      const site = await tx.site.create({
        data: { name, address_line, city, country },
        select: {
          site_id: true,
          name: true,
          address_line: true,
          city: true,
          country: true,
          status: true,
          created_at: true,
        },
      });

      await tx.siteUser.create({
        data: {
          site_id: site.site_id,
          user_id: userId,
          role: "owner",
        },
      });

      return site;
    });

    await safeAuditLog({
      user_id: userId,
      action_type: AuditActionType.other,
      target_type: AuditTargetType.site,
      target_id: result.site_id,
      details: {
        kind: "site_created",
        name: result.name,
        status: result.status,
        city: result.city,
        country: result.country,
      },
    });

    return Response.json({ site: result }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "unauthenticated") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Create site error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);

    const sites = await prisma.site.findMany({
      where: {
        site_users: {
          some: { user_id: userId },
        },
      },
      select: {
        site_id: true,
        name: true,
        address_line: true,
        city: true,
        country: true,
        status: true,
        created_at: true,
        site_users: {
          where: { user_id: userId },
          select: { role: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const response = sites.map((s: (typeof sites)[number]) => ({
      ...s,
      my_role: s.site_users[0]?.role ?? "viewer",
      site_users: undefined,
    }));

    return Response.json({ sites: response }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "unauthenticated") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("List sites error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}