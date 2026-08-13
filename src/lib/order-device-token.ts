import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const DEVICE_TOKEN_STORAGE_KEY = "lf_device_order_tokens";
export const DEVICE_TOKEN_COOKIE_PREFIX = "lf_dot_";

export function generateDeviceOrderToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashDeviceOrderToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function verifyDeviceOrderToken(
  token: string | null | undefined,
  hash: string | null | undefined
): boolean {
  if (!token || !hash) return false;
  const got = hashDeviceOrderToken(token);
  try {
    const a = Buffer.from(got, "utf8");
    const b = Buffer.from(hash, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function normalizeOrderNumber(raw: string): string {
  const t = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!t) return "";
  if (t.startsWith("LF-")) return t;
  if (/^\d{5,8}$/.test(t)) return `LF-${t}`;
  return t;
}

export function isLikelyOrderNumber(raw: string): boolean {
  return /^LF-\d{5,8}$/i.test(normalizeOrderNumber(raw));
}
