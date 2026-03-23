import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { SignJWT } from "jose";
import { AuditActionType, AuditTargetType } from "@prisma/client";
import { safeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

const LoginSchema = z.object({
  identifier: z.string().min(1, "Username or email required"),
  password: z.string().min(1, "Password required"),
});

const jwtSecretValue = process.env.JWT_SECRET;
if (!jwtSecretValue) {
  throw new Error("JWT_SECRET is not set");
}
const JWT_SECRET = new TextEncoder().encode(jwtSecretValue);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }

    const { identifier, password } = parsed.data;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: identifier },
          { email: identifier },
        ],
      },
    });

    if (!user) {
      return Response.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const passwordValid = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordValid) {
      return Response.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    await prisma.user.update({
      where: { user_id: user.user_id },
      data: { last_login_at: new Date() },
    });

    const token = await new SignJWT({
      user_id: user.user_id,
      username: user.username,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1d")
      .setIssuedAt()
      .sign(JWT_SECRET);

    const response = Response.json({ message: "Login successful" });

    response.headers.append(
      "Set-Cookie",
      `auth_token=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax${
        process.env.NODE_ENV === "production" ? "; Secure" : ""
      }`
    );

    await safeAuditLog({
      user_id: user.user_id,
      action_type: AuditActionType.login,
      target_type: AuditTargetType.user,
      target_id: user.user_id,
      details: {
        login_identifier_type: user.email === identifier ? "email" : "username",
      },
    });

    return response;
  } catch (err) {
    console.error("Login error:", err);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}