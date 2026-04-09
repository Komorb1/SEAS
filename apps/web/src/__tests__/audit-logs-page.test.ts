import AuditLogsPage from "@/app/(app)/audit-logs/page";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserId } from "@/lib/auth";
import { redirect } from "next/navigation";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  requireCurrentUserId: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

const mockRequireCurrentUserId = requireCurrentUserId as jest.Mock;
const mockRedirect = redirect as jest.MockedFunction<typeof redirect>;
const mockAuditLogFindMany = prisma.auditLog.findMany as jest.Mock;
const mockAuditLogCount = prisma.auditLog.count as jest.Mock;

describe("AuditLogsPage authorization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("redirects unauthenticated users to /login", async () => {
    mockRequireCurrentUserId.mockRejectedValue(new Error("unauthorized"));
    mockRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(AuditLogsPage()).rejects.toThrow("NEXT_REDIRECT");

    expect(mockRedirect).toHaveBeenCalledWith("/login");
    expect(mockAuditLogFindMany).not.toHaveBeenCalled();
    expect(mockAuditLogCount).not.toHaveBeenCalled();
  });

  test("loads only logs for the current user", async () => {
    mockRequireCurrentUserId.mockResolvedValue("user-1");
    mockAuditLogCount.mockResolvedValue(1);
    mockAuditLogFindMany.mockResolvedValue([
      {
        log_id: "log-1",
        action_type: "login",
        target_type: "user",
        target_id: "user-1",
        details: { login_identifier_type: "email" },
        created_at: new Date("2026-03-29T10:00:00.000Z"),
      },
    ]);

    const page = await AuditLogsPage();

    expect(page).toBeTruthy();
    expect(mockAuditLogFindMany).toHaveBeenCalledWith({
      where: {
        user_id: "user-1",
      },
      orderBy: {
        created_at: "desc",
      },
      skip: 0,
      take: 10,
      select: {
        log_id: true,
        action_type: true,
        target_type: true,
        target_id: true,
        details: true,
        created_at: true,
      },
    });
  });
});