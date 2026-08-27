import { NextRequest, NextResponse } from "next/server";

const TOKEN_COOKIE = "ngo_token";
const PUBLIC_PATHS = ["/login", "/register"];
const ADMIN_ONLY_PREFIXES = ["/", "/donors", "/volunteers"];

function decodeRole(token: string): "admin" | "volunteer" | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    if (payload.exp * 1000 < Date.now()) return null;
    return payload.role ?? null;
  } catch {
    return null;
  }
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  const role = token ? decodeRole(token) : null;
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
