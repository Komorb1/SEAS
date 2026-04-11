const STATIC_CACHE = "seas-static-v16"; // Bumped version to force an update
const OFFLINE_URL = "/offline.html";

const STATIC_ASSETS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icon.ico",
  "/icons/icon-48x48.png",
  "/icons/icon-72x72.png",
  "/icons/icon-96x96.png",
  "/icons/icon-128x128.png",
  "/icons/icon-144x144.png",
  "/icons/icon-152x152.png",
  "/icons/icon-192x192.png",
  "/icons/icon-256x256.png",
  "/icons/icon-384x384.png",
  "/icons/icon-512x512.png",
  "/alarm.mp3"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/dashboard") ||
    url.pathname.startsWith("/alerts") ||
    url.pathname.startsWith("/devices") ||
    url.pathname.startsWith("/sites") ||
    url.pathname.startsWith("/profile") ||
    url.pathname.startsWith("/audit-logs") ||
    url.pathname.startsWith("/readings")
  ) {
    return;
  }

  if (
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/icon.ico" ||
    url.pathname === "/alarm.mp3" ||
    url.pathname.startsWith("/icons/")
  ) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;

        const response = await fetch(request);
        
        // FIX: Only cache full 200 OK responses. Ignore 206 Partial Content.
        if (response.status === 200) {
          const cache = await caches.open(STATIC_CACHE);
          await cache.put(request, response.clone());
        }
        return response;
      })()
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cachedOffline = await caches.match(OFFLINE_URL);
          if (cachedOffline) return cachedOffline;

          return new Response(
            "<!doctype html><html><body><h1>Offline</h1><p>You appear to be offline.</p></body></html>",
            {
              status: 200,
              headers: { "Content-Type": "text/html; charset=utf-8" },
            }
          );
        }
      })()
    );
  }
});

self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || "Critical Alert";
  const isCritical = data.data?.severity === "critical";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const hasOpenClients = clientList.length > 0;
      const isFocused = clientList.some((client) => client.visibilityState === "visible");

      // 1. Send the alarm trigger to ALL open instances (even background tabs)
      if (hasOpenClients && isCritical) {
        clientList.forEach((client) => {
          client.postMessage({
            type: "PLAY_NATIVE_ALARM",
            payload: data,
          });
        });
      }

      // 2. Only show the OS notification if the app is NOT actively focused
      if (!isFocused) {
        const options = {
          body: data.body || "A critical alert requires your attention.",
          icon: data.icon || "/icons/icon-192x192.png",
          badge: data.badge || "/icons/icon-192x192.png",
          tag: data.tag || "critical-alert",
          data: data.data || {},
          renotify: true,
          requireInteraction: isCritical,
          vibrate: isCritical ? [500, 250, 500, 250, 500, 250, 500, 250, 1000] : undefined,
          silent: false // Explicitly request the OS to play its default notification sound
        };

        return self.registration.showNotification(title, options);
      }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/alerts";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            try {
              client.navigate(targetUrl);
            } catch {}

            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }

        return Promise.resolve();
      })
  );
});