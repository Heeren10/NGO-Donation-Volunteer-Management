import "server-only";
import { cookies } from "next/headers";

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

/** Decodes the JWT payload without verifying the signature — fine for optimistic
 * UI/redirect decisions since the backend independently verifies + enforces on every request. */
export function decodeToken(token: string): Session | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    return { profileId: Number(payload.sub), role: payload.role, exp: payload.exp };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const token = await getToken();
  if (!token) return null;
  const session = decodeToken(token);
  if (!session || session.exp * 1000 < Date.now()) return null;
  return session;
}
