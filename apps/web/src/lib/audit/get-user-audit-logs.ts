import { prisma } from "@/lib/prisma";

export async function getUserAuditLogs(userId: string) {
  return prisma.auditLog.findMany({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
    select: {
      log_id: true,
      action_type: true,
      target_type: true,
      target_id: true,
      details: true,
      created_at: true,
    },
  });
}