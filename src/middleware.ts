import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Simple cookie-based check for admin routes
  // Full auth validation happens in API routes and server components
  const isOnLogin = request.nextUrl.pathname === "/admin/login";
  if (isOnLogin) return NextResponse.next();

  // Check for session cookie (next-auth sets this)
  const sessionCookie =
    request.cookies.get("authjs.session-token") ||
    request.cookies.get("__Secure-authjs.session-token");

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
