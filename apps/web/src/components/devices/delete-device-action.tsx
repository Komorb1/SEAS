"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type DeleteDeviceActionProps = {
  deviceId: string;
};

export function DeleteDeviceAction({
  deviceId,
}: DeleteDeviceActionProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this device? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      setPending(true);
      setError(null);

      const res = await fetch(`/api/devices/${deviceId}`, {
        method: "DELETE",
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Failed to delete device");
        return;
      }

      router.push("/devices");
      router.refresh();
    } catch {
      setError("Failed to delete device");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/40 dark:bg-red-950/20">
      <h2 className="text-lg font-semibold text-red-700 dark:text-red-300">
        Delete device
      </h2>
      <p className="mt-2 text-sm text-red-700/90 dark:text-red-300/90">
        Permanently remove this device if it has no related sensors, readings, or alerts.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Deleting..." : "Delete device"}
        </button>

        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}
      </div>
    </div>
  );
}