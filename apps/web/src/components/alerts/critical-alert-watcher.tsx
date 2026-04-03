"use client";

import Link from "next/link";
import { ShieldAlert, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type LatestCriticalAlert = {
  event_id: string;
  event_type: string;
  severity: string;
  started_at: string;
  status: string;
  site?: {
    name: string;
  } | null;
  device?: {
    serial_number: string;
  } | null;
};

function formatEnumLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function CriticalAlertWatcher() {
  const pathname = usePathname();
  const isAlertsRoute =
    pathname === "/alerts" || pathname.startsWith("/alerts/");

  const [alert, setAlert] = useState<LatestCriticalAlert | null>(null);
  const [dismissedAlertId, setDismissedAlertId] = useState<string | null>(null);

  const seenAlertIdRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (isAlertsRoute) {
      return;
    }

    let cancelled = false;

    async function checkLatestCriticalAlert() {
      try {
        const response = await fetch("/api/alerts/latest-critical", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });

        if (cancelled) return;

        if (response.status === 401) {
          setAlert(null);
          return;
        }

        if (!response.ok) return;

        const data = (await response.json()) as {
          alert: LatestCriticalAlert | null;
        };

        const nextAlert = data.alert;

        if (!initializedRef.current) {
          initializedRef.current = true;
          seenAlertIdRef.current = nextAlert?.event_id ?? null;
          return;
        }

        if (!nextAlert) {
          seenAlertIdRef.current = null;
          setAlert(null);
          return;
        }

        if (
          nextAlert.event_id !== seenAlertIdRef.current &&
          nextAlert.event_id !== dismissedAlertId
        ) {
          seenAlertIdRef.current = nextAlert.event_id;
          setAlert(nextAlert);

          if (
            typeof window !== "undefined" &&
            "navigator" in window &&
            "vibrate" in navigator
          ) {
            navigator.vibrate?.([300, 150, 300]);
          }
        }
      } catch (error) {
        console.error("Critical alert watcher failed:", error);
      }
    }

    checkLatestCriticalAlert();
    const intervalId = window.setInterval(checkLatestCriticalAlert, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [dismissedAlertId, isAlertsRoute]);

  if (!alert || isAlertsRoute) return null;

  return (
    <div className="fixed inset-x-4 top-4 z-[100] mx-auto w-full max-w-xl rounded-2xl border border-red-300 bg-red-50 p-4 shadow-lg dark:border-red-900/50 dark:bg-red-950/90">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-red-100 p-2 text-red-700 dark:bg-red-900/60 dark:text-red-300">
          <ShieldAlert className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-red-900 dark:text-red-100">
            Critical Alert Detected
          </p>

          <p className="mt-1 text-sm text-red-800 dark:text-red-200">
            {formatEnumLabel(alert.event_type)} alert
            {alert.device?.serial_number
              ? ` from ${alert.device.serial_number}`
              : ""}
            {alert.site?.name ? ` at ${alert.site.name}` : ""}.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/alerts/${alert.event_id}`}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700"
            >
              View alert
            </Link>

            <Link
              href="/alerts"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 bg-white px-4 text-sm font-medium text-red-800 transition hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-200 dark:hover:bg-red-900/60"
            >
              Open alerts
            </Link>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setDismissedAlertId(alert.event_id);
            setAlert(null);
          }}
          className="rounded-lg p-1 text-red-700 transition hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-900/60"
          aria-label="Dismiss critical alert notification"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}