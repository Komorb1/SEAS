import Link from "next/link";

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
};

export function PaginationControls({
  page,
  totalPages,
  buildHref,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-5">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Page {page} of {totalPages}
      </p>

      <div className="flex items-center gap-2">
        <Link
          href={buildHref(Math.max(1, page - 1))}
          aria-disabled={page <= 1}
          className={[
            "inline-flex h-9 items-center justify-center rounded-lg border px-3 text-sm font-medium transition",
            page <= 1
              ? "pointer-events-none border-slate-200 text-slate-400 dark:border-slate-800 dark:text-slate-600"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800",
          ].join(" ")}
        >
          Previous
        </Link>

        <Link
          href={buildHref(Math.min(totalPages, page + 1))}
          aria-disabled={page >= totalPages}
          className={[
            "inline-flex h-9 items-center justify-center rounded-lg border px-3 text-sm font-medium transition",
            page >= totalPages
              ? "pointer-events-none border-slate-200 text-slate-400 dark:border-slate-800 dark:text-slate-600"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800",
          ].join(" ")}
        >
          Next
        </Link>
      </div>
    </div>
  );
}