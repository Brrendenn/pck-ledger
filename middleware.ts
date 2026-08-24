// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import {
  standardLimiter,
  mutationLimiter,
  bulkLimiter,
} from "./lib/rate-limit";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Check Session Token for Protected Pages & API Routes
  const token =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value ||
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value;

  const isAuthRoute = pathname.startsWith("/api/auth") || pathname === "/login";

  // Redirect unauthenticated requests to /login
  if (!token && !isAuthRoute) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 },
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from /login
  if (token && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 2. Apply Rate Limiting to API Routes
  if (pathname.startsWith("/api") && !pathname.startsWith("/api/auth")) {
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const ip = forwardedFor?.split(",")[0].trim() || realIp || "127.0.0.1";

    let limiter = standardLimiter;
    if (pathname.includes("/bulk")) {
      limiter = bulkLimiter;
    } else if (["POST", "PATCH", "DELETE", "PUT"].includes(request.method)) {
      limiter = mutationLimiter;
    }

    if (limiter) {
      const { success, limit, remaining, reset } = await limiter.limit(
        `${ip}:${pathname}`,
      );
      if (!success) {
        return NextResponse.json(
          { error: "Too Many Requests", message: "Rate limit exceeded" },
          { status: 429 },
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
