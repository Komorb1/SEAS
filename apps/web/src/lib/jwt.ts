import { SignJWT, jwtVerify } from "jose";

const secret = process.env.JWT_SECRET;

if (!secret) {
  throw new Error("JWT_SECRET is not set");
}

const JWT_SECRET = new TextEncoder().encode(secret);

export const AUTH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24; // 1 day
export const AUTH_TOKEN_REFRESH_THRESHOLD_SECONDS = 60 * 30; // 30 minutes

export type AuthPayload = {
  user_id: string;
  username: string;
  iat?: number;
  exp?: number;
};

type CreateAuthTokenInput = {
  user_id: string;
  username: string;
};

export async function createAuthToken(
  payload: CreateAuthTokenInput
): Promise<string> {
  return await new SignJWT({
    user_id: payload.user_id,
    username: payload.username,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${AUTH_TOKEN_MAX_AGE_SECONDS}s`)
    .sign(JWT_SECRET);
}

export async function verifyAuthToken(
  token: string
): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as AuthPayload;
  } catch {
    return null;
  }
}

export function shouldRefreshAuthToken(payload: AuthPayload): boolean {
  if (!payload.exp) {
    return false;
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  const secondsRemaining = payload.exp - nowInSeconds;

  return (
    secondsRemaining > 0 &&
    secondsRemaining <= AUTH_TOKEN_REFRESH_THRESHOLD_SECONDS
  );
}