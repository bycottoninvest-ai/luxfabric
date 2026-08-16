import { NextResponse } from "next/server";
import { getSetting } from "@/lib/settings";

const IG_APP_ID = process.env.INSTAGRAM_APP_ID || "1081297184404685";
const DEFAULT_REDIRECT = "https://www.luxfabricshop.uz/api/admin/instagram/oauth/callback";

const SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
  "instagram_business_content_publish",
  "instagram_business_manage_insights",
].join(",");

/** Admin sessiyasi bilan: Instagram Login OAuth ni boshlash */
export async function GET() {
  const redirectUri =
    (await getSetting("instagram_oauth_redirect")) ||
    process.env.INSTAGRAM_OAUTH_REDIRECT ||
    DEFAULT_REDIRECT;
  const auth = new URL("https://www.instagram.com/oauth/authorize");
  auth.searchParams.set("client_id", IG_APP_ID);
  auth.searchParams.set("redirect_uri", redirectUri);
  auth.searchParams.set("scope", SCOPES);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("force_reauth", "true");
  return NextResponse.redirect(auth.toString());
}
