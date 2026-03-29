"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function CreateSiteForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    const res = await fetch("/api/sites", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        address_line: addressLine || null,
        city: city || null,
        country: country || null,
      }),
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      setMessage(body?.error ?? "Failed to create site.");
      return;
    }

    setMessage("Site created successfully.");
    setName("");
    setAddressLine("");
    setCity("");
    setCountry("");

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          Add site
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Create a new monitored location.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Site name"
          className={[
            "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition",
            "placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20",
            "dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500",
          ].join(" ")}
          required
        />
        <input
          value={addressLine}
          onChange={(e) => setAddressLine(e.target.value)}
          placeholder="Address line"
          className={[
            "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition",
            "placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20",
            "dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500",
          ].join(" ")}/>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City"
          className={[
            "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition",
            "placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20",
            "dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500",
          ].join(" ")}/>
        <input
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder="Country"
          className={[
            "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition",
            "placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20",
            "dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500",
          ].join(" ")}/>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
        >
        {isPending ? "Creating..." : "Create Site"}
      </button>

      {message ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">{message}</p>
      ) : null}
    </form>
  );
}