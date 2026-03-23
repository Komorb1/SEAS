import bcrypt from "bcrypt";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyAuthToken } from "@/lib/jwt";
import { z } from "zod";
import { AuditActionType, AuditTargetType } from "@prisma/client";
import { safeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

const ChangePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z.string().min(8, "New password must be at least 8 characters"),
    confirm_password: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "New passwords do not match",
    path: ["confirm_password"],
  });

async function getAuthenticatedUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    return null;
  }

  const payload = await verifyAuthToken(token);
  return payload?.user_id ?? null;
}

export async function PATCH(req: Request) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = ChangePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { current_password, new_password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        password_hash: true,
      },
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const passwordValid = await bcrypt.compare(
      current_password,
      user.password_hash
    );

    if (!passwordValid) {
      return Response.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    const password_hash = await bcrypt.hash(new_password, 12);

    await prisma.user.update({
      where: { user_id: userId },
      data: { password_hash },
    });

    await safeAuditLog({
      user_id: userId,
      action_type: AuditActionType.update_settings,
      target_type: AuditTargetType.user,
      target_id: userId,
      details: {
        kind: "password_changed",
      },
    });

    return Response.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Password PATCH error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}