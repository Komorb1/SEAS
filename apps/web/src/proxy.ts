import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  AUTH_TOKEN_MAX_AGE_SECONDS,
  createAuthToken,
  shouldRefreshAuthToken,
  verifyAuthToken,
} from "@/lib/jwt";

const protectedRoutes = [
  "/dashboard",
  "/sites",
  "/devices",
  "/alerts",
  "/profile",
  "/audit-logs",
  "/readings",
];

const authPages = ["/login"];

function matchesRoute(pathname: string, routes: string[]) {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function buildLoginRedirect(req: NextRequest, pathname: string) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return url;
}

function setAuthCookie(res: NextResponse, token: string) {
  res.cookies.set("auth_token", token, {
    httpOnly: true,
    path: "/",
    maxAge: AUTH_TOKEN_MAX_AGE_SECONDS,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

function clearAuthCookie(res: NextResponse) {
  res.cookies.set("auth_token", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("auth_token")?.value;

  const isProtectedRoute = matchesRoute(pathname, protectedRoutes);
  const isAuthPage = matchesRoute(pathname, authPages);

  if (!isProtectedRoute && !isAuthPage) {
    return NextResponse.next();
  }

  if (!token) {
    if (isProtectedRoute) {
      return NextResponse.redirect(buildLoginRedirect(req, pathname));
    }

    return NextResponse.next();
  }

  const payload = await verifyAuthToken(token);

  if (!payload?.user_id || !payload.username) {
    const res = NextResponse.redirect(buildLoginRedirect(req, pathname));
    clearAuthCookie(res);
    return res;
  }

  if (isAuthPage) {
    const res = NextResponse.redirect(new URL("/dashboard", req.url));

    if (shouldRefreshAuthToken(payload)) {
      const refreshedToken = await createAuthToken({
        user_id: payload.user_id,
        username: payload.username,
      });
      setAuthCookie(res, refreshedToken);
    }

    return res;
  }

  const res = NextResponse.next();

  if (shouldRefreshAuthToken(payload)) {
    const refreshedToken = await createAuthToken({
      user_id: payload.user_id,
      username: payload.username,
    });
    setAuthCookie(res, refreshedToken);
  }

  return res;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/sites/:path*",
    "/devices/:path*",
    "/readings/:path*",
    "/alerts/:path*",
    "/profile/:path*",
    "/audit-logs/:path*",
    "/login",
  ],
};