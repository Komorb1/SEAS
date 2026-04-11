import { createAlertNotificationsForEvent } from "@/lib/alerts/create-alert-notifications";
import { prisma } from "@/lib/prisma";
import { sendWebPushNotification } from "@/lib/web-push/web-push";
import { isExpiredPushSubscriptionError } from "@/lib/web-push/web-push-errors";
import { toWebPushSubscription } from "@/lib/web-push/push-subscription";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    emergencyEvent: {
      findUnique: jest.fn(),
    },
    siteUser: {
      findMany: jest.fn(),
    },
    pushSubscription: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    alertNotification: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/web-push/web-push", () => ({
  sendWebPushNotification: jest.fn(),
}));

jest.mock("@/lib/web-push/web-push-errors", () => ({
  isExpiredPushSubscriptionError: jest.fn(),
}));

jest.mock("@/lib/web-push/push-subscription", () => ({
  toWebPushSubscription: jest.fn(),
}));

const mockEmergencyEventFindUnique = prisma.emergencyEvent.findUnique as jest.Mock;
const mockSiteUserFindMany = prisma.siteUser.findMany as jest.Mock;
const mockPushSubscriptionFindMany = prisma.pushSubscription.findMany as jest.Mock;
const mockPushSubscriptionUpdate = prisma.pushSubscription.update as jest.Mock;
const mockAlertNotificationFindFirst = prisma.alertNotification.findFirst as jest.Mock;
const mockAlertNotificationCreate = prisma.alertNotification.create as jest.Mock;
const mockAlertNotificationUpdate = prisma.alertNotification.update as jest.Mock;

const sendWebPushNotificationMock = sendWebPushNotification as jest.Mock;
const isExpiredPushSubscriptionErrorMock =
  isExpiredPushSubscriptionError as jest.Mock;
const toWebPushSubscriptionMock = toWebPushSubscription as jest.Mock;

describe("createAlertNotificationsForEvent", () => {
  const baseEvent = {
    event_id: "event-1",
    site_id: "site-1",
    device_id: "device-1",
    event_type: "gas_leak",
    severity: "critical",
    title: null,
    description: "Dangerous gas level detected",
    created_at: new Date("2026-03-25T12:00:00.000Z"),
    site: {
      name: "Factory A",
    },
    device: {
      serial_number: "ESP32-001",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    toWebPushSubscriptionMock.mockImplementation((subscription) => ({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh_key,
        auth: subscription.auth_key,
      },
    }));

    isExpiredPushSubscriptionErrorMock.mockReturnValue(false);
  });

  it("returns zeros when no site users are found", async () => {
    mockEmergencyEventFindUnique.mockResolvedValue(baseEvent);
    mockSiteUserFindMany.mockResolvedValue([]);

    const result = await createAlertNotificationsForEvent({
      eventId: "event-1",
      siteId: "site-1",
    });

    expect(result).toEqual({
      created: 0,
      delivered: 0,
      failed: 0,
    });

    expect(mockPushSubscriptionFindMany).not.toHaveBeenCalled();
    expect(mockAlertNotificationCreate).not.toHaveBeenCalled();
    expect(sendWebPushNotificationMock).not.toHaveBeenCalled();
  });

  it("throws when event is not found", async () => {
    mockEmergencyEventFindUnique.mockResolvedValue(null);

    await expect(
      createAlertNotificationsForEvent({
        eventId: "missing-event",
        siteId: "site-1",
      })
    ).rejects.toThrow("event_not_found");
  });

  it("creates queued notifications for owner/admin users and does not send push for non-critical events", async () => {
    mockEmergencyEventFindUnique.mockResolvedValue({
      ...baseEvent,
      severity: "high",
    });

    mockSiteUserFindMany.mockResolvedValue([
      { user_id: "user-1" },
      { user_id: "user-2" },
    ]);

    mockPushSubscriptionFindMany.mockResolvedValue([]);

    mockAlertNotificationFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    mockAlertNotificationCreate
      .mockResolvedValueOnce({ alert_id: "alert-1" })
      .mockResolvedValueOnce({ alert_id: "alert-2" });

    const result = await createAlertNotificationsForEvent({
      eventId: "event-1",
      siteId: "site-1",
    });

    expect(result).toEqual({
      created: 2,
      delivered: 0,
      failed: 0,
    });

    expect(mockAlertNotificationCreate).toHaveBeenCalledTimes(2);
    expect(sendWebPushNotificationMock).not.toHaveBeenCalled();
    expect(mockAlertNotificationUpdate).not.toHaveBeenCalled();
  });

  it("sends push notifications for critical events and marks the alert as sent", async () => {
    mockEmergencyEventFindUnique.mockResolvedValue(baseEvent);

    mockSiteUserFindMany.mockResolvedValue([{ user_id: "user-1" }]);

    mockPushSubscriptionFindMany.mockResolvedValue([
      {
        subscription_id: "sub-1",
        user_id: "user-1",
        endpoint: "https://push.example/sub-1",
        p256dh_key: "p256dh-key",
        auth_key: "auth-key",
      },
    ]);

    mockAlertNotificationFindFirst.mockResolvedValue(null);
    mockAlertNotificationCreate.mockResolvedValue({ alert_id: "alert-1" });

    sendWebPushNotificationMock.mockResolvedValue(undefined);

    const result = await createAlertNotificationsForEvent({
      eventId: "event-1",
      siteId: "site-1",
    });

    expect(result).toEqual({
      created: 1,
      delivered: 1,
      failed: 0,
    });

    expect(toWebPushSubscriptionMock).toHaveBeenCalledWith({
      subscription_id: "sub-1",
      user_id: "user-1",
      endpoint: "https://push.example/sub-1",
      p256dh_key: "p256dh-key",
      auth_key: "auth-key",
    });

    expect(sendWebPushNotificationMock).toHaveBeenCalledTimes(1);
    expect(sendWebPushNotificationMock).toHaveBeenCalledWith(
      {
        endpoint: "https://push.example/sub-1",
        keys: {
          p256dh: "p256dh-key",
          auth: "auth-key",
        },
      },
      {
        title: "Critical Gas Leak Alert",
        body: "Factory A • ESP32-001 • Dangerous gas level detected",
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-192x192.png",
        renotify: true,
        requireInteraction: true,
        silent: false,
        tag: "event-event-1",
        data: {
          url: "/alerts/event-1",
          alertId: "alert-1",
          eventId: "event-1",
          siteId: "site-1",
          deviceId: "device-1",
          severity: "critical",
          eventType: "gas_leak",
          timestamp: "2026-03-25T12:00:00.000Z",
        },
        vibrate: [500, 250, 500, 250, 500, 250, 500],
      }
    );

    expect(mockAlertNotificationUpdate).toHaveBeenCalledWith({
      where: { alert_id: "alert-1" },
      data: { status: "sent" },
    });
  });

  it("keeps the notification queued when a critical event has no active subscriptions", async () => {
    mockEmergencyEventFindUnique.mockResolvedValue(baseEvent);
    mockSiteUserFindMany.mockResolvedValue([{ user_id: "user-1" }]);
    mockPushSubscriptionFindMany.mockResolvedValue([]);
    mockAlertNotificationFindFirst.mockResolvedValue(null);
    mockAlertNotificationCreate.mockResolvedValue({ alert_id: "alert-1" });

    const result = await createAlertNotificationsForEvent({
      eventId: "event-1",
      siteId: "site-1",
    });

    expect(result).toEqual({
      created: 1,
      delivered: 0,
      failed: 0,
    });

    expect(sendWebPushNotificationMock).not.toHaveBeenCalled();
    expect(mockAlertNotificationUpdate).not.toHaveBeenCalled();
  });

  it("revokes expired subscriptions and marks the alert as failed when delivery fails", async () => {
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    mockEmergencyEventFindUnique.mockResolvedValue(baseEvent);
    mockSiteUserFindMany.mockResolvedValue([{ user_id: "user-1" }]);
    mockPushSubscriptionFindMany.mockResolvedValue([
      {
        subscription_id: "sub-1",
        user_id: "user-1",
        endpoint: "https://push.example/sub-1",
        p256dh_key: "p256dh-key",
        auth_key: "auth-key",
      },
    ]);
    mockAlertNotificationFindFirst.mockResolvedValue(null);
    mockAlertNotificationCreate.mockResolvedValue({ alert_id: "alert-1" });

    const pushError = Object.assign(new Error("gone"), {
      statusCode: 410,
    });

    sendWebPushNotificationMock.mockRejectedValue(pushError);
    isExpiredPushSubscriptionErrorMock.mockReturnValue(true);

    const result = await createAlertNotificationsForEvent({
      eventId: "event-1",
      siteId: "site-1",
    });

    expect(result).toEqual({
      created: 1,
      delivered: 0,
      failed: 1,
    });

    expect(mockPushSubscriptionUpdate).toHaveBeenCalledWith({
      where: { subscription_id: "sub-1" },
      data: {
        is_active: false,
        revoked_at: expect.any(Date),
      },
    });

    expect(mockAlertNotificationUpdate).toHaveBeenCalledWith({
      where: { alert_id: "alert-1" },
      data: { status: "failed" },
    });

    consoleErrorSpy.mockRestore();
  });
});