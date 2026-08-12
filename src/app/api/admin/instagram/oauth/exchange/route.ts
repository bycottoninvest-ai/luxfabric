import { NextResponse } from "next/server";
import { z } from "zod";
import { getSetting, setSettings } from "@/lib/settings";

const GRAPH_IG = "https://graph.instagram.com";
const IG_OAUTH = "https://api.instagram.com/oauth/access_token";

const IG_APP_ID = process.env.INSTAGRAM_APP_ID || "1081297184404685";

const exchangeSchema = z.object({
  code: z.string().min(10),
  /** Agar settings da yo‘q bo‘lsa, vaqtincha body orqali */
  clientSecret: z.string().min(8).optional(),
  redirectUri: z
    .string()
    .url()
    .optional()
    .default("https://developers.facebook.com/instagram/token_generator/oauth/"),
});

async function exchangeCode(opts: {
  code: string;
  clientSecret: string;
  redirectUri: string;
}) {
  const body = new URLSearchParams({
    client_id: IG_APP_ID,
    client_secret: opts.clientSecret,
    grant_type: "authorization_code",
    redirect_uri: opts.redirectUri,
    code: opts.code.replace(/#_$/, "").trim(),
  });

  const res = await fetch(IG_OAUTH, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = (await res.json()) as {
    access_token?: string;
    user_id?: number | string;
    permissions?: string;
    error_message?: string;
    error_type?: string;
    code?: number;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_message || data.error_type || "Token almashtirish xatosi");
  }
  return data;
}

/** Short-lived → long-lived (60 kun) */
async function exchangeLongLived(shortToken: string) {
  const secret =
    (await getSetting("instagram_app_secret")) ||
    process.env.INSTAGRAM_APP_SECRET ||
    "";
  if (!secret) return shortToken;

  const url = new URL(`${GRAPH_IG}/access_token`);
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", secret);
  url.searchParams.set("access_token", shortToken);
  const res = await fetch(url);
  const data = (await res.json()) as { access_token?: string; error?: { message?: string } };
  if (!res.ok || !data.access_token) {
    return shortToken;
  }
  return data.access_token;
}

export async function POST(req: Request) {
  try {
    const parsed = exchangeSchema.parse(await req.json());
    const clientSecret =
      parsed.clientSecret ||
      (await getSetting("instagram_app_secret")) ||
      process.env.INSTAGRAM_APP_SECRET ||
      "";
    if (!clientSecret) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Instagram App Secret yo‘q — Meta API Setup da «Показать» qilib Admin Meta/DM ga saqlang",
        },
        { status: 400 }
      );
    }

    const short = await exchangeCode({
      code: parsed.code,
      clientSecret,
      redirectUri: parsed.redirectUri,
    });
    const longToken = await exchangeLongLived(short.access_token!);
    const igUserId = String(short.user_id || "");

    await setSettings({
      instagram_page_token: longToken,
      ...(igUserId ? { instagram_ig_user_id: igUserId } : {}),
      instagram_username: "luxfabric.shop",
      app_domain: "https://www.luxfabricshop.uz",
    });

    return NextResponse.json({
      ok: true,
      igUserId: igUserId || null,
      permissions: short.permissions || null,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Xatolik" },
      { status: 400 }
    );
  }
}
