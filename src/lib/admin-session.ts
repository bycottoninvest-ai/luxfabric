/** Edge-safe admin session (proxy + Node). */

export const ADMIN_COOKIE = "lf_admin_session";
export const ADMIN_SESSION_DAYS = 14;

export type AdminSessionPayload = {
  sub: string;
  email: string;
  exp: number;
};

function sessionSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "luxfabric-dev-only-change-me"
  );
}

function b64urlEncode(data: string | Uint8Array): string {
  const bytes =
    typeof data === "string" ? new TextEncoder().encode(data) : data;
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlDecodeToString(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function hmacSign(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message)
  );
  return b64urlEncode(new Uint8Array(sig));
}

export async function createSessionToken(
  payload: AdminSessionPayload
): Promise<string> {
  const body = b64urlEncode(JSON.stringify(payload));
  const sig = await hmacSign(body);
  return `${body}.${sig}`;
}

export async function readSessionToken(
  token: string | undefined | null
): Promise<AdminSessionPayload | null> {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = await hmacSign(body);
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const data = JSON.parse(b64urlDecodeToString(body)) as AdminSessionPayload;
    if (!data?.sub || !data?.email || !data?.exp) return null;
    if (Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

export function sessionExpiryMs(): number {
  return Date.now() + ADMIN_SESSION_DAYS * 24 * 60 * 60 * 1000;
}

export function cookieOptions(maxAgeSec: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSec,
  };
}
