"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  siteId: string;
  currentStatus: "active" | "inactive";
};

export function SiteStatusAction({ siteId, currentStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function updateStatus(nextStatus: "active" | "inactive") {
    setMessage(null);

    const res = await fetch(`/api/sites/${siteId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      setMessage(body?.error ?? "Failed to update site status.");
      return;
    }

    setStatus(nextStatus);
    setMessage("Site status updated successfully.");

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          Site status
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Current status: <span className="font-medium">{status}</span>
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending || status === "active"}
          onClick={() => updateStatus("active")}
          className="rounded-xl border border-emerald-200 px-3 py-2.5 text-sm font-medium text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-md active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-900/40 dark:text-emerald-300 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/30"
        >
          Mark Active
        </button>

        <button
          type="button"
          disabled={isPending || status === "inactive"}
          onClick={() => updateStatus("inactive")}
          className="rounded-xl border border-amber-200 px-3 py-2.5 text-sm font-medium text-amber-700 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50 hover:shadow-md active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-900/40 dark:text-amber-300 dark:hover:border-amber-800 dark:hover:bg-amber-950/30"
        >
          Mark Inactive
        </button>
      </div>

      {message ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">{message}</p>
      ) : null}
    </div>
  );
}