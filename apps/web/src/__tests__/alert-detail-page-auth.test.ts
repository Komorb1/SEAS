import AlertDetailPage from "@/app/(app)/alerts/[alertId]/page";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserId } from "@/lib/auth";
import { notFound } from "next/navigation";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    emergencyEvent: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  requireCurrentUserId: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  notFound: jest.fn(),
}));

const mockRequireCurrentUserId = requireCurrentUserId as jest.Mock;
const mockEmergencyEventFindFirst = prisma.emergencyEvent.findFirst as jest.Mock;
const mockNotFound = notFound as jest.MockedFunction<typeof notFound>;

describe("AlertDetailPage authorization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNotFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
  });

  test("blocks unauthenticated access", async () => {
    mockRequireCurrentUserId.mockRejectedValue(new Error("unauthorized"));

    await expect(
      AlertDetailPage({
        params: Promise.resolve({ alertId: "event-1" }),
      })
    ).rejects.toThrow("unauthorized");

    expect(mockEmergencyEventFindFirst).not.toHaveBeenCalled();
  });

  test("queries alert by id and current user site membership", async () => {
    mockRequireCurrentUserId.mockResolvedValue("user-1");
    mockEmergencyEventFindFirst.mockResolvedValue({
      event_id: "event-1",
      severity: "critical",
      title: "Critical Gas Leak Alert",
      event_type: "gas",
      status: "new",
      started_at: new Date("2026-03-29T09:00:00.000Z"),
      acknowledged_at: null,
      resolved_at: null,
      description: "Dangerous gas level detected",
      created_at: new Date("2026-03-29T09:00:00.000Z"),
      site: {
        name: "Factory A",
        address_line: null,
        city: null,
        country: null,
        status: "active",
      },
      device: null,
      sensor: null,
      alert_notifications: [],
      readings: [],
    });

    const page = await AlertDetailPage({
      params: Promise.resolve({ alertId: "event-1" }),
    });

    expect(page).toBeTruthy();
    expect(mockEmergencyEventFindFirst).toHaveBeenCalledWith({
      where: {
        event_id: "event-1",
        site: {
          site_users: {
            some: {
              user_id: "user-1",
            },
          },
        },
      },
      include: {
        site: {
          select: {
            name: true,
            address_line: true,
            city: true,
            country: true,
            status: true,
          },
        },
        device: {
          select: {
            device_id: true,
            serial_number: true,
            device_type: true,
            status: true,
            last_seen_at: true,
          },
        },
        sensor: {
          select: {
            sensor_id: true,
            sensor_type: true,
            location_label: true,
            is_enabled: true,
            status: true,
          },
        },
        alert_notifications: {
          orderBy: {
            created_at: "desc",
          },
          select: {
            alert_id: true,
            channel: true,
            status: true,
            sent_at: true,
            delivered_at: true,
            error_message: true,
            created_at: true,
            recipient: {
              select: {
                full_name: true,
                username: true,
                email: true,
              },
            },
          },
        },
        readings: {
          orderBy: {
            received_at: "desc",
          },
          take: 5,
          select: {
            reading_id: true,
            value: true,
            unit: true,
            recorded_at: true,
            received_at: true,
            quality_flag: true,
          },
        },
      },
    });
  });

  test("returns notFound for unauthorized or missing alert", async () => {
    mockRequireCurrentUserId.mockResolvedValue("user-2");
    mockEmergencyEventFindFirst.mockResolvedValue(null);

    await expect(
      AlertDetailPage({
        params: Promise.resolve({ alertId: "event-secret" }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mockNotFound).toHaveBeenCalled();
  });
});