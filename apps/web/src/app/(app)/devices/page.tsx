import { Router, Activity, ChevronRight, Cpu } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserId } from "@/lib/auth";
import { PageEmptyState } from "@/components/ui/page-states";
type UiDeviceStatus = "online" | "offline" | "warning";

function mapDeviceStatus(status: "online" | "offline" | "maintenance"): UiDeviceStatus {
  if (status === "maintenance") return "warning";
  return status;
}

function formatLastSeen(date: Date | null): string {
  if (!date) return "Never";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(date);
}

export default async function DevicesPage() {
  const userId = await requireCurrentUserId();

  const devices = await prisma.device.findMany({
    where: {
      site: {
        site_users: {
          some: {
            user_id: userId,
          },
        },
      },
    },
    include: {
      site: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          sensors: true,
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Devices
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400 sm:text-base">
            View all registered hardware units and their current status.
          </p>
        </div>

        <div className="inline-flex w-fit items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          Total devices:
          <span className="ml-2 font-semibold text-slate-900 dark:text-white">
            {devices.length}
          </span>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-5">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Registered Devices
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Monitor field devices, connectivity, and last activity.
          </p>
        </div>

        {devices.length === 0 ? (
          <PageEmptyState
            title="No devices found"
            description="No devices were found for your assigned sites."
            className="py-12"
          />
        ) : (
          <>
            <div className="md:hidden">
              <div className="space-y-3 p-4">
                {devices.map((device) => (
                  <article
                    key={device.device_id}
                    className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {device.device_id}
                        </p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {device.serial_number}
                        </p>
                      </div>

                      <div className="shrink-0">
                        <StatusBadge status={mapDeviceStatus(device.status)} />
                      </div>
                    </div>

                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <Router className="h-4 w-4 shrink-0" />
                        <span className="truncate">{device.site.name}</span>
                      </div>

                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <Cpu className="h-4 w-4 shrink-0" />
                        <span className="truncate">
                          Type: <span className="font-medium">{device.device_type}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <Cpu className="h-4 w-4 shrink-0" />
                        <span>
                          Sensors: <span className="font-medium">{device._count.sensors}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <Activity className="h-4 w-4 shrink-0" />
                        <span>Last seen: {formatLastSeen(device.last_seen_at)}</span>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-end border-t border-slate-200 pt-4 dark:border-slate-800">
                      <Link
                        href={`/devices/${device.device_id}`}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                      >
                        View
                        <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-left text-slate-600 dark:bg-slate-950/40 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-medium">Device ID</th>
                    <th className="px-5 py-3 font-medium">Serial Number</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Site</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Sensors</th>
                    <th className="px-5 py-3 font-medium">Last Seen</th>
                    <th className="px-5 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {devices.map((device) => (
                    <tr
                      key={device.device_id}
                      className="border-t border-slate-200 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">
                        {device.device_id}
                      </td>
                      <td className="px-5 py-4 text-slate-700 dark:text-slate-300">
                        {device.serial_number}
                      </td>
                      <td className="px-5 py-4 text-slate-700 dark:text-slate-300">
                        {device.device_type}
                      </td>
                      <td className="px-5 py-4 text-slate-700 dark:text-slate-300">
                        {device.site.name}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={mapDeviceStatus(device.status)} />
                      </td>
                      <td className="px-5 py-4 text-slate-700 dark:text-slate-300">
                        {device._count.sensors}
                      </td>
                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                        {formatLastSeen(device.last_seen_at)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/devices/${device.device_id}`}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                        >
                          View
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}