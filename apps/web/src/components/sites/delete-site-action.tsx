"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  siteId: string;
  siteName: string;
};

export function DeleteSiteAction({ siteId, siteName }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete site "${siteName}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setMessage(null);

    const res = await fetch(`/api/sites/${siteId}`, {
      method: "DELETE",
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      setMessage(body?.error ?? "Failed to delete site.");
      return;
    }

    startTransition(() => {
      router.push("/sites");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 border-t border-slate-200 pt-5 dark:border-slate-800">
      <div>
        <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">
          Danger zone
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Permanently remove this site.
        </p>
      </div>

      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700 shadow-sm transition hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-50 hover:shadow-md active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/40 dark:text-red-300 dark:hover:border-red-800 dark:hover:bg-red-950/30"
        >
        {isPending ? "Deleting..." : "Delete Site"}
      </button>

      {message ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">{message}</p>
      ) : null}
    </div>
  );
}