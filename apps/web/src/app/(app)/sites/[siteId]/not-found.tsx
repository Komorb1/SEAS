import Link from "next/link";

export default function SiteNotFound() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4 py-10">
      <div className="mx-auto w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          📍
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Site not found
        </h1>

        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          The site you are looking for does not exist or you do not have access to it.
        </p>

        <div className="mt-6">
          <Link
            href="/sites"
            className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Back to sites
          </Link>
        </div>
      </div>
    </div>
  );
}