"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

type AlertsAutoRefreshProps = {
  intervalMs?: number;
};

export function AlertsAutoRefresh({
  intervalMs = 5000,
}: AlertsAutoRefreshProps) {
  const router = useRouter();
  const pathname = usePathname();
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (pathname !== "/alerts") {
      return;
    }

    function refreshAlerts() {
      if (inFlightRef.current) {
        return;
      }

      inFlightRef.current = true;
      router.refresh();

      window.setTimeout(() => {
        inFlightRef.current = false;
      }, 1000);
    }

    refreshAlerts();

    const intervalId = window.setInterval(refreshAlerts, intervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [intervalMs, pathname, router]);

  return null;
}