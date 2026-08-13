/**
 * Production webhook o‘rnatish.
 * Ishlatish (token/chat chatga yozilmasin):
 *   set TELEGRAM_BOT_TOKEN=...
 *   set TELEGRAM_ORDERS_CHAT_ID=...
 *   node scripts/setup-telegram-webhook.mjs
 */
const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const secret =
  process.env.TELEGRAM_WEBHOOK_SECRET?.trim() ||
  `lf_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
const url = "https://www.luxfabricshop.uz/api/telegram/webhook";

if (!token) {
  console.error("TELEGRAM_BOT_TOKEN kerak");
  process.exit(1);
}

const params = new URLSearchParams({
  url,
  allowed_updates: JSON.stringify(["message", "callback_query"]),
  drop_pending_updates: "true",
});
if (secret) params.set("secret_token", secret);

const setRes = await fetch(
  `https://api.telegram.org/bot${token}/setWebhook?${params.toString()}`
);
const setJson = await setRes.json();
console.log("setWebhook:", setJson.ok ? "OK" : setJson);

const infoRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
const info = await infoRes.json();
console.log(
  "webhook url:",
  info.result?.url || "(yo‘q)",
  "| pending:",
  info.result?.pending_update_count
);
if (secret) {
  console.log(
    "TELEGRAM_WEBHOOK_SECRET ni Vercel/Admin ga qo‘ying (qiymat shu skript stdout da — faqat bir marta ko‘rsatiladi)"
  );
  console.log("SECRET_LEN=" + secret.length);
  // Don't print full secret to reduce accidental chat paste; write to local gitignored file
  const fs = await import("fs");
  fs.writeFileSync(
    ".telegram-webhook-secret.tmp",
    secret + "\n",
    { encoding: "utf8", mode: 0o600 }
  );
  console.log("Secret yozildi: .telegram-webhook-secret.tmp (gitignore qiling)");
}
