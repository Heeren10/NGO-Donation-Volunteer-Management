export type JwtPayload = { sub: string; role: "admin" | "volunteer"; exp: number };

/** Decodes a JWT payload without verifying the signature — fine for optimistic
 * UI/redirect decisions since the backend independently verifies + enforces on every request.
 * No "server-only" guard here: this also runs in the edge middleware runtime (proxy.ts). */
export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) return null;
    return { sub: String(payload.sub), role: payload.role, exp: payload.exp };
  } catch {
    return null;
  }
}
