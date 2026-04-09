import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import { SiteStatusAction } from "@/components/sites/site-status-action";
import { RegisterDeviceForm } from "@/components/sites/register-device-form";
import { DeleteSiteAction } from "@/components/sites/delete-site-action";
import { SiteMembersManager } from "@/components/sites/site-members-manager";
import { getEffectiveDeviceStatus } from "@/lib/device-status";
import { StatusBadge } from "@/components/ui/status-badge";

type SiteDetailsPageProps = {
  params: Promise<{
    siteId: string;
  }>;
};

function formatOptionalDateTime(value: Date | string | null | undefined) {
  if (!value) return "Unknown";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(date);
}

type UiDeviceStatus = "online" | "offline" | "warning";

function mapDeviceStatus(
  status: "online" | "offline" | "maintenance"
): UiDeviceStatus {
  if (status === "maintenance") return "warning";
  return status;
}

export default async function SiteDetailsPage({
  params,
}: SiteDetailsPageProps) {
  const { siteId } = await params;
  const userId = await requireCurrentUserId();

  const site = await prisma.site.findFirst({
    where: {
      site_id: siteId,
      is_deleted: false,
      site_users: {
        some: {
          user_id: userId,
        },
      },
    },
    include: {
      devices: {
        where: {
          is_deleted: false,
        },
        orderBy: {
          created_at: "desc",
        },
        include: {
          sensors: true,
        },
      },
      site_users: {
        include: {
          user: {
            select: {
              user_id: true,
              full_name: true,
              username: true,
              email: true,
              status: true,
            },
          },
        },
        orderBy: {
          created_at: "asc",
        },
      },
    },
  });

  if (!site) {
    notFound();
  }

  const currentMembership = site.site_users.find(
    (membership) => membership.user_id === userId
  );
  const currentUserRole = currentMembership?.role ?? null;
  const canManageSite =
    currentUserRole === "owner" || currentUserRole === "admin";
  const canDeleteSite = currentUserRole === "owner";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-red-600 dark:text-red-400">
            Site Details
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {site.name}
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            View site information, assigned members, and connected devices.
          </p>
        </div>

        <Link
          href="/sites"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sites
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Address
          </p>
          <p className="mt-2 text-sm text-slate-900 dark:text-white">
            {site.address_line?.trim() || "No address provided"}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Location
          </p>
          <p className="mt-2 text-sm text-slate-900 dark:text-white">
            {[site.city, site.country].filter(Boolean).join(", ") || "Not set"}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Created
          </p>
          <p className="mt-2 text-sm text-slate-900 dark:text-white">
            {formatOptionalDateTime(site.created_at)}
          </p>
        </article>
      </section>

      {canManageSite || canDeleteSite ? (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Site Actions
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage this site and its connected devices.
            </p>
          </div>

          <div className="space-y-6 px-5 py-5">
            {canManageSite ? (
              <>
                <SiteStatusAction
                  siteId={site.site_id}
                  currentStatus={site.status}
                />
                <RegisterDeviceForm siteId={site.site_id} />
              </>
            ) : null}

            {canDeleteSite ? (
              <DeleteSiteAction siteId={site.site_id} siteName={site.name} />
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Connected Devices
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Devices currently assigned to this site.
          </p>
        </div>

        {site.devices.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              No devices yet
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              No devices are connected to this site yet.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {site.devices.map((device) => {
              const effectiveStatus = getEffectiveDeviceStatus(
                device.status,
                device.last_seen_at
              );

              return (
                <div
                  key={device.device_id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {device.device_type}
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Serial: {device.serial_number}
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Location: {device.location_label ?? "Not set"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Sensors: {device.sensors.length}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Last seen: {formatOptionalDateTime(device.last_seen_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={mapDeviceStatus(effectiveStatus)} />

                    <Link
                      href={`/devices/${device.device_id}`}
                      className="text-sm font-medium text-red-600 transition hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      View
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      
    <SiteMembersManager
      siteId={site.site_id}
      currentUserId={userId}
      currentUserRole={currentUserRole}
      members={site.site_users}
    />
    </div>
  );
}