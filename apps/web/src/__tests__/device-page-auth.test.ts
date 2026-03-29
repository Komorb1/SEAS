import DeviceDetailPage from "@/app/(app)/devices/[deviceId]/page";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserId } from "@/lib/auth";
import { notFound } from "next/navigation";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    device: {
      findFirst: jest.fn(),
    },
    sensorReading: {
      findMany: jest.fn(),
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
const mockDeviceFindFirst = prisma.device.findFirst as jest.Mock;
const mockSensorReadingFindMany = prisma.sensorReading.findMany as jest.Mock;
const mockNotFound = notFound as jest.MockedFunction<typeof notFound>;

describe("DeviceDetailPage authorization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNotFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
  });

  test("blocks unauthenticated access", async () => {
    mockRequireCurrentUserId.mockRejectedValue(new Error("unauthorized"));

    await expect(
      DeviceDetailPage({
        params: Promise.resolve({ deviceId: "device-1" }),
      })
    ).rejects.toThrow("unauthorized");

    expect(mockDeviceFindFirst).not.toHaveBeenCalled();
    expect(mockSensorReadingFindMany).not.toHaveBeenCalled();
  });

  test("queries device using both device id and membership scope", async () => {
    mockRequireCurrentUserId.mockResolvedValue("user-1");

    mockDeviceFindFirst.mockResolvedValue({
      device_id: "device-1",
      serial_number: "ESP32-001",
      device_type: "esp32",
      status: "online",
      created_at: new Date("2026-03-29T08:00:00.000Z"),
      installed_at: null,
      last_seen_at: null,
      site: {
        site_id: "site-1",
        name: "Factory A",
        address_line: null,
        city: null,
        country: null,
        status: "active",
      },
      sensors: [],
      emergency_events: [],
    });

    mockSensorReadingFindMany.mockResolvedValue([]);

    const page = await DeviceDetailPage({
      params: Promise.resolve({ deviceId: "device-1" }),
    });

    expect(page).toBeTruthy();

    expect(mockDeviceFindFirst).toHaveBeenCalledWith({
      where: {
        device_id: "device-1",
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
            site_id: true,
            name: true,
            address_line: true,
            city: true,
            country: true,
            status: true,
          },
        },
        sensors: {
          select: {
            sensor_id: true,
            sensor_type: true,
            location_label: true,
            status: true,
            is_enabled: true,
          },
        },
        emergency_events: {
          orderBy: {
            started_at: "desc",
          },
          take: 5,
          select: {
            event_id: true,
            event_type: true,
            severity: true,
            status: true,
            title: true,
            description: true,
            started_at: true,
          },
        },
      },
    });

    expect(mockSensorReadingFindMany).toHaveBeenCalledWith({
      where: {
        sensor: {
          device_id: "device-1",
        },
      },
      orderBy: {
        received_at: "desc",
      },
      take: 10,
      select: {
        reading_id: true,
        value: true,
        unit: true,
        recorded_at: true,
        received_at: true,
        quality_flag: true,
        sensor: {
          select: {
            sensor_id: true,
            sensor_type: true,
            location_label: true,
          },
        },
      },
    });
  });

  test("returns notFound for unauthorized device and does not load readings", async () => {
    mockRequireCurrentUserId.mockResolvedValue("user-2");
    mockDeviceFindFirst.mockResolvedValue(null);

    await expect(
      DeviceDetailPage({
        params: Promise.resolve({ deviceId: "device-secret" }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mockNotFound).toHaveBeenCalled();
    expect(mockSensorReadingFindMany).not.toHaveBeenCalled();
  });
});