export function Topbar() {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 px-6 py-4 backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Smart Emergency Alert System</h1>
          <p className="text-sm text-slate-400">
            Monitor sites, devices, and emergency events
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300">
          Admin
        </div>
      </div>
    </header>
  );
}