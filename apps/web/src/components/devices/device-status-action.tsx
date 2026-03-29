"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type DeviceStatus = "online" | "offline" | "maintenance";

type Props = {
  deviceId: string;
  currentStatus: DeviceStatus;
};

export function DeviceStatusAction({ deviceId, currentStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<DeviceStatus>(currentStatus);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function updateStatus(nextStatus: DeviceStatus) {
    setMessage(null);

    const res = await fetch(`/api/devices/${deviceId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      setMessage(body?.error ?? "Failed to update device status.");
      return;
    }

    setStatus(nextStatus);
    setMessage(
      nextStatus === "maintenance"
        ? "Device set to maintenance mode."
        : "Maintenance mode cleared."
    );

    startTransition(() => {
      router.refresh();
    });
  }

  const isMaintenance = status === "maintenance";

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Actions
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Manage maintenance mode for this device.
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Connectivity status is determined by device activity.
        </p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Current status: <span className="font-medium">{status}</span>
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {!isMaintenance ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => updateStatus("maintenance")}
            className="rounded-xl border border-amber-200 px-3 py-2.5 text-sm font-medium text-amber-700 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50 hover:shadow-md active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-900/40 dark:text-amber-300 dark:hover:border-amber-800 dark:hover:bg-amber-950/30"
          >
            Set Maintenance
          </button>
        ) : (
          <button
            type="button"
            disabled={isPending}
            onClick={() => updateStatus("offline")}
            className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 hover:shadow-md active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
          >
            Clear Maintenance
          </button>
        )}
      </div>

      {message ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">{message}</p>
      ) : null}
    </div>
  );
}