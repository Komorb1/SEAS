"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  siteId: string;
};

export function RegisterDeviceForm({ siteId }: Props) {
  const router = useRouter();
  const [serialNumber, setSerialNumber] = useState("");
  const [deviceType, setDeviceType] = useState("esp32");
  const [locationLabel, setLocationLabel] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [deviceSecret, setDeviceSecret] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setDeviceSecret(null);

    const res = await fetch(`/api/sites/${siteId}/devices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        serial_number: serialNumber,
        device_type: deviceType,
        location_label: locationLabel || null,
      }),
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      setMessage(body?.error ?? "Failed to register device.");
      return;
    }

    setMessage("Device registered successfully.");
    setDeviceSecret(body?.device_secret ?? null);
    setSerialNumber("");
    setDeviceType("esp32");
    setLocationLabel("");

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          Register device
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Add a new device to this site.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={serialNumber}
          onChange={(e) => setSerialNumber(e.target.value)}
          placeholder="Serial number"
          className={[
            "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition",
            "placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20",
            "dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500",
          ].join(" ")}
          required
        />
        <input
          value={deviceType}
          onChange={(e) => setDeviceType(e.target.value)}
          placeholder="Device type"
          className={[
            "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition",
            "placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20",
            "dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500",
          ].join(" ")}
          required
        />
      </div>

      <input
        value={locationLabel}
        onChange={(e) => setLocationLabel(e.target.value)}
        placeholder="Location in site (e.g. Main entrance, Lobby ceiling)"
        className={[
          "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition",
          "placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20",
          "dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500",
        ].join(" ")}
        />

      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-md active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-400"
      >
        {isPending ? "Registering..." : "Register Device"}
      </button>

      {message ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">{message}</p>
      ) : null}

      {deviceSecret ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          <p className="font-semibold">Device secret</p>
          <p className="mt-1 break-all">{deviceSecret}</p>
          <p className="mt-2 text-xs">Copy this now. It is only shown once.</p>
        </div>
      ) : null}
    </form>
  );
}