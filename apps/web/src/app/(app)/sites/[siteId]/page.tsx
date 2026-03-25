import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";

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

export default async function SiteDetailsPage({
  params,
}: SiteDetailsPageProps) {
  const { siteId } = await params;
  const userId = await requireCurrentUserId();

  const site = await prisma.site.findFirst({
    where: {
      site_id: siteId,
      site_users: {
        some: {
          user_id: userId,
        },
      },
    },
    include: {
      devices: {
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
            {site.devices.map((device) => (
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
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Sensors: {device.sensors.length}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {device.status}
                  </span>

                  <Link
                    href={`/devices/${device.device_id}`}
                    className="text-sm font-medium text-red-600 transition hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Assigned Members
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Users who have access to this site.
          </p>
        </div>

        {site.site_users.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              No members found
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              No users are currently assigned to this site.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {site.site_users.map((membership) => (
              <div
                key={`${membership.site_id}-${membership.user_id}`}
                className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {membership.user.full_name?.trim() ||
                      membership.user.username ||
                      membership.user.email}
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {membership.user.email}
                  </p>
                </div>

                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {membership.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}