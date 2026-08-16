/** Instagram / Facebook access token ni tozalash va tekshirish. */

export function normalizeIgAccessToken(raw: string): string {
  let t = (raw || "").replace(/^\uFEFF/, "").trim();
  if (!t) return "";
  t = t.replace(/^Bearer\s+/i, "").trim();
  t = t.replace(/^["'`]+|["'`]+$/g, "").trim();
  if (t.startsWith("{")) {
    try {
      const parsed = JSON.parse(t) as { access_token?: string; accessToken?: string };
      t = (parsed.access_token || parsed.accessToken || t).trim();
    } catch {
      /* raw qoladi */
    }
  }
  const extracted = t.match(/(?:IG[A-Z]{1,6}|EA[A-Z]{1,6})[A-Za-z0-9_\-]+/);
  if (extracted?.[0]) t = extracted[0];
  return t.replace(/\s+/g, "").trim();
}

/** Graph App Token (`app-id|secret`) — Instagram publish uchun emas. */
export function looksLikeAppToken(raw: string): boolean {
  return (raw || "").includes("|");
}

export function looksLikeIgAccessToken(raw: string): boolean {
  const t = normalizeIgAccessToken(raw);
  if (!t || looksLikeAppToken(t) || t.length < 40) return false;
  if (/^(EA|IG)/i.test(t)) return true;
  return /^[A-Za-z0-9_\-.]+$/.test(t);
}

export function igTokenKind(raw: string): "instagram" | "facebook" | "unknown" {
  const t = normalizeIgAccessToken(raw);
  if (/^IG/i.test(t)) return "instagram";
  if (/^EA/i.test(t)) return "facebook";
  return "unknown";
}

export function isUnparseableTokenError(message: string): boolean {
  return /cannot parse access token|invalid oauth access token|error validating access token|session has expired|token.*expired/i.test(
    message
  );
}

export function igTokenReconnectMessage(detail?: string): string {
  const extra = detail?.trim() ? ` (${detail.trim()})` : "";
  return `Instagram token yaroqsiz${extra}. Meta/DM → «Instagram token olish (OAuth)» ni bosing, keyin «IGga joylash»ni qayta bosing.`;
}

/** Instagram Login long-lived tokenni yangilash (60 kun). */
export async function refreshInstagramLoginToken(token: string): Promise<string | null> {
  const url = new URL("https://graph.instagram.com/refresh_access_token");
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", token);
  try {
    const res = await fetch(url);
    const data = (await res.json()) as { access_token?: string };
    if (res.ok && data.access_token && looksLikeIgAccessToken(data.access_token)) {
      return normalizeIgAccessToken(data.access_token);
    }
  } catch {
    /* ignore */
  }
  return null;
}
