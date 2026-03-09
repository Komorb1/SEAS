import { cookies } from "next/headers";
import { verifyAuthToken, type AuthPayload } from "@/lib/jwt";

export async function getCurrentUser(): Promise<AuthPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    return null;
  }

  const payload = await verifyAuthToken(token);

  if (!payload) {
    return null;
  }

  return payload;
}