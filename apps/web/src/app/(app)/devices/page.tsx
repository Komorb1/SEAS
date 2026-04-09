import { Router, Activity, ChevronRight, Cpu } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserId } from "@/lib/auth";
import { PageEmptyState } from "@/components/ui/page-states";
import { getEffectiveDeviceStatus } from "@/lib/device-status";

type UiDeviceStatus = "online" | "offline" | "warning";

type DevicesPageProps = {
  searchParams?: Promise<{
    siteId?: string;
    status?: string;
    page?: string;
  }>;
};

type DeviceListItem = {
  device_id: string;
  serial_number: string;
  device_type: string;
  status: "online" | "offline" | "maintenance";
  last_seen_at: Date | null;
  site: {
    name: string;
  };
  _count: {
    sensors: number;
  };
};

const PAGE_SIZE = 10;

function mapDeviceStatus(
  status: "online" | "offline" | "maintenance"
): UiDeviceStatus {
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

function parsePage(value?: string): number {
  const page = Number(value);

  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }

  return Math.floor(page);
}

function buildDevicesPageHref(params: {
  page: number;
  siteId?: string;
  status?: string;
}): string {
  const search = new URLSearchParams();

  if (params.siteId) search.set("siteId", params.siteId);
  if (params.status) search.set("status", params.status);
  search.set("page", String(params.page));

  return `/devices?${search.toString()}`;
}

function DevicesOfflineNotice() {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
      Live device data could not be refreshed. You may be offline or the server
      may be temporarily unavailable.
    </section>
  );
}

export default async function DevicesPage({ searchParams }: DevicesPageProps) {
  const userId = await requireCurrentUserId();

  const params = (await searchParams) ?? {};
  const selectedSiteId = params.siteId?.trim() || "";
  const selectedStatus = params.status?.trim() || "";
  const currentPage = parsePage(params.page);

  let allFilteredDevices: DeviceListItem[] = [];
  let hasLiveDataError = false;
  const hasActiveFilters = Boolean(selectedSiteId) || Boolean(selectedStatus);

  const authorizedSites = await prisma.site.findMany({
    where: {
      is_deleted: false,
      site_users: {
        some: {
          user_id: userId,
        },
      },
    },
    select: {
      site_id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  try {
    const fetchedDevices = await prisma.device.findMany({
      where: {
        is_deleted: false,
        site: {
          site_users: {
            some: {
              user_id: userId,
            },
          },
        },
        ...(selectedSiteId ? { site_id: selectedSiteId } : {}),
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

    allFilteredDevices = fetchedDevices.filter((device) => {
      if (!selectedStatus) return true;

      const effectiveStatus = getEffectiveDeviceStatus(
        device.status,
        device.last_seen_at
      );

      return effectiveStatus === selectedStatus;
    });
  } catch (error) {
    hasLiveDataError = true;
    console.error("Devices data load failed:", error);
  }

  const totalDevices = allFilteredDevices.length;
  const totalPages = Math.max(1, Math.ceil(totalDevices / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const devices = allFilteredDevices.slice(startIndex, startIndex + PAGE_SIZE);

  const startItem = totalDevices === 0 ? 0 : startIndex + 1;
  const endItem = Math.min(startIndex + PAGE_SIZE, totalDevices);

  const previousPageHref = buildDevicesPageHref({
    page: Math.max(1, safePage - 1),
    siteId: selectedSiteId || undefined,
    status: selectedStatus || undefined,
  });

  const nextPageHref = buildDevicesPageHref({
    page: Math.min(totalPages, safePage + 1),
    siteId: selectedSiteId || undefined,
    status: selectedStatus || undefined,
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
            {hasLiveDataError ? "—" : totalDevices}
          </span>
        </div>
      </section>

      {hasLiveDataError ? <DevicesOfflineNotice /> : null}

      <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <form
          method="GET"
          className="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-4"
        >
          <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Filters
          </div>

          <div className="grid flex-1 gap-2 sm:grid-cols-2">
            <select
              id="siteId"
              name="siteId"
              defaultValue={selectedSiteId}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-red-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="">All sites</option>
              {authorizedSites.map((site) => (
                <option key={site.site_id} value={site.site_id}>
                  {site.name}
                </option>
              ))}
            </select>

            <select
              id="status"
              name="status"
              defaultValue={selectedStatus}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-red-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="">All statuses</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          <div className="flex shrink-0 gap-2">
            <button
              type="submit"
              className="h-9 rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700"
            >
              Apply
            </button>

            <Link
              href="/devices"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Reset
            </Link>
          </div>
        </form>
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
            title={
              hasLiveDataError
                ? "Devices unavailable offline"
                : hasActiveFilters
                  ? "No devices match the current filters"
                  : "No devices found"
            }
            description={
              hasLiveDataError
                ? "Live device data could not be loaded right now."
                : hasActiveFilters
                  ? "Try changing or clearing the current filters."
                  : "No devices were found for your assigned sites."
            }
            className="py-12"
          />
        ) : (
          <>
            <div className="border-b border-slate-200 px-4 py-3 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:px-5">
              Showing {startItem} ~ {endItem} of {totalDevices} devices
            </div>

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
                        <StatusBadge
                          status={mapDeviceStatus(
                            getEffectiveDeviceStatus(device.status, device.last_seen_at)
                          )}
                        />
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
                        <StatusBadge
                          status={mapDeviceStatus(
                            getEffectiveDeviceStatus(device.status, device.last_seen_at)
                          )}
                        />
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

            <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Page {safePage} of {totalPages}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={previousPageHref}
                  aria-disabled={safePage === 1}
                  className={[
                    "inline-flex h-9 items-center justify-center rounded-lg border px-4 text-sm font-medium transition",
                    safePage === 1
                      ? "pointer-events-none border-slate-200 text-slate-400 dark:border-slate-800 dark:text-slate-600"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800",
                  ].join(" ")}
                >
                  Previous
                </Link>

                <form
                  method="GET"
                  className="flex items-center gap-2"
                >
                  {selectedSiteId ? (
                    <input type="hidden" name="siteId" value={selectedSiteId} />
                  ) : null}
                  {selectedStatus ? (
                    <input type="hidden" name="status" value={selectedStatus} />
                  ) : null}

                  <label
                    htmlFor="page"
                    className="text-sm text-slate-500 dark:text-slate-400"
                  >
                    Go to
                  </label>
                  <input
                    id="page"
                    name="page"
                    type="number"
                    min={1}
                    max={totalPages}
                    defaultValue={safePage}
                    className="h-9 w-20 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-red-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="inline-flex h-9 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700"
                  >
                    Go
                  </button>
                </form>

                <Link
                  href={nextPageHref}
                  aria-disabled={safePage === totalPages}
                  className={[
                    "inline-flex h-9 items-center justify-center rounded-lg border px-4 text-sm font-medium transition",
                    safePage === totalPages
                      ? "pointer-events-none border-slate-200 text-slate-400 dark:border-slate-800 dark:text-slate-600"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800",
                  ].join(" ")}
                >
                  Next
                </Link>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}