import { NextResponse } from "next/server";

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
  const redirectUri = process.env.INSTAGRAM_OAUTH_REDIRECT || DEFAULT_REDIRECT;
  const auth = new URL("https://www.instagram.com/oauth/authorize");
  auth.searchParams.set("client_id", IG_APP_ID);
  auth.searchParams.set("redirect_uri", redirectUri);
  auth.searchParams.set("scope", SCOPES);
  auth.searchParams.set("response_type", "code");
  return NextResponse.redirect(auth.toString());
}
