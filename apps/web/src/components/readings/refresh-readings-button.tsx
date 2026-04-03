"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

type RefreshReadingsButtonProps = {
  lastUpdatedLabel: string;
};

export function RefreshReadingsButton({
  lastUpdatedLabel,
}: RefreshReadingsButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lastUpdated, setLastUpdated] = useState(lastUpdatedLabel);

  function handleRefresh() {
    startTransition(() => {
      router.refresh();
      setLastUpdated(
        new Intl.DateTimeFormat("en-GB", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Europe/Istanbul",
        }).format(new Date())
      );
    });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Last updated: <span className="font-medium">{lastUpdated}</span>
      </p>

      <button
        type="button"
        onClick={handleRefresh}
        disabled={isPending}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
        {isPending ? "Refreshing..." : "Refresh readings"}
      </button>
    </div>
  );
}