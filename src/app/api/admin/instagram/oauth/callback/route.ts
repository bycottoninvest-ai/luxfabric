import { NextResponse } from "next/server";
import { getSetting, setSettings } from "@/lib/settings";
import { normalizeIgAccessToken } from "@/lib/ig-token";
import { resolveIgAccess } from "@/lib/instagram-graph";

const IG_APP_ID = process.env.INSTAGRAM_APP_ID || "1081297184404685";
const DEFAULT_REDIRECT = "https://www.luxfabricshop.uz/api/admin/instagram/oauth/callback";

function redirectAdmin(msg: string, ok: boolean) {
  const u = new URL("https://www.luxfabricshop.uz/admin/instagram");
  u.searchParams.set(ok ? "oauth" : "oauth_error", msg);
  return NextResponse.redirect(u.toString());
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const err = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  if (err) {
    return redirectAdmin(errorDescription || err, false);
  }

  const code = url.searchParams.get("code");
  if (!code) {
    return redirectAdmin("code yo‘q", false);
  }

  const clientSecret =
    (await getSetting("instagram_app_secret")) || process.env.INSTAGRAM_APP_SECRET || "";
  if (!clientSecret) {
    return redirectAdmin("instagram_app_secret yo‘q — Meta/DM ga saqlang", false);
  }

  const redirectUri =
    (await getSetting("instagram_oauth_redirect")) ||
    process.env.INSTAGRAM_OAUTH_REDIRECT ||
    DEFAULT_REDIRECT;

  try {
    const body = new URLSearchParams({
      client_id: IG_APP_ID,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code: code.replace(/#_$/, "").trim(),
    });
    const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      user_id?: number | string;
      error_message?: string;
    };
    if (!tokenRes.ok || !tokenData.access_token) {
      return redirectAdmin(tokenData.error_message || "token exchange fail", false);
    }

    let accessToken = normalizeIgAccessToken(tokenData.access_token);
    // long-lived
    const ll = new URL("https://graph.instagram.com/access_token");
    ll.searchParams.set("grant_type", "ig_exchange_token");
    ll.searchParams.set("client_secret", clientSecret);
    ll.searchParams.set("access_token", accessToken);
    const llRes = await fetch(ll);
    const llData = (await llRes.json()) as { access_token?: string };
    if (llRes.ok && llData.access_token) {
      accessToken = normalizeIgAccessToken(llData.access_token);
    }

    if (!accessToken || accessToken.length < 20) {
      return redirectAdmin("token format noto‘g‘ri — qayta urinib ko‘ring", false);
    }

    let igUserId = String(tokenData.user_id || "");

    // Avval saqlash — resolve fail bo‘lsa ham yangi token yo‘qolmasin
    await setSettings({
      instagram_page_token: accessToken,
      ...(igUserId ? { instagram_ig_user_id: igUserId } : {}),
      instagram_username: "luxfabric.shop",
      app_domain: "https://www.luxfabricshop.uz",
      instagram_enabled: "true",
    });

    try {
      const resolved = await resolveIgAccess(accessToken, igUserId);
      igUserId = resolved.igUserId || igUserId;
      if (resolved.pageTokenOverride) accessToken = resolved.pageTokenOverride;
      await setSettings({
        instagram_page_token: accessToken,
        ...(igUserId ? { instagram_ig_user_id: igUserId } : {}),
      });
    } catch {
      /* token allaqachon saqlangan — publish o‘zi tekshiradi */
    }

    return redirectAdmin("ok", true);
  } catch (e) {
    return redirectAdmin(e instanceof Error ? e.message : "xatolik", false);
  }
}
