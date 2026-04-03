"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    async function setupServiceWorker() {
      const hostname = window.location.hostname;
      const isLocalhost =
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "[::1]";

      const shouldRegister =
        process.env.NODE_ENV === "production" || isLocalhost;

      if (!shouldRegister) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();

          await Promise.all(
            registrations.map(async (registration) => {
              await registration.unregister();
            })
          );

          if ("caches" in window) {
            const cacheKeys = await caches.keys();
            await Promise.all(cacheKeys.map((key) => caches.delete(key)));
          }
        } catch (error) {
          console.error("Failed to clean up service workers:", error);
        }

        return;
      }

      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch (error) {
        console.error("SW registration failed:", error);
      }
    }

    void setupServiceWorker();
  }, []);

  return null;
}