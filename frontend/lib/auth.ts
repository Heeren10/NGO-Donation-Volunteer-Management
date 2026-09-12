import "server-only";
import { cookies } from "next/headers";
import { decodeJwtPayload } from "@/lib/jwt";

const TOKEN_COOKIE = "ngo_token";

export type Session = { profileId: number; role: "admin" | "volunteer"; exp: number };

export async function getToken(): Promise<string | undefined> {
  return (await cookies()).get(TOKEN_COOKIE)?.value;
}

export async function setToken(token: string): Promise<void> {
  (await cookies()).set(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearToken(): Promise<void> {
  (await cookies()).delete(TOKEN_COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const token = await getToken();
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  return { profileId: Number(payload.sub), role: payload.role, exp: payload.exp };
}
