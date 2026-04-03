import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BellRing,
  CheckCircle2,
  Clock3,
  MapPinned,
  Router,
  ShieldAlert,
  Siren,
  TriangleAlert,
} from "lucide-react";
import { AlertStatusActions } from "@/components/alerts/alert-status-actions";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserId } from "@/lib/auth";
import { StatusBadge } from "@/components/ui/status-badge";

type UiAlertSeverity = "online" | "warning" | "critical";

function mapSeverityToUiStatus(
  severity: "low" | "medium" | "high" | "critical"
): UiAlertSeverity {
  if (severity === "critical") return "critical";
  if (severity === "medium" || severity === "high") return "warning";
  return "online";
}

function formatEnumLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTime(date: Date | null): string {
  if (!date) return "N/A";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(date);
}

type AlertDetailPageProps = {
  params: Promise<{
    alertId: string;
  }>;
};

export default async function AlertDetailPage({
  params,
}: AlertDetailPageProps) {
  const userId = await requireCurrentUserId();
  const { alertId } = await params;

  const alert = await prisma.emergencyEvent.findFirst({
    where: {
      event_id: alertId,
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
          address_line: true,
          city: true,
          country: true,
          status: true,
        },
      },
      device: {
        select: {
          device_id: true,
          serial_number: true,
          device_type: true,
          status: true,
          last_seen_at: true,
        },
      },
      sensor: {
        select: {
          sensor_id: true,
          sensor_type: true,
          location_label: true,
          is_enabled: true,
          status: true,
        },
      },
      alert_notifications: {
        orderBy: {
          created_at: "desc",
        },
        select: {
          alert_id: true,
          channel: true,
          status: true,
          sent_at: true,
          delivered_at: true,
          error_message: true,
          created_at: true,
          recipient: {
            select: {
              full_name: true,
              username: true,
              email: true,
            },
          },
        },
      },
      readings: {
        orderBy: {
          received_at: "desc",
        },
        take: 5,
        select: {
          reading_id: true,
          value: true,
          unit: true,
          recorded_at: true,
          received_at: true,
          quality_flag: true,
        },
      },
    },
  });

  if (!alert) {
    notFound();
  }

  const uiSeverity = mapSeverityToUiStatus(alert.severity);

  const accentStyles =
    uiSeverity === "critical"
      ? "border-red-500/20 bg-red-500/5"
      : uiSeverity === "warning"
        ? "border-amber-500/20 bg-amber-500/5"
        : "border-emerald-500/20 bg-emerald-500/5";

  const iconStyles =
    uiSeverity === "critical"
      ? "bg-red-500/10 text-red-600 dark:text-red-400"
      : uiSeverity === "warning"
        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <Link
          href="/alerts"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to alerts
        </Link>
      </div>

      <section
        className={[
          "rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900 sm:p-6",
          accentStyles,
        ].join(" ")}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-3">
              <div className={["rounded-xl p-3", iconStyles].join(" ")}>
                {uiSeverity === "critical" ? (
                  <TriangleAlert className="h-6 w-6" />
                ) : uiSeverity === "warning" ? (
                  <BellRing className="h-6 w-6" />
                ) : (
                  <ShieldAlert className="h-6 w-6" />
                )}
              </div>

              <div className="min-w-0">
                <p className="text-xs font-medium tracking-wide text-slate-500 dark:text-slate-500">
                  Alert ID: {alert.event_id}
                </p>

                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                  {alert.title?.trim() || formatEnumLabel(String(alert.event_type))}
                </h1>

                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Detailed view of this emergency event.
                </p>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-start">
            <StatusBadge status={uiSeverity} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Alert overview
            </h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <DetailCard
                label="Event type"
                value={formatEnumLabel(String(alert.event_type))}
              />
              <DetailCard
                label="Severity"
                value={formatEnumLabel(String(alert.severity))}
              />
              <DetailCard
                label="Status"
                value={formatEnumLabel(String(alert.status))}
              />
              <DetailCard
                label="Started at"
                value={formatDateTime(alert.started_at)}
              />
              <DetailCard
                label="Acknowledged at"
                value={formatDateTime(alert.acknowledged_at)}
              />
              <DetailCard
                label="Resolved at"
                value={formatDateTime(alert.resolved_at)}
              />
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Description
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                {alert.description?.trim() ||
                  "No additional description was recorded for this alert."}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Notification delivery
            </h2>

            {alert.alert_notifications.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                No alert notifications were recorded for this event.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {alert.alert_notifications.map((notification) => (
                  <article
                    key={notification.alert_id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {notification.recipient.full_name?.trim() ||
                            notification.recipient.username ||
                            notification.recipient.email}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                          {notification.recipient.email}
                        </p>
                      </div>

                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {formatEnumLabel(String(notification.status))}
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                      <MiniField
                        label="Channel"
                        value={formatEnumLabel(String(notification.channel))}
                      />
                      <MiniField
                        label="Created"
                        value={formatDateTime(notification.created_at)}
                      />
                      <MiniField
                        label="Dispatch status"
                        value={formatEnumLabel(String(notification.status))}
                      />
                      <MiniField
                        label="Dispatched at"
                        value={formatDateTime(notification.sent_at)}
                      />
                    </div>

                    {notification.channel === "web_push" ? (
                      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                        Delivery confirmation is not available for web push notifications.
                      </div>
                    ) : (
                      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                        <MiniField
                          label="Delivered"
                          value={formatDateTime(notification.delivered_at)}
                        />
                      </div>
                    )}

                    {notification.error_message ? (
                      <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                        {notification.error_message}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Related readings
            </h2>

            {alert.readings.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                No linked readings were recorded for this event.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {alert.readings.map((reading) => (
                  <article
                    key={reading.reading_id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {String(reading.value)} {reading.unit ?? ""}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                          Quality: {formatEnumLabel(String(reading.quality_flag))}
                        </p>
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-500">
                        Received: {formatDateTime(reading.received_at)}
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-slate-500 dark:text-slate-500">
                      Recorded: {formatDateTime(reading.recorded_at)}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Actions
            </h2>

            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Update the lifecycle state of this alert.
            </p>

            <div className="mt-4">
              <AlertStatusActions alertId={alert.event_id} status={alert.status} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Context
            </h2>

            <div className="mt-4 space-y-4 text-sm">
              <div className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
                <MapPinned className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Site</p>
                  <p>{alert.site.name}</p>
                  <p className="text-slate-500 dark:text-slate-500">
                    {[alert.site.address_line, alert.site.city, alert.site.country]
                      .filter(Boolean)
                      .join(", ") || "No address details"}
                  </p>
                  <p className="text-slate-500 dark:text-slate-500">
                    Status: {formatEnumLabel(String(alert.site.status))}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
                <Router className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Device</p>
                  <p>{alert.device?.serial_number ?? "N/A"}</p>
                  <p className="text-slate-500 dark:text-slate-500">
                    Type: {alert.device?.device_type ?? "N/A"}
                  </p>
                  <p className="text-slate-500 dark:text-slate-500">
                    Status: {alert.device ? formatEnumLabel(String(alert.device.status)) : "N/A"}
                  </p>
                  <p className="text-slate-500 dark:text-slate-500">
                    Last seen: {formatDateTime(alert.device?.last_seen_at ?? null)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
                <Siren className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Sensor</p>
                  <p>
                    {alert.sensor
                      ? formatEnumLabel(String(alert.sensor.sensor_type))
                      : "N/A"}
                  </p>
                  <p className="text-slate-500 dark:text-slate-500">
                    Location: {alert.sensor?.location_label ?? "N/A"}
                  </p>
                  <p className="text-slate-500 dark:text-slate-500">
                    Status: {alert.sensor ? formatEnumLabel(String(alert.sensor.status)) : "N/A"}
                  </p>
                  <p className="text-slate-500 dark:text-slate-500">
                    Enabled: {alert.sensor ? (alert.sensor.is_enabled ? "Yes" : "No") : "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Timeline</p>
                  <p>Started: {formatDateTime(alert.started_at)}</p>
                  <p>Acknowledged: {formatDateTime(alert.acknowledged_at)}</p>
                  <p>Resolved: {formatDateTime(alert.resolved_at)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Record created</p>
                  <p>{formatDateTime(alert.created_at)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Technical ID</p>
                  <p className="break-all">{alert.event_id}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function MiniField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}