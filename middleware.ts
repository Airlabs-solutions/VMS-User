import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const loggedIn = Boolean(request.cookies.get("vms_driver_access") || request.cookies.get("vms_access"));
  const path = request.nextUrl.pathname;
  if (!loggedIn && path !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (loggedIn && (path === "/" || path === "/login")) {
    return NextResponse.redirect(new URL("/my-vehicle", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico).*)"],
};
