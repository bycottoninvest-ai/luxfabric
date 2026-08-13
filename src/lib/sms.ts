/**
 * O‘zbekiston SMS gateway — Eskiz.uz (prefer).
 * Env: SMS_PROVIDER=eskiz, ESKIZ_EMAIL, ESKIZ_PASSWORD, ESKIZ_FROM, optional SMS_FROM_PHONE
 * Docs: docs/SMS-ULASH.md
 */

const ESKIZ_BASE = "https://notify.eskiz.uz/api";

type SmsResult = {
  ok: boolean;
  provider: string;
  id?: string;
  error?: string;
  skipped?: string;
};

type CachedToken = { token: string; expiresAt: number };

let tokenCache: CachedToken | null = null;

export function isSmsConfigured(): boolean {
  const provider = (process.env.SMS_PROVIDER || "eskiz").toLowerCase();
  if (provider === "eskiz" || provider === "") {
    return Boolean(process.env.ESKIZ_EMAIL?.trim() && process.env.ESKIZ_PASSWORD?.trim());
  }
  return false;
}

export function getSmsFrom(): string {
  return (
    process.env.ESKIZ_FROM?.trim() ||
    process.env.SMS_FROM_PHONE?.trim() ||
    "4546"
  );
}

/** Eskiz: 998XXXXXXXXX (plus belgisiz) */
export function toEskizPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("998") && digits.length === 12) return digits;
  if (digits.length === 9) return `998${digits}`;
  return digits;
}

async function eskizLogin(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 60_000) {
    return tokenCache.token;
  }

  const email = process.env.ESKIZ_EMAIL?.trim();
  const password = process.env.ESKIZ_PASSWORD?.trim();
  if (!email || !password) {
    throw new Error("ESKIZ_EMAIL / ESKIZ_PASSWORD yo‘q");
  }

  const res = await fetch(`${ESKIZ_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    data?: { token?: string };
    message?: string;
  };
  const token = data.data?.token;
  if (!res.ok || !token) {
    throw new Error(data.message || `Eskiz login ${res.status}`);
  }

  // Token ~30 kun; xavfsiz buffer — 25 kun
  tokenCache = { token, expiresAt: now + 25 * 24 * 60 * 60 * 1000 };
  return token;
}

async function eskizSend(to: string, text: string, from: string): Promise<SmsResult> {
  const mobile = toEskizPhone(to);
  if (!/^998\d{9}$/.test(mobile)) {
    return { ok: false, provider: "eskiz", error: `Noto‘g‘ri raqam: ${to}` };
  }

  let token: string;
  try {
    token = await eskizLogin();
  } catch (e) {
    return {
      ok: false,
      provider: "eskiz",
      error: e instanceof Error ? e.message : "login fail",
    };
  }

  const body = new URLSearchParams();
  body.set("mobile_phone", mobile);
  body.set("message", text);
  body.set("from", from);

  const sendOnce = async (auth: string) =>
    fetch(`${ESKIZ_BASE}/message/sms/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

  let res = await sendOnce(token);
  if (res.status === 401) {
    tokenCache = null;
    try {
      token = await eskizLogin();
      res = await sendOnce(token);
    } catch (e) {
      return {
        ok: false,
        provider: "eskiz",
        error: e instanceof Error ? e.message : "re-login fail",
      };
    }
  }

  const data = (await res.json().catch(() => ({}))) as {
    id?: string | number;
    message?: string;
    status?: string;
  };

  if (!res.ok) {
    return {
      ok: false,
      provider: "eskiz",
      error: data.message || `send ${res.status}`,
    };
  }

  return {
    ok: true,
    provider: "eskiz",
    id: data.id != null ? String(data.id) : undefined,
  };
}

/**
 * SMS yuborish. Xato throw qilmaydi — natijani qaytaradi (fail-soft).
 */
export async function sendSms(opts: { to: string; text: string }): Promise<SmsResult> {
  const provider = (process.env.SMS_PROVIDER || "eskiz").toLowerCase();
  const from = getSmsFrom();

  if (!isSmsConfigured()) {
    console.log("[SMS] sozlanmagan — demo:", opts.to, opts.text.slice(0, 80));
    return { ok: false, provider, skipped: "not-configured" };
  }

  try {
    if (provider === "eskiz" || provider === "") {
      const result = await eskizSend(opts.to, opts.text, from);
      if (result.ok) {
        console.log("[SMS] sent", opts.to, result.id || "ok");
      } else {
        console.error("[SMS] fail", opts.to, result.error);
      }
      return result;
    }
    console.error("[SMS] noma’lum provider:", provider);
    return { ok: false, provider, error: `Unknown SMS_PROVIDER: ${provider}` };
  } catch (e) {
    const error = e instanceof Error ? e.message : "sms fail";
    console.error("[SMS] exception", opts.to, error);
    return { ok: false, provider, error };
  }
}
