import Link from "next/link";

export default function DeviceNotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-2xl flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
        Device not found
      </h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        This device does not exist or you do not have access to it.
      </p>
      <Link
        href="/devices"
        className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
      >
        Back to devices
      </Link>
    </div>
  );
}