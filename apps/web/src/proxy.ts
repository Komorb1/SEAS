import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAuthToken } from "@/lib/jwt";

const protectedRoutes = ["/dashboard", "/sites", "/devices", "/alerts", "/profile"];
const authPages = ["/login"];

function matchesRoute(pathname: string, routes: string[]) {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
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
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  const payload = await verifyAuthToken(token);

  if (!payload) {
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.set("auth_token", "", {
      path: "/",
      maxAge: 0,
    });
    return res;
  }

  if (isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/sites/:path*", "/devices/:path*", "/alerts/:path*", "/profile/:path*", "/login"],
};