import Link from "next/link";
import {
  TriangleAlert,
  Router,
  MapPinned,
  ShieldCheck,
  ClipboardList,
  Clock3,
  BellRing,
  Activity,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import InstallPWAButton from "@/components/install-pwa-button";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserId } from "@/lib/auth";

type UiEventStatus = "critical" | "warning" | "online";

function mapSeverityToUiStatus(
  severity: "low" | "medium" | "high" | "critical"
): UiEventStatus {
  if (severity === "critical") return "critical";
  if (severity === "medium" || severity === "high") return "warning";
  return "online";
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(date);
}

function formatOptionalDateTime(date: Date | null): string {
  if (!date) return "N/A";
  return formatDateTime(date);
}

function formatEnumLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatEventType(eventType: string): string {
  return eventType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getSystemHealth(
  totalDevices: number,
  offlineDevices: number,
  maintenanceDevices: number
): string {
  if (totalDevices === 0) return "No Devices";

  const affectedDevices = offlineDevices + maintenanceDevices;

  if (affectedDevices === 0) return "Stable";
  if (affectedDevices <= Math.ceil(totalDevices * 0.2)) return "Degraded";
  return "Critical";
}

export default async function DashboardPage() {
  const userId = await requireCurrentUserId();

  const [
    totalSites,
    totalDevices,
    offlineDevices,
    maintenanceDevices,
    activeAlerts,
    recentAlerts,
    recentAuditLogs,
  ] = await Promise.all([
    prisma.site.count({
      where: {
        site_users: {
          some: {
            user_id: userId,
          },
        },
      },
    }),

    prisma.device.count({
      where: {
        site: {
          site_users: {
            some: {
              user_id: userId,
            },
          },
        },
      },
    }),

    prisma.device.count({
      where: {
        status: "offline",
        site: {
          site_users: {
            some: {
              user_id: userId,
            },
          },
        },
      },
    }),

    prisma.device.count({
      where: {
        status: "maintenance",
        site: {
          site_users: {
            some: {
              user_id: userId,
            },
          },
        },
      },
    }),

    prisma.emergencyEvent.count({
      where: {
        status: {
          in: ["new", "acknowledged"],
        },
        site: {
          site_users: {
            some: {
              user_id: userId,
            },
          },
        },
      },
    }),

    prisma.emergencyEvent.findMany({
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
        device: {
          select: {
            serial_number: true,
          },
        },
      },
      orderBy: {
        started_at: "desc",
      },
      take: 4,
    }),

    prisma.auditLog.findMany({
      where: {
        OR: [
          {
            user_id: userId,
          },
          {
            event: {
              site: {
                site_users: {
                  some: {
                    user_id: userId,
                  },
                },
              },
            },
          },
        ],
      },
      include: {
        user: {
          select: {
            full_name: true,
            username: true,
            email: true,
          },
        },
        event: {
          select: {
            event_id: true,
            title: true,
            event_type: true,
            site: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
      take: 3,
    }),
  ]);

  const systemHealth = getSystemHealth(
    totalDevices,
    offlineDevices,
    maintenanceDevices
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Dashboard
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400 sm:text-base">
            Overview of sites, devices, and emergency activity.
          </p>
        </div>

        <div className="w-full lg:w-auto lg:max-w-sm">
          <InstallPWAButton />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Sites"
          value={totalSites}
          description="Connected monitored locations"
          icon={<MapPinned className="h-5 w-5" />}
        />
        <StatCard
          title="Total Devices"
          value={totalDevices}
          description="Registered field devices"
          icon={<Router className="h-5 w-5" />}
        />
        <StatCard
          title="Active Alerts"
          value={activeAlerts}
          description="Currently open emergency events"
          icon={<TriangleAlert className="h-5 w-5" />}
        />
        <StatCard
          title="System Health"
          value={systemHealth}
          description="Derived from current device status"
          icon={<ShieldCheck className="h-5 w-5" />}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <section className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-5">
            <div className="min-w-0 pr-2">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Recent Alerts
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Latest emergency events across your assigned sites.
              </p>
            </div>

            <Link
              href="/alerts"
              className="shrink-0 whitespace-nowrap text-xs font-medium leading-none text-red-600 transition hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 sm:text-sm"
            >
              View all
            </Link>
          </div>

          {recentAlerts.length === 0 ? (
            <div className="px-5 py-8 text-center xl:flex xl:flex-1 xl:items-center xl:justify-center">
              <div className="flex flex-col items-center">
                <div className="mb-3 rounded-full bg-slate-100 p-3 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <BellRing className="h-5 w-5" />
                </div>
                <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                  No recent alerts
                </h4>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  No recent alerts were found for your assigned sites.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="md:hidden">
                <div className="space-y-3 p-4">
                  {recentAlerts.map((alert) => (
                    <Link
                      key={alert.event_id}
                      href={`/alerts/${alert.event_id}`}
                      className="block"
                    >
                      <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-start gap-3">
                              <div
                                className={[
                                  "rounded-xl p-2",
                                  mapSeverityToUiStatus(alert.severity) === "critical"
                                    ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                    : mapSeverityToUiStatus(alert.severity) === "warning"
                                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                                ].join(" ")}
                              >
                                {mapSeverityToUiStatus(alert.severity) === "critical" ? (
                                  <TriangleAlert className="h-4 w-4" />
                                ) : (
                                  <BellRing className="h-4 w-4" />
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                  {alert.title?.trim() ||
                                    formatEventType(String(alert.event_type))}
                                </p>
                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                                  {alert.site.name}
                                </p>
                              </div>
                            </div>
                          </div>

                          <StatusBadge status={mapSeverityToUiStatus(alert.severity)} />
                        </div>

                        <div className="mt-4 space-y-2 text-sm">
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">
                              Device:
                            </span>{" "}
                            <span className="text-slate-700 dark:text-slate-300">
                              {alert.device?.serial_number ?? "N/A"}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-500 dark:text-slate-400">
                              Time:
                            </span>{" "}
                            <span className="text-slate-700 dark:text-slate-300">
                              {formatDateTime(alert.started_at)}
                            </span>
                          </div>
                        </div>
                      </article>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="hidden xl:block">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 text-left text-slate-600 dark:bg-slate-950/40 dark:text-slate-400">
                    <tr>
                      <th className="px-5 py-3 font-medium">Alert</th>
                      <th className="px-5 py-3 font-medium">Site</th>
                      <th className="px-5 py-3 font-medium">Device</th>
                      <th className="px-5 py-3 font-medium">Severity</th>
                      <th className="px-5 py-3 font-medium">Time</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentAlerts.map((alert) => (
                      <tr
                        key={alert.event_id}
                        className="border-t border-slate-200 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">
                          <Link
                            href={`/alerts/${alert.event_id}`}
                            className="hover:text-red-600 dark:hover:text-red-400"
                          >
                            {alert.title?.trim() ||
                              formatEventType(String(alert.event_type))}
                          </Link>
                        </td>

                        <td className="px-5 py-4 text-slate-700 dark:text-slate-300">
                          {alert.site.name}
                        </td>

                        <td className="px-5 py-4 text-slate-700 dark:text-slate-300">
                          {alert.device?.serial_number ?? "N/A"}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge status={mapSeverityToUiStatus(alert.severity)} />
                        </td>

                        <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                          {formatDateTime(alert.started_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <section className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-5">
            <div className="flex min-w-0 flex-1 items-start gap-3 pr-2">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Recent Activity
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Latest audit actions relevant to your workspace.
                </p>
              </div>
            </div>

            <Link
              href="/audit-logs"
              className="shrink-0 whitespace-nowrap text-xs font-medium leading-none text-red-600 transition hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 sm:text-sm"
            >
              View all
            </Link>
          </div>

          {recentAuditLogs.length === 0 ? (
          <div className="px-5 py-8 text-center xl:flex xl:flex-1 xl:items-center xl:justify-center">
            <div className="flex flex-col items-center">
              <div className="mb-3 rounded-full bg-slate-100 p-3 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <Activity className="h-5 w-5" />
              </div>
              <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                No recent activity
              </h4>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                No recent activity was found.
              </p>
            </div>
          </div>
          ) : (
            <div className="p-4 sm:p-5">
              <div className="space-y-3">
                {recentAuditLogs.map((log) => (
                  <article
                    key={log.log_id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <ClipboardList className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {formatEnumLabel(String(log.action_type))}
                        </p>

                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                          {log.user?.full_name?.trim() ||
                            log.user?.username ||
                            log.user?.email ||
                            "Unknown user"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {log.event?.site?.name ? `${log.event.site.name} • ` : ""}
                          {log.event?.title?.trim() ||
                            (log.event?.event_type
                              ? formatEventType(String(log.event.event_type))
                              : formatEnumLabel(String(log.target_type)))}
                        </p>

                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <Clock3 className="h-4 w-4 shrink-0" />
                          <span>{formatOptionalDateTime(log.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}