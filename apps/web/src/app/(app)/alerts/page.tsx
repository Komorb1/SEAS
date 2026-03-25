import Link from "next/link";
import { BellRing, Clock3, MapPinned, TriangleAlert, Router } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserId } from "@/lib/auth";
import { PageEmptyState } from "@/components/ui/page-states";
type UiAlertSeverity = "online" | "warning" | "critical";

function mapSeverityToUiStatus(
  severity: "low" | "medium" | "high" | "critical"
): UiAlertSeverity {
  if (severity === "critical") return "critical";
  if (severity === "medium" || severity === "high") return "warning";
  return "online";
}

function formatEventType(eventType: string): string {
  return eventType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(date);
}

export default async function AlertsPage() {
  const userId = await requireCurrentUserId();

  const alerts = await prisma.emergencyEvent.findMany({
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
  });

  const criticalCount = alerts.filter((alert) => alert.severity === "critical").length;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Alerts
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400 sm:text-base">
            Review emergency events and system-triggered warnings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex w-fit items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            Total alerts:
            <span className="ml-2 font-semibold text-slate-900 dark:text-white">
              {alerts.length}
            </span>
          </div>

          <div className="inline-flex w-fit items-center rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
            Critical:
            <span className="ml-2 font-semibold">{criticalCount}</span>
          </div>
        </div>
      </section>

      {alerts.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <PageEmptyState
            title="No alerts yet"
            description="No emergency events were found for your assigned sites."
            className="py-12"
          />
        </section>
      ) : (
        <section className="space-y-4">
          {alerts.map((alert) => {
            const uiSeverity = mapSeverityToUiStatus(alert.severity);

            const accentStyles =
              uiSeverity === "critical"
                ? "border-l-red-500"
                : uiSeverity === "warning"
                  ? "border-l-amber-500"
                  : "border-l-emerald-500";

            const iconStyles =
              uiSeverity === "critical"
                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                : uiSeverity === "warning"
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";

            return (
              <Link
                key={alert.event_id}
                href={`/alerts/${alert.event_id}`}
                className="block"
              >
                <article
                  className={[
                    "rounded-2xl border border-slate-200 border-l-4 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:p-5",
                    accentStyles,
                  ].join(" ")}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-3">
                        <div className={["mt-0.5 rounded-xl p-2", iconStyles].join(" ")}>
                          {uiSeverity === "critical" ? (
                            <TriangleAlert className="h-5 w-5" />
                          ) : (
                            <BellRing className="h-5 w-5" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-medium tracking-wide text-slate-500 dark:text-slate-500">
                            {alert.event_id}
                          </p>

                          <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                            {alert.title?.trim() || formatEventType(alert.event_type)}
                          </h3>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <MapPinned className="h-4 w-4 shrink-0" />
                          <span className="truncate">{alert.site.name}</span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          <Clock3 className="h-4 w-4 shrink-0" />
                          <span>{formatDateTime(alert.started_at)}</span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 sm:col-span-2">
                          <Router className="h-4 w-4 shrink-0" />
                          <span className="truncate">
                            Device: {alert.device?.serial_number ?? "N/A"}
                          </span>
                        </div>

                        {alert.description ? (
                          <div className="text-slate-500 dark:text-slate-400 sm:col-span-2">
                            {alert.description}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-start sm:justify-end">
                      <StatusBadge status={uiSeverity} />
                    </div>
                  </div>
                </article>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}