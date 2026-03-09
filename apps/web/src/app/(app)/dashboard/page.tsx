import { TriangleAlert, Router, MapPinned, ShieldCheck } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";

const recentAlerts = [
  {
    id: "ALT-001",
    site: "Main Warehouse",
    device: "Smoke Sensor A1",
    status: "critical" as const,
    time: "2026-03-09 14:20",
  },
  {
    id: "ALT-002",
    site: "Office Building",
    device: "Motion Sensor B3",
    status: "warning" as const,
    time: "2026-03-09 13:05",
  },
  {
    id: "ALT-003",
    site: "Parking Area",
    device: "Gate Device C2",
    status: "online" as const,
    time: "2026-03-09 12:10",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
        <p className="mt-1 text-sm text-slate-400">
          Overview of sites, devices, and emergency activity.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Sites"
          value={8}
          description="Connected monitored locations"
          icon={<MapPinned className="h-5 w-5" />}
        />
        <StatCard
          title="Total Devices"
          value={24}
          description="Registered field devices"
          icon={<Router className="h-5 w-5" />}
        />
        <StatCard
          title="Active Alerts"
          value={3}
          description="Currently open emergency events"
          icon={<TriangleAlert className="h-5 w-5" />}
        />
        <StatCard
          title="System Health"
          value="Stable"
          description="Most devices reporting normally"
          icon={<ShieldCheck className="h-5 w-5" />}
        />
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 px-5 py-4">
          <h3 className="text-lg font-semibold">Recent Events</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-950/40 text-left text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">Alert ID</th>
                <th className="px-5 py-3 font-medium">Site</th>
                <th className="px-5 py-3 font-medium">Device</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {recentAlerts.map((alert) => (
                <tr key={alert.id} className="border-t border-slate-800">
                  <td className="px-5 py-4 font-medium text-white">{alert.id}</td>
                  <td className="px-5 py-4 text-slate-300">{alert.site}</td>
                  <td className="px-5 py-4 text-slate-300">{alert.device}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={alert.status} />
                  </td>
                  <td className="px-5 py-4 text-slate-400">{alert.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}