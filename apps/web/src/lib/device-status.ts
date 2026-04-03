export type EffectiveDeviceStatus = "online" | "offline" | "maintenance";

const DEVICE_OFFLINE_THRESHOLD_MS = 60 * 1000;

export function getEffectiveDeviceStatus(
  status: "online" | "offline" | "maintenance",
  lastSeenAt: Date | null
): EffectiveDeviceStatus {
  if (status === "maintenance") {
    return "maintenance";
  }

  if (!lastSeenAt) {
    return "offline";
  }

  const lastSeenTime = new Date(lastSeenAt).getTime();

  if (Number.isNaN(lastSeenTime)) {
    return "offline";
  }

  const isStale = Date.now() - lastSeenTime > DEVICE_OFFLINE_THRESHOLD_MS;

  return isStale ? "offline" : "online";
}