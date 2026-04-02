import AlertsPage from "@/app/(app)/alerts/page";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserId } from "@/lib/auth";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    emergencyEvent: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  requireCurrentUserId: jest.fn(),
}));

const mockRequireCurrentUserId = requireCurrentUserId as jest.Mock;
const mockEmergencyEventFindMany = prisma.emergencyEvent.findMany as jest.Mock;

describe("AlertsPage authorization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("blocks unauthenticated access", async () => {
    mockRequireCurrentUserId.mockRejectedValue(new Error("unauthorized"));

    await expect(AlertsPage()).rejects.toThrow("unauthorized");
    expect(mockEmergencyEventFindMany).not.toHaveBeenCalled();
  });

  test("queries only alerts for sites the current user belongs to", async () => {
    mockRequireCurrentUserId.mockResolvedValue("user-1");
    mockEmergencyEventFindMany.mockResolvedValue([
      {
        event_id: "event-1",
        title: "Gas leak",
        event_type: "gas",
        severity: "critical",
        status: "new",
        description: "Dangerous gas level",
        started_at: new Date("2026-03-29T09:00:00.000Z"),
        site: { name: "Factory A" },
        device: { serial_number: "ESP32-001" },
      },
    ]);

    const page = await AlertsPage();

    expect(page).toBeTruthy();
    expect(mockEmergencyEventFindMany).toHaveBeenCalledWith({
      where: {
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
          },
        },
        device: {
          select: {
            serial_number: true,
          },
        },
      },
      orderBy: {
        started_at: "desc",
      },
    });
  });

  test("fails closed when alerts query throws", async () => {
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    mockRequireCurrentUserId.mockResolvedValue("user-1");
    mockEmergencyEventFindMany.mockRejectedValue(new Error("db failed"));

    const page = await AlertsPage();

    expect(page).toBeTruthy();
    expect(mockEmergencyEventFindMany).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});