import { prisma } from "@/lib/prisma";
import { sendWebPushNotification } from "@/lib/web-push/web-push";
import { isExpiredPushSubscriptionError } from "@/lib/web-push/web-push-errors";
import { toWebPushSubscription } from "@/lib/web-push/push-subscription";

type CreateAlertNotificationsInput = {
  eventId: string;
  siteId: string;
};

function formatEventTypeLabel(eventType: string) {
  return eventType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export async function createAlertNotificationsForEvent(
  input: CreateAlertNotificationsInput
) {
  const event = await prisma.emergencyEvent.findUnique({
    where: { event_id: input.eventId },
    select: {
      event_id: true,
      site_id: true,
      device_id: true,
      event_type: true,
      severity: true,
      title: true,
      description: true,
      created_at: true,
      site: {
        select: {
          name: true,
        },
      },
      device: {
        select: {
          serial_number: true,
        },
      },
    },
  });

  if (!event) {
    throw new Error("event_not_found");
  }

  const siteUsers = await prisma.siteUser.findMany({
    where: {
      site_id: input.siteId,
      role: { in: ["owner", "admin", "viewer"] },
    },
    select: {
      user_id: true,
    },
  });

  if (siteUsers.length === 0) {
    return { created: 0, delivered: 0, failed: 0 };
  }

  let created = 0;
  let delivered = 0;
  let failed = 0;

  const recipientUserIds = siteUsers.map((siteUser) => siteUser.user_id);

  const activeSubscriptions = await prisma.pushSubscription.findMany({
    where: {
      user_id: { in: recipientUserIds },
      is_active: true,
    },
    select: {
      subscription_id: true,
      user_id: true,
      endpoint: true,
      p256dh_key: true,
      auth_key: true,
    },
  });

  const subscriptionsByUserId = new Map<
    string,
    Array<{
      subscription_id: string;
      user_id: string;
      endpoint: string;
      p256dh_key: string;
      auth_key: string;
    }>
  >();

  for (const subscription of activeSubscriptions) {
    const existing = subscriptionsByUserId.get(subscription.user_id) ?? [];
    existing.push(subscription);
    subscriptionsByUserId.set(subscription.user_id, existing);
  }

  for (const siteUser of siteUsers) {
    let alertNotification = await prisma.alertNotification.findFirst({
      where: {
        event_id: input.eventId,
        recipient_user_id: siteUser.user_id,
        channel: "web_push",
      },
      select: {
        alert_id: true,
      },
    });

    if (!alertNotification) {
      alertNotification = await prisma.alertNotification.create({
        data: {
          event_id: input.eventId,
          recipient_user_id: siteUser.user_id,
          channel: "web_push",
          status: "queued",
        },
        select: {
          alert_id: true,
        },
      });

      created += 1;
    }

    if (event.severity !== "critical") {
      continue;
    }

    const userSubscriptions = subscriptionsByUserId.get(siteUser.user_id) ?? [];

    if (userSubscriptions.length === 0) {
      continue;
    }

    const eventTypeLabel = formatEventTypeLabel(event.event_type);
    const title = event.title?.trim() || `Critical ${eventTypeLabel} Alert`;

    const bodyParts = [
      event.site.name,
      event.device?.serial_number ?? "Unknown device",
      event.description?.trim() || "Critical condition detected",
    ];

    const payload = {
      title,
      body: bodyParts.join(" • "),
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      tag: `event-${event.event_id}`,
      data: {
        url: `/alerts/${event.event_id}`,
        alertId: alertNotification.alert_id,
        eventId: event.event_id,
        siteId: event.site_id,
        deviceId: event.device_id ?? undefined,
        severity: event.severity,
        eventType: event.event_type,
        timestamp: event.created_at.toISOString(),
      },
    };

    let deliveredForUser = false;

    for (const subscription of userSubscriptions) {
      try {
        await sendWebPushNotification(
          toWebPushSubscription(subscription),
          payload
        );

        delivered += 1;
        deliveredForUser = true;
      } catch (error) {
        console.error("Web push delivery failed:", {
          eventId: event.event_id,
          userId: siteUser.user_id,
          subscriptionId: subscription.subscription_id,
          error,
        });

        if (isExpiredPushSubscriptionError(error)) {
          await prisma.pushSubscription.update({
            where: { subscription_id: subscription.subscription_id },
            data: {
              is_active: false,
              revoked_at: new Date(),
            },
          });
        }
      }
    }

    await prisma.alertNotification.update({
      where: { alert_id: alertNotification.alert_id },
      data: {
        status: deliveredForUser ? "sent" : "failed",
      },
    });

    if (!deliveredForUser) {
      failed += 1;
    }
  }

  return { created, delivered, failed };
}