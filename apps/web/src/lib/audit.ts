import { prisma } from "@/lib/prisma";
import { Prisma, AuditActionType, AuditTargetType } from "@prisma/client";

type AuditDetails = Prisma.InputJsonValue | undefined;

type AuditLogInput = {
  user_id?: string | null;
  event_id?: string | null;
  action_type: AuditActionType;
  target_type: AuditTargetType;
  target_id?: string | null;
  details?: AuditDetails;
};

export async function createAuditLog(input: AuditLogInput) {
  return prisma.auditLog.create({
    data: {
      user_id: input.user_id ?? null,
      event_id: input.event_id ?? null,
      action_type: input.action_type,
      target_type: input.target_type,
      target_id: input.target_id ?? null,
      details: input.details,
    },
  });
}

export async function safeAuditLog(input: AuditLogInput) {
  try {
    await createAuditLog(input);
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.error("Failed to write audit log", error);
    }
  }
}