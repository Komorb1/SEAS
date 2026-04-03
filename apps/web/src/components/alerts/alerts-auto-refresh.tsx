"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

type AlertsSummary = {
  latestEventId: string | null;
  latestStatus: string | null;
  latestStartedAt: string | null;
  openCount: number;
};

type AlertsAutoRefreshProps = {
  initialSnapshot: string;
  intervalMs?: number;
};

export function AlertsAutoRefresh({
  initialSnapshot,
  intervalMs = 5000,
}: AlertsAutoRefreshProps) {
  const router = useRouter();
  const pathname = usePathname();

  const baselineRef = useRef(initialSnapshot);
  const inFlightRef = useRef(false);
  const lastRefreshAtRef = useRef(0);

  useEffect(() => {
    baselineRef.current = initialSnapshot;
  }, [initialSnapshot]);

  useEffect(() => {
    if (pathname !== "/alerts") {
      return;
    }

    let cancelled = false;

    async function checkAlertsSummary() {
      const now = Date.now();

      if (inFlightRef.current) return;
      if (now - lastRefreshAtRef.current < intervalMs) return;

      inFlightRef.current = true;

      try {
        const response = await fetch("/api/alerts/summary", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });

        if (cancelled) return;
        if (response.status === 401) return;
        if (!response.ok) return;

        const data = (await response.json()) as AlertsSummary;
        const nextSnapshot = JSON.stringify(data);

        if (baselineRef.current !== nextSnapshot) {
          baselineRef.current = nextSnapshot;
          lastRefreshAtRef.current = now;
          router.refresh();
        }
      } catch (error) {
        console.error("Alerts auto-refresh failed:", error);
      } finally {
        inFlightRef.current = false;
      }
    }

    const intervalId = window.setInterval(checkAlertsSummary, intervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [intervalMs, pathname, router]);

  return null;
}