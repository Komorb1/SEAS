import Link from "next/link";
import {
  BellRing,
  Clock3,
  MapPinned,
  TriangleAlert,
  Router,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserId } from "@/lib/auth";
import { PageEmptyState } from "@/components/ui/page-states";
import type { EventType, Severity } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type UiAlertSeverity = "online" | "warning" | "critical";

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

function AlertsOfflineNotice() {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
      Live alert data could not be refreshed. You may be offline or the server
      may be temporarily unavailable.
    </section>
  );
}

type AlertStatus = "new" | "acknowledged" | "resolved" | "false_alarm";

function formatAlertStatus(status: AlertStatus): string {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getAlertStatusBadgeClasses(status: AlertStatus): string {
  switch (status) {
    case "new":
      return "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400";
    case "acknowledged":
      return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "resolved":
      return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
    case "false_alarm":
      return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
    default:
      return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

function formatSeverityLabel(severity: Severity): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

function getAlertCardStyles(
  severity: Severity,
  status: AlertStatus
): {
  accent: string;
  icon: string;
  badge: UiAlertSeverity;
} {
  const isResolvedLike = status === "resolved" || status === "false_alarm";

  if (isResolvedLike) {
    if (severity === "critical") {
      return {
        accent: "border-l-slate-400 dark:border-l-slate-600",
        icon: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
        badge: "critical",
      };
    }

    if (severity === "medium" || severity === "high") {
      return {
        accent: "border-l-slate-400 dark:border-l-slate-600",
        icon: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
        badge: "warning",
      };
    }

    return {
      accent: "border-l-slate-400 dark:border-l-slate-600",
      icon: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
      badge: "online",
    };
  }

  if (severity === "critical") {
    return {
      accent: "border-l-red-500",
      icon: "bg-red-500/10 text-red-600 dark:text-red-400",
      badge: "critical",
    };
  }

  if (severity === "medium" || severity === "high") {
    return {
      accent: "border-l-amber-500",
      icon: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      badge: "warning",
    };
  }

  return {
    accent: "border-l-emerald-500",
    icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    badge: "online",
  };
}


type AlertListItem = {
  event_id: string;
  title: string | null;
  event_type: EventType;
  severity: Severity;
  status: "new" | "acknowledged" | "resolved" | "false_alarm";
  description: string | null;
  started_at: Date;
  site: {
    name: string;
  };
  device: {
    serial_number: string;
  } | null;
};


export default async function AlertsPage() {
  const userId = await requireCurrentUserId();

  let alerts: AlertListItem[] = [];
  let hasLiveDataError = false;

  try {
    alerts = await prisma.emergencyEvent.findMany({
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
  } catch (error) {
    hasLiveDataError = true;
    console.error("Alerts data load failed:", error);
  }

  const openAlerts = alerts.filter(
    (alert) => alert.status === "new" || alert.status === "acknowledged"
  );

  const criticalCount = openAlerts.filter(
    (alert) => alert.severity === "critical"
  ).length;

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
            Open alerts:
            <span className="ml-2 font-semibold text-slate-900 dark:text-white">
              {hasLiveDataError ? "—" : openAlerts.length}
            </span>
          </div>

          <div className="inline-flex w-fit items-center rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
            Critical:
            <span className="ml-2 font-semibold">
              {hasLiveDataError ? "—" : criticalCount}
            </span>
          </div>
        </div>
      </section>

      {hasLiveDataError ? <AlertsOfflineNotice /> : null}

      {alerts.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <PageEmptyState
            title={hasLiveDataError ? "Alerts unavailable offline" : "No alerts yet"}
            description={
              hasLiveDataError
                ? "Live alert data could not be loaded right now."
                : "No emergency events were found for your assigned sites."
            }
            className="py-12"
          />
        </section>
      ) : (
        <section className="space-y-4">
          {alerts.map((alert) => {
            const cardStyles = getAlertCardStyles(alert.severity, alert.status);

            return (
              <Link
                key={alert.event_id}
                href={`/alerts/${alert.event_id}`}
                className="block"
              >
                <article
                  className={[
                    "rounded-2xl border border-slate-200 border-l-4 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:p-5",
                    cardStyles.accent,
                  ].join(" ")}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-3">
                        <div className={["mt-0.5 rounded-xl p-2", cardStyles.icon].join(" ")}>
                          {cardStyles.badge === "critical" ? (
                            <TriangleAlert className="h-5 w-5" />
                          ) : (
                            <BellRing className="h-5 w-5" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-medium tracking-wide text-slate-500 dark:text-slate-500">
                            {alert.event_id}
                          </p>
                          <h3
                            className={[
                              "mt-1 text-lg font-semibold",
                              alert.status === "resolved" || alert.status === "false_alarm"
                                ? "text-slate-600 dark:text-slate-300"
                                : "text-slate-900 dark:text-white"
                            ].join(" ")}
                          >
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
                          <div
                            className={[
                              "sm:col-span-2",
                              alert.status === "resolved" || alert.status === "false_alarm"
                                ? "text-slate-400 dark:text-slate-500"
                                : "text-slate-500 dark:text-slate-400",
                            ].join(" ")}
                          >
                            {alert.description}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-start gap-2 sm:justify-end">
                      <span
                        className={[
                          "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap",
                          alert.status === "resolved" || alert.status === "false_alarm"
                            ? "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            : cardStyles.badge === "critical"
                              ? "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400"
                              : cardStyles.badge === "warning"
                                ? "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                        ].join(" ")}
                      >
                        {formatSeverityLabel(alert.severity)}
                      </span>

                      <span
                        className={[
                          "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap",
                          getAlertStatusBadgeClasses(alert.status),
                        ].join(" ")}
                      >
                        {formatAlertStatus(alert.status)}
                      </span>
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