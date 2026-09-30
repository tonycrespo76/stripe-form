import { NextResponse, type NextRequest } from "next/server";

// Optimistic gate only: real verification happens in requireAdmin() on the server.
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAuthPage = pathname === "/admin/login" || pathname === "/admin/verify";
  if (!isAuthPage && !req.cookies.has("session")) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: "/admin/:path*" };
