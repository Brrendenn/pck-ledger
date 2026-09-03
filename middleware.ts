// middleware.ts
import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import {
  standardLimiter,
  mutationLimiter,
  bulkLimiter,
} from "./lib/rate-limit";

const { auth } = NextAuth(authConfig);

export default auth(async function middleware(request) {
  const { pathname } = request.nextUrl;
  const session = request.auth;
  const role = (session?.user as any)?.role;

  const isAuthRoute = pathname.startsWith("/api/auth") || pathname === "/login";

  // 1. Redirect unauthenticated users to /login
  if (!session && !isAuthRoute) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Redirect authenticated users away from /login
  if (session && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 3. ROLE-BASED ACCESS CONTROL: Block CLIENT from admin-only pages
  if (role === "CLIENT") {
    const assignedProjectId = (session?.user as any)?.assignedProjectId;

    const isAdminRoute =
      pathname.startsWith("/purchase-orders") ||
      pathname.startsWith("/api-docs");

    if (isAdminRoute) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (pathname.startsWith("/projects/") && assignedProjectId) {
      const requestedProjectId = pathname.split("/")[2]; 
      if (requestedProjectId && requestedProjectId !== assignedProjectId) {
        return NextResponse.redirect(
          new URL(`/projects/${assignedProjectId}`, request.url)
        );
      }
    }
  }

  // 4. Rate Limiting for API routes
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
      const { success } = await limiter.limit(`${ip}:${pathname}`);
      if (!success) {
        return NextResponse.json(
          { error: "Too Many Requests", message: "Rate limit exceeded" },
          { status: 429 }
        );
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  // Matches all routes except static Next.js assets, images, and favicon
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};