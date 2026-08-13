/**
 * Production WarehouseStock.quantity → 0 (admin session + clear-stock API).
 *
 *   node scripts/run-prod-clear-stock.mjs --confirm
 *
 * ADMIN_PASSWORD: .env.local. Secret chop etilmaydi.
 */
import fs from "fs";
import { config as loadDotenv } from "dotenv";

const confirm = process.argv.includes("--confirm");
const base = (process.env.BASE_URL || "https://www.luxfabricshop.uz").replace(
  /\/$/,
  ""
);

for (const f of [".env.local", ".env"]) {
  if (fs.existsSync(f)) loadDotenv({ path: f });
}

function readAdminPassword() {
  let v = (process.env.ADMIN_PASSWORD || "").trim().replace(/^["']+|["']+$/g, "");
  if (v && v !== "[SENSITIVE]") return v;
  return "";
}

function cookieFromLogin(res) {
  const setCookie = res.headers.getSetCookie?.() || [];
  if (setCookie.length > 0) {
    return setCookie.map((c) => c.split(";")[0]).join("; ");
  }
  const raw = res.headers.get("set-cookie");
  if (!raw) return "";
  return raw
    .split(/,(?=\s*[^;]+=)/)
    .map((p) => p.split(";")[0].trim())
    .join("; ");
}

if (!confirm) {
  console.error("Xavfsizlik: --confirm kerak");
  process.exit(1);
}

const password = readAdminPassword();
if (!password) {
  console.error("ADMIN_PASSWORD topilmadi (.env.local)");
  process.exit(1);
}

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@luxfabricshop.uz";
  console.log(`Base: ${base}`);

  const loginRes = await fetch(`${base}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const loginText = await loginRes.text();
  let loginJson = {};
  try {
    loginJson = loginText ? JSON.parse(loginText) : {};
  } catch {
    /* ignore */
  }
  if (!loginRes.ok) {
    throw new Error(
      `Login fail ${loginRes.status}: ${loginJson.error || loginText.slice(0, 200)}`
    );
  }
  const cookie = cookieFromLogin(loginRes);
  if (!cookie.includes("lf_admin_session")) {
    throw new Error("Session cookie olinmadi");
  }
  console.log("Login OK");

  const clearRes = await fetch(`${base}/api/admin/warehouse/clear-stock`, {
    method: "POST",
    headers: { Cookie: cookie },
  });
  const clearText = await clearRes.text();
  let clearJson = {};
  try {
    clearJson = clearText ? JSON.parse(clearText) : {};
  } catch {
    clearJson = { raw: clearText.slice(0, 300) };
  }

  console.log(
    JSON.stringify(
      {
        status: clearRes.status,
        ok: clearJson.ok === true,
        previousQtySum: clearJson.previousQtySum,
        updatedRows: clearJson.updatedRows,
        stockRows: clearJson.stockRows,
        remainingQtySum: clearJson.remainingQtySum,
        error: clearJson.error || null,
      },
      null,
      2
    )
  );

  if (!clearRes.ok || clearJson.remainingQtySum !== 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
