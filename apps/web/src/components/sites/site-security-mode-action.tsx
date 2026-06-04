"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SecurityMode } from "@prisma/client";

type SiteSecurityModeActionProps = {
  siteId: string;
  currentMode: SecurityMode;
};

export function SiteSecurityModeAction({
  siteId,
  currentMode,
}: SiteSecurityModeActionProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isArmed = currentMode === "armed";
  const nextMode: SecurityMode = isArmed ? "disarmed" : "armed";

  async function updateSecurityMode() {
    setIsPending(true);
    setError(null);

    try {
      const res = await fetch(`/api/sites/${siteId}/security-mode`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          security_mode: nextMode,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to update security mode");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update security mode");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="border-t border-slate-200 pt-5 dark:border-slate-800">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
        Security mode
      </h3>

      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Current mode: {isArmed ? "armed" : "disarmed"}
      </p>

      <p className="mt-2 max-w-2xl text-xs text-slate-500 dark:text-slate-400">
        When armed, motion and door activity create intrusion alerts. Flame and
        gas/smoke alerts remain active in both modes.
      </p>

      <button
        type="button"
        onClick={updateSecurityMode}
        disabled={isPending}
        className={
          isArmed
            ? "mt-4 rounded-xl border border-yellow-500/40 px-4 py-2 text-sm font-semibold text-yellow-700 transition hover:bg-yellow-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:text-yellow-300"
            : "mt-4 rounded-xl border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-300"
        }
      >
        {isPending ? "Updating..." : isArmed ? "Disarm Site" : "Arm Site"}
      </button>

      {error ? (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
