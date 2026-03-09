export default function SitesPage() {
  const sites = [
    { id: "SITE-001", name: "Main Warehouse", location: "Istanbul", devices: 8 },
    { id: "SITE-002", name: "Office Building", location: "Kadikoy", devices: 6 },
    { id: "SITE-003", name: "Parking Area", location: "Besiktas", devices: 4 },
  ];

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Sites
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Manage monitored locations connected to the system.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sites.map((site) => (
          <div
            key={site.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <p className="text-xs text-slate-500 dark:text-slate-500">{site.id}</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
              {site.name}
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {site.location}
            </p>
            <p className="mt-4 text-sm text-slate-700 dark:text-slate-300">
              Devices connected: {site.devices}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}