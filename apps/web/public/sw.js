const STATIC_CACHE = "seas-static-v13";
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

  // Never interfere with Next.js internals or app/API data
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

  // Cache-first only for static PWA assets
  if (
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/icon.ico" ||
    url.pathname.startsWith("/icons/")
  ) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;

        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(STATIC_CACHE);
          await cache.put(request, response.clone());
        }
        return response;
      })()
    );
    return;
  }

  // For normal page navigations outside protected app pages:
  // network first, offline fallback only
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
  const options = {
    body: data.body || "A critical alert requires your attention.",
    icon: data.icon || "/icons/icon-192x192.png",
    badge: data.badge || "/icons/icon-192x192.png",
    tag: data.tag || "critical-alert",
    data: data.data || {},
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
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