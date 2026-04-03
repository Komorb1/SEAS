const STATIC_CACHE = "seas-static-v11";
const PAGE_CACHE = "seas-pages-v11";
const OFFLINE_URL = "/offline.html";

const STATIC_ASSETS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icon.ico",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

const NON_CACHEABLE_PAGE_PREFIXES = [
  "/dashboard",
  "/alerts",
  "/devices",
  "/sites",
  "/profile",
  "/audit-logs",
  "/readings",
];

const NON_CACHEABLE_API_PREFIXES = [
  "/api/auth",
  "/api/alerts",
  "/api/profile",
  "/api/readings",
  "/api/devices",
  "/api/sites",
  "/api/push",
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
        keys
          .filter((key) => key !== STATIC_CACHE && key !== PAGE_CACHE)
          .map((key) => caches.delete(key))
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

  // Never cache auth-sensitive API routes
  if (
    url.pathname.startsWith("/api/") &&
    NON_CACHEABLE_API_PREFIXES.some((path) => url.pathname.startsWith(path))
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // Do not cache authenticated/protected app pages
  if (
    request.mode === "navigate" &&
    NON_CACHEABLE_PAGE_PREFIXES.some((path) => url.pathname.startsWith(path))
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // Page navigations for cacheable pages
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);

          if (response.ok) {
            const cache = await caches.open(PAGE_CACHE);
            await cache.put(request.url, response.clone());
          }

          return response;
        } catch {
          const pageCache = await caches.open(PAGE_CACHE);

          const cachedPage =
            (await pageCache.match(request.url)) ||
            (await pageCache.match(request)) ||
            (await pageCache.match(url.pathname));

          if (cachedPage) return cachedPage;

          const staticCache = await caches.open(STATIC_CACHE);
          const offlinePage =
            (await staticCache.match(OFFLINE_URL)) ||
            (await caches.match(OFFLINE_URL));

          if (offlinePage) return offlinePage;

          return new Response(
            "<!doctype html><html><body><h1>Offline</h1><p>No cached page is available yet.</p></body></html>",
            {
              status: 200,
              headers: { "Content-Type": "text/html; charset=utf-8" },
            }
          );
        }
      })()
    );
    return;
  }

  // Static assets
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/icon.ico"
  ) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;

        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(STATIC_CACHE);
            await cache.put(request, response.clone());
          }
          return response;
        } catch {
          return new Response("", { status: 404 });
        }
      })()
    );
    return;
  }

  // Other API GET requests: network only
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(
          JSON.stringify({
            error: "offline",
            message: "Live data is unavailable while offline.",
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }
        )
      )
    );
    return;
  }

  // Other same-origin GETs
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(STATIC_CACHE);
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        return new Response("", { status: 404 });
      }
    })()
  );
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