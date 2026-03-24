"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AlertStatus = "new" | "acknowledged" | "resolved" | "false_alarm";

type AlertStatusActionsProps = {
  alertId: string;
  status: AlertStatus;
};

export function AlertStatusActions({
  alertId,
  status,
}: AlertStatusActionsProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<
    "acknowledge" | "resolve" | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const canAcknowledge = status === "new";
  const canResolve = status === "new" || status === "acknowledged";

  async function runAction(action: "acknowledge" | "resolve") {
    try {
      setPendingAction(action);
      setError(null);

      const res = await fetch(`/api/alerts/${alertId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }

      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => runAction("acknowledge")}
          disabled={!canAcknowledge || pendingAction !== null}
          className="inline-flex items-center rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:text-amber-400"
        >
          {pendingAction === "acknowledge" ? "Acknowledging..." : "Acknowledge"}
        </button>

        <button
          type="button"
          onClick={() => runAction("resolve")}
          disabled={!canResolve || pendingAction !== null}
          className="inline-flex items-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-400"
        >
          {pendingAction === "resolve" ? "Resolving..." : "Resolve"}
        </button>
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}