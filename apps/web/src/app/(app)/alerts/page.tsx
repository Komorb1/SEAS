import { StatusBadge } from "@/components/ui/status-badge";

const alerts = [
  {
    id: "ALERT-101",
    site: "Main Warehouse",
    type: "Smoke Detected",
    severity: "critical" as const,
    time: "2026-03-09 14:20",
  },
  {
    id: "ALERT-102",
    site: "Office Building",
    type: "Motion Detected",
    severity: "warning" as const,
    time: "2026-03-09 13:05",
  },
  {
    id: "ALERT-103",
    site: "Parking Area",
    type: "Heartbeat Restored",
    severity: "online" as const,
    time: "2026-03-09 12:10",
  },
];

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Alerts
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Review emergency events and system-triggered warnings.
        </p>
      </section>

      <section className="space-y-4">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-500">
                  {alert.id}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                  {alert.type}
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {alert.site}
                </p>
              </div>

              <div className="flex flex-col items-start gap-2 sm:items-end">
                <StatusBadge status={alert.severity} />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {alert.time}
                </p>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}