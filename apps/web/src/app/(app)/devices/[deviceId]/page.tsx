import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Clock3,
  Cpu,
  MapPinned,
  Radio,
  ShieldAlert,
  Activity,
} from "lucide-react";
import { DeleteDeviceAction } from "@/components/devices/delete-device-action";
import { SensorSettingsAction } from "@/components/devices/sensor-settings-action";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserId } from "@/lib/auth";
import { StatusBadge } from "@/components/ui/status-badge";
import { DeviceStatusAction } from "@/components/devices/device-status-action";
import { getEffectiveDeviceStatus } from "@/lib/device-status";

type DeviceUiStatus = "online" | "offline" | "warning";

function mapDeviceStatusToBadgeStatus(
  status: "online" | "offline" | "maintenance",
): DeviceUiStatus {
  if (status === "online") return "online";
  if (status === "maintenance") return "warning";
  return "offline";
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

type DeviceDetailPageProps = {
  params: Promise<{
    deviceId: string;
  }>;
};

export default async function DeviceDetailPage({
  params,
}: DeviceDetailPageProps) {
  const userId = await requireCurrentUserId();
  const { deviceId } = await params;

  const device = await prisma.device.findFirst({
    where: {
      device_id: deviceId,
      is_deleted: false,
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
          site_id: true,
          name: true,
          address_line: true,
          city: true,
          country: true,
          status: true,
          site_users: {
            select: {
              user_id: true,
              role: true,
            },
          },
        },
      },
      sensors: {
        select: {
          sensor_id: true,
          sensor_type: true,
          location_label: true,
          status: true,
          is_enabled: true,
        },
      },
      emergency_events: {
        orderBy: {
          started_at: "desc",
        },
        take: 3,
        select: {
          event_id: true,
          event_type: true,
          severity: true,
          status: true,
          title: true,
          description: true,
          started_at: true,
        },
      },
    },
  });

  if (!device) {
    notFound();
  }

  const currentMembership = device.site.site_users.find(
    (membership) => membership.user_id === userId,
  );
  const currentUserRole = currentMembership?.role ?? null;
  const canManageDevice =
    currentUserRole === "owner" || currentUserRole === "admin";

  const recentReadings = await prisma.sensorReading.findMany({
    where: {
      sensor: {
        device_id: device.device_id,
      },
    },
    orderBy: {
      received_at: "desc",
    },
    take: 3,
    select: {
      reading_id: true,
      value: true,
      unit: true,
      recorded_at: true,
      received_at: true,
      quality_flag: true,
      sensor: {
        select: {
          sensor_id: true,
          sensor_type: true,
          location_label: true,
        },
      },
    },
  });

const effectiveStatus = getEffectiveDeviceStatus(
  device.status,
  device.last_seen_at
);

const uiStatus = mapDeviceStatusToBadgeStatus(effectiveStatus);
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <Link
          href="/devices"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to devices
        </Link>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-slate-100 p-3 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <Cpu className="h-6 w-6" />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-medium tracking-wide text-slate-500 dark:text-slate-500">
                  Device ID: {device.device_id}
                </p>

                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                  {device.serial_number}
                </h1>

                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {device.device_type}
                </p>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-start">
            <StatusBadge status={uiStatus} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Device overview
            </h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <DetailCard label="Serial number" value={device.serial_number} />
              <DetailCard
                label="Status"
                value={formatEnumLabel(String(device.status))}
              />
              <DetailCard label="Device type" value={device.device_type} />
              <DetailCard
                label="Created at"
                value={formatDateTime(device.created_at)}
              />
              <DetailCard
                label="Location"
                value={device.location_label ?? "Not set"}
              />
              <DetailCard
                label="Last seen"
                value={formatDateTime(device.last_seen_at)}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Recent readings
            </h2>

            {recentReadings.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                No recent readings were found for this device.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {recentReadings.map((reading) => (
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
                          Sensor:{" "}
                          {formatEnumLabel(String(reading.sensor.sensor_type))}
                          {reading.sensor.location_label
                            ? ` • ${reading.sensor.location_label}`
                            : ""}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                          Quality:{" "}
                          {formatEnumLabel(String(reading.quality_flag))}
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

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Recent related alerts
            </h2>

            {device.emergency_events.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                No recent alerts were found for this device.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {device.emergency_events.map((event) => (
                  <Link
                    key={event.event_id}
                    href={`/alerts/${event.event_id}`}
                    className="block"
                  >
                    <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:shadow-sm dark:border-slate-800 dark:bg-slate-950">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {event.title?.trim() ||
                              formatEnumLabel(String(event.event_type))}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                            Severity: {formatEnumLabel(String(event.severity))}{" "}
                            • Status: {formatEnumLabel(String(event.status))}
                          </p>
                          {event.description ? (
                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                              {event.description}
                            </p>
                          ) : null}
                        </div>

                        <div className="text-xs text-slate-500 dark:text-slate-500">
                          {formatDateTime(event.started_at)}
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {canManageDevice ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <DeviceStatusAction
                deviceId={device.device_id}
                currentStatus={device.status}
              />
            </div>
          ) : null}

          {canManageDevice ? (
            <DeleteDeviceAction deviceId={device.device_id} />
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Context
            </h2>

            <div className="mt-4 space-y-4 text-sm">
              <div className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
                <MapPinned className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    Site
                  </p>
                  <p>{device.site.name}</p>
                  <p className="text-slate-500 dark:text-slate-500">
                    {[
                      device.site.address_line,
                      device.site.city,
                      device.site.country,
                    ]
                      .filter(Boolean)
                      .join(", ") || "No address details"}
                  </p>
                  <p className="text-slate-500 dark:text-slate-500">
                    Status: {formatEnumLabel(String(device.site.status))}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
                <Radio className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    Sensors
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {device.sensors.length} sensor
                    {device.sensors.length === 1 ? "" : "s"}
                  </p>
                  <div className="mt-2 space-y-3">
                    {device.sensors.length === 0 ? (
                      <p className="text-slate-500 dark:text-slate-500">
                        No sensors attached
                      </p>
                    ) : (
                      device.sensors.map((sensor) => (
                        <details
                          key={sensor.sensor_id}
                          className="group rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40"
                        >
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                {formatEnumLabel(String(sensor.sensor_type))}
                              </p>
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {sensor.location_label || "No location label"}{" "}
                                {" • "}
                                {formatEnumLabel(String(sensor.status))}
                                {sensor.is_enabled
                                  ? " • Enabled"
                                  : " • Disabled"}
                              </p>
                            </div>

                            <span className="text-xs text-slate-500 transition group-open:rotate-180 dark:text-slate-400">
                              ▼
                            </span>
                          </summary>

                          <div className="border-t border-slate-200 px-4 py-4 dark:border-slate-800">
                            <SensorSettingsAction
                              sensorId={sensor.sensor_id}
                              sensorTypeLabel={formatEnumLabel(
                                String(sensor.sensor_type),
                              )}
                              initialLocationLabel={sensor.location_label}
                              initialStatus={sensor.status}
                              initialEnabled={sensor.is_enabled}
                            />
                          </div>
                        </details>
                      ))
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    Timestamps
                  </p>
                  <p>Created: {formatDateTime(device.created_at)}</p>
                  <p>Location: {device.location_label ?? "Not set"}</p>
                  <p>Last seen: {formatDateTime(device.last_seen_at)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    Technical ID
                  </p>
                  <p className="break-all">{device.device_id}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
                <Activity className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    Recent activity
                  </p>
                  <p>{recentReadings.length} readings loaded</p>
                  <p>{device.emergency_events.length} recent alerts loaded</p>
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
