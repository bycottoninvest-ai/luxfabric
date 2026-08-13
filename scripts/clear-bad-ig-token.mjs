/**
 * Admin session orqali yaroqsiz Instagram tokenni tozalaydi (qayta OAuth uchun).
 *   node scripts/clear-bad-ig-token.mjs --confirm
 */
import fs from "fs";
import { config as loadDotenv } from "dotenv";

if (!process.argv.includes("--confirm")) {
  console.error("--confirm kerak");
  process.exit(1);
}

for (const f of [".env.local", ".env"]) {
  if (fs.existsSync(f)) loadDotenv({ path: f });
}

const base = (process.env.BASE_URL || "https://www.luxfabricshop.uz").replace(
  /\/$/,
  ""
);
const password = (process.env.ADMIN_PASSWORD || "")
  .trim()
  .replace(/^["']+|["']+$/g, "");
if (!password || password === "[SENSITIVE]") {
  console.error("ADMIN_PASSWORD yo‘q");
  process.exit(1);
}

const email = process.env.ADMIN_EMAIL || "admin@luxfabricshop.uz";
const loginRes = await fetch(`${base}/api/admin/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
if (!loginRes.ok) {
  console.error("Login fail", loginRes.status);
  process.exit(1);
}
const setCookie = loginRes.headers.getSetCookie?.() || [];
const cookie =
  setCookie.length > 0
    ? setCookie.map((c) => c.split(";")[0]).join("; ")
    : (loginRes.headers.get("set-cookie") || "").split(";")[0];

const res = await fetch(`${base}/api/admin/settings`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Cookie: cookie,
  },
  body: JSON.stringify({
    instagram_page_token: "",
  }),
});
const json = await res.json().catch(() => ({}));
console.log(JSON.stringify({ status: res.status, json }, null, 2));
if (!res.ok) process.exit(1);
console.log(
  "Token tozalandi. Keyingi qadam: Admin → Instagram → Meta/DM → «Instagram token olish (OAuth)»"
);
