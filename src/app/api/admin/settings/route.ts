import { NextResponse } from "next/server";
import { z } from "zod";
import { setSettings } from "@/lib/settings";
import {
  looksLikeAppToken,
  looksLikeIgAccessToken,
  normalizeIgAccessToken,
} from "@/lib/ig-token";

const schema = z.record(z.string(), z.string());

const SECRET_KEYS = new Set([
  "instagram_page_token",
  "instagram_app_secret",
  "click_secret_key",
  "payme_key",
]);

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const cleaned: Record<string, string> = {};
    for (const [key, value] of Object.entries(body)) {
      if (key === "instagram_page_token") {
        const next = normalizeIgAccessToken(value);
        if (!next || looksLikeAppToken(next) || !looksLikeIgAccessToken(next)) continue;
        cleaned[key] = next;
        continue;
      }
      if (SECRET_KEYS.has(key) && !value.trim()) continue;
      cleaned[key] = value;
    }
    await setSettings(cleaned);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Xatolik" },
      { status: 400 }
    );
  }
}
