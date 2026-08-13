/**
 * Writes telegram env from stdin JSON: {"token":"...","chatId":"...","secret":"..."}
 * Does not print secrets.
 */
import fs from "fs";

const raw = fs.readFileSync(0, "utf8");
const data = JSON.parse(raw);
const token = String(data.token || "").trim();
const chatId = String(data.chatId || "").trim();
const secret = String(data.secret || "").trim();
if (!token) {
  console.error("token required");
  process.exit(1);
}

const path = ".env.local";
let existing = fs.existsSync(path) ? fs.readFileSync(path, "utf8") : "";
function upsert(text, key, value) {
  const re = new RegExp("^" + key + "=.*$", "m");
  const line = key + "=" + value;
  if (re.test(text)) return text.replace(re, line);
  return (text.trimEnd() + "\n" + line + "\n").replace(/^\n+/, "");
}
existing = upsert(existing, "TELEGRAM_BOT_TOKEN", token);
if (chatId) {
  existing = upsert(existing, "TELEGRAM_ORDERS_CHAT_ID", chatId);
  existing = upsert(existing, "TELEGRAM_DIRECTOR_CHAT_ID", chatId);
}
if (secret) existing = upsert(existing, "TELEGRAM_WEBHOOK_SECRET", secret);
fs.writeFileSync(path, existing.endsWith("\n") ? existing : existing + "\n", {
  encoding: "utf8",
});
console.log("wrote .env.local keys (no values printed)");
