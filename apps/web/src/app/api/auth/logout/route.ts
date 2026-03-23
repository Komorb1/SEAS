import { jwtVerify } from "jose";
import { AuditActionType, AuditTargetType } from "@prisma/client";
import { safeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

const jwtSecretValue = process.env.JWT_SECRET;
if (!jwtSecretValue) {
  throw new Error("JWT_SECRET is not set");
}
const JWT_SECRET = new TextEncoder().encode(jwtSecretValue);

type AuthTokenPayload = {
  user_id: string;
  username: string;
};

function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((part) => part.trim());
  const match = cookies.find((cookie) => cookie.startsWith(`${name}=`));

  if (!match) return null;

  return decodeURIComponent(match.slice(name.length + 1));
}

export async function POST(req: Request) {
  let userId: string | null = null;

  try {
    const token = getCookieValue(req.headers.get("cookie"), "auth_token");

    if (token) {
      const verified = await jwtVerify<AuthTokenPayload>(token, JWT_SECRET);
      userId = verified.payload.user_id ?? null;
    }
  } catch (error) {
    console.error("Failed to verify auth token during logout", error);
  }

  const response = Response.json({ message: "Logout successful" });

  response.headers.append(
    "Set-Cookie",
    `auth_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`
  );

  if (userId) {
    await safeAuditLog({
      user_id: userId,
      action_type: AuditActionType.logout,
      target_type: AuditTargetType.user,
      target_id: userId,
      details: {
        method: "cookie",
      },
    });
  }

  return response;
}