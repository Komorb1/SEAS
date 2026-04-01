export type DeviceStatusValue = "online" | "offline" | "maintenance";

const ONLINE_THRESHOLD_MS = 60_000;

export function getEffectiveDeviceStatus(
  status: DeviceStatusValue,
  lastSeenAt: Date | null
): DeviceStatusValue {
  if (status === "maintenance") {
    return "maintenance";
  }

  if (!lastSeenAt) {
    return "offline";
  }

  const ageMs = Date.now() - new Date(lastSeenAt).getTime();

  return ageMs <= ONLINE_THRESHOLD_MS ? "online" : "offline";
}