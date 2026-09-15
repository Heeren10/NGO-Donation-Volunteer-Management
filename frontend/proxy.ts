import { NextRequest, NextResponse } from "next/server";
import { decodeJwtPayload } from "@/lib/jwt";

const TOKEN_COOKIE = "ngo_token";
const PUBLIC_PATHS = ["/login", "/register"];
const OPEN_PREFIXES = ["/donate"]; // no login required, ever — donors aren't platform users
const ADMIN_ONLY_PREFIXES = ["/", "/donors", "/volunteers", "/grants", "/alerts"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (OPEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  const role = token ? decodeJwtPayload(token)?.role ?? null : null;
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (!role && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (role && isPublic) {
    return NextResponse.redirect(new URL(role === "admin" ? "/" : "/my", req.url));
  }

  if (role === "volunteer" && ADMIN_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.redirect(new URL("/my", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Must exclude the whole `_next/` namespace, not just static/image — this also covers the
  // dev-mode HMR websocket endpoint. Redirecting a websocket upgrade breaks it silently and the
  // client retries instantly, forever, which looks like the page endlessly reloading.
  matcher: ["/((?!_next/|favicon.ico).*)"],
};
