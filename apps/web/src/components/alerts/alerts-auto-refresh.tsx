"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

type AlertsAutoRefreshProps = {
  intervalMs?: number;
};

export function AlertsAutoRefresh({
  intervalMs = 5000,
}: AlertsAutoRefreshProps) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/alerts") {
      return;
    }

    function refreshAlerts() {
      if (document.visibilityState !== "visible") {
        return;
      }

      router.refresh();
    }

    const intervalId = window.setInterval(refreshAlerts, intervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [intervalMs, pathname, router]);

  return null;
}