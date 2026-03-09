import { StatusBadge } from "@/components/ui/status-badge";

const devices = [
  {
    id: "DEV-001",
    serial: "SN-AX12",
    site: "Main Warehouse",
    status: "online" as const,
    lastSeen: "2 min ago",
  },
  {
    id: "DEV-002",
    serial: "SN-BX88",
    site: "Office Building",
    status: "warning" as const,
    lastSeen: "5 min ago",
  },
  {
    id: "DEV-003",
    serial: "SN-CZ41",
    site: "Parking Area",
    status: "offline" as const,
    lastSeen: "20 min ago",
  },
];

export default function DevicesPage() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-semibold tracking-tight">Devices</h2>
        <p className="mt-1 text-sm text-slate-400">
          View all registered hardware units and their current status.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-950/40 text-left text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">Device ID</th>
                <th className="px-5 py-3 font-medium">Serial Number</th>
                <th className="px-5 py-3 font-medium">Site</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr key={device.id} className="border-t border-slate-800">
                  <td className="px-5 py-4 font-medium text-white">{device.id}</td>
                  <td className="px-5 py-4 text-slate-300">{device.serial}</td>
                  <td className="px-5 py-4 text-slate-300">{device.site}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={device.status} />
                  </td>
                  <td className="px-5 py-4 text-slate-400">{device.lastSeen}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}