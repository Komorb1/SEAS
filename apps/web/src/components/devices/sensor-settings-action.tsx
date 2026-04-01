"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SensorStatus = "ok" | "faulty" | "disabled";

type SensorSettingsActionProps = {
  sensorId: string;
  sensorTypeLabel: string;
  initialLocationLabel: string | null;
  initialStatus: SensorStatus;
  initialEnabled: boolean;
  embedded?: boolean;
};

export function SensorSettingsAction({
  sensorId,
  sensorTypeLabel,
  initialLocationLabel,
  initialStatus,
  initialEnabled,
  embedded = false,
}: SensorSettingsActionProps) {
  const router = useRouter();

  const [locationLabel, setLocationLabel] = useState(initialLocationLabel ?? "");
  const [status, setStatus] = useState<SensorStatus>(initialStatus);
  const [isEnabled, setIsEnabled] = useState(initialEnabled);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChanges =
    locationLabel !== (initialLocationLabel ?? "") ||
    status !== initialStatus ||
    isEnabled !== initialEnabled;

  async function onSave() {
    try {
      setPending(true);
      setError(null);

      const res = await fetch(`/api/sensors/${sensorId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          location_label: locationLabel.trim() ? locationLabel.trim() : null,
          status,
          is_enabled: isEnabled,
        }),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Failed to update sensor");
        return;
      }

      router.refresh();
    } catch {
      setError("Failed to update sensor");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className={
        embedded
          ? "p-0"
          : "rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
      }
    >
      <div className="flex flex-col gap-3">
        {!embedded ? (
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {sensorTypeLabel}
            </p>
          </div>
        ) : null}

        <div className="grid gap-3">
          <label className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Location label
            </span>
            <input
              type="text"
              value={locationLabel}
              onChange={(e) => setLocationLabel(e.target.value)}
              disabled={pending}
              placeholder="e.g. Kitchen"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-slate-500"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Status
            </span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as SensorStatus)}
              disabled={pending}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-slate-500"
            >
              <option value="ok">Ok</option>
              <option value="faulty">Faulty</option>
              <option value="disabled">Disabled</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              disabled={pending}
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-700"
            />
            Enabled
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSave}
            disabled={pending || !hasChanges}
            className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {pending ? "Saving..." : "Save changes"}
          </button>

          {!hasChanges && !pending ? (
            <p className="text-xs text-slate-500">No changes</p>
          ) : null}
        </div>

        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}
      </div>
    </div>
  );
}