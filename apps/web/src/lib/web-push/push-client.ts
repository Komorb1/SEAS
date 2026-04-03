function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function registerPushServiceWorker() {
  const existing = await navigator.serviceWorker.getRegistration("/sw.js");
  if (existing) return existing;

  return navigator.serviceWorker.register("/sw.js");
}

export async function fetchPushPublicKey(): Promise<string> {
  const res = await fetch("/api/push/public-key", {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to load push public key");
  }

  const data = (await res.json()) as { publicKey?: string };

  if (!data.publicKey) {
    throw new Error("Missing push public key");
  }

  return data.publicKey;
}

export async function subscribeBrowserToPush(deviceLabel?: string | null) {
  await registerPushServiceWorker();

  const registration = await navigator.serviceWorker.ready;
  const publicKey = await fetchPushPublicKey();

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const subscriptionJson = subscription.toJSON();

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscriptionJson.keys?.p256dh,
        auth: subscriptionJson.keys?.auth,
      },
      device_label: deviceLabel ?? null,
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to save browser push subscription");
  }

  return subscription;
}

export async function unsubscribeBrowserFromPush() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    return { ok: true, alreadyUnsubscribed: true };
  }

  const res = await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
    }),
  });

  if (!res.ok && res.status !== 404) {
    throw new Error("Failed to revoke browser push subscription");
  }

  await subscription.unsubscribe();

  return { ok: true, alreadyUnsubscribed: false };
}