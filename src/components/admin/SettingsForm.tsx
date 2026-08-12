"use client";

import { useState } from "react";

export function SettingsForm({ initial }: { initial: Record<string, string> }) {
  const [form, setForm] = useState(initial);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    setMsg(res.ok ? "Saqlandi ✓" : "Xatolik yuz berdi");
  }

  const field = (key: string, label: string, hint?: string, type = "text") => (
    <label className="block space-y-1.5">
      <span className="text-xs uppercase tracking-[0.12em] text-lf-muted">{label}</span>
      <input
        type={type}
        value={form[key] || ""}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2"
      />
      {hint && <span className="text-[11px] text-lf-muted">{hint}</span>}
    </label>
  );

  return (
    <form onSubmit={save} className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-lf-card p-4 space-y-3">
        <h2 className="font-semibold">Domen va brend</h2>
        {field("app_domain", "Asosiy domen", "Masalan: https://luxfabricshop.uz")}
        {field("app_name", "Brend nomi")}
        {field("support_phone", "Support telefon")}
      </section>

      <section className="rounded-2xl border border-white/10 bg-lf-card p-4 space-y-3">
        <h2 className="font-semibold">Instagram / Meta Graph API</h2>
        {field("instagram_username", "Instagram username")}
        {field("instagram_verify_token", "Verify token (webhook)")}
        {field("instagram_page_token", "Page access token", "Meta Developer dan olingan token", "password")}
        {field("instagram_app_secret", "App secret", undefined, "password")}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.instagram_enabled === "true"}
            onChange={(e) => setForm({ ...form, instagram_enabled: e.target.checked ? "true" : "false" })}
          />
          Instagram integratsiyani yoqish
        </label>
        <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-lf-muted">
          Webhook URL: <span className="text-white">{(form.app_domain || "https://luxfabricshop.uz").replace(/\/$/, "")}/api/instagram</span>
          <br />
          Callback: Meta App → Webhooks → Page/Instagram → messages, messaging_postbacks,{" "}
          <span className="text-white">comments</span>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-lf-card p-4 space-y-3">
        <h2 className="font-semibold">To‘lov — Click</h2>
        {field("click_merchant_id", "Click Merchant ID", "merchant.click.uz kabinetdan")}
        {field("click_service_id", "Click Service ID")}
        {field(
          "click_secret_key",
          "Click Secret Key",
          "Yoki Vercel env: CLICK_SECRET_KEY (tavsiya)",
          "password"
        )}
        {field("payme_merchant_id", "Payme Merchant ID")}
        <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-lf-muted space-y-1">
          <p>
            Prepare URL:{" "}
            <span className="text-white">
              {(form.app_domain || "https://www.luxfabricshop.uz").replace(/\/$/, "")}
              /api/click/prepare
            </span>
          </p>
          <p>
            Complete URL:{" "}
            <span className="text-white">
              {(form.app_domain || "https://www.luxfabricshop.uz").replace(/\/$/, "")}
              /api/click/complete
            </span>
          </p>
          <p className="pt-1">
            Yoki ikkalasi uchun bitta:{" "}
            <span className="text-white">
              {(form.app_domain || "https://www.luxfabricshop.uz").replace(/\/$/, "")}/api/click
            </span>
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-lf-card p-4 space-y-3">
        <h2 className="font-semibold">SMS va Telegram</h2>
        <p className="text-xs text-lf-muted">
          Mijozga SMS/Telegram + direktor botiga har bir buyurtma (to‘langan/to‘lanmagan, rasm, telefon,
          manzil, statistika).
        </p>
        {field("sms_api_key", "SMS API key (Eskiz / Playmobile)", undefined, "password")}
        {field("sms_sender", "SMS sender nomi", "Masalan: LUXFABRIC")}
        {field("telegram_bot_token", "Telegram Bot Token", "BotFather: /newbot", "password")}
        {field(
          "telegram_director_chat_id",
          "Direktor Chat ID",
          "Botga /start yozing → chat id (bir nechta bo‘lsa vergul bilan). Masalan: 123456789"
        )}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.telegram_director_enabled !== "false"}
            onChange={(e) =>
              setForm({ ...form, telegram_director_enabled: e.target.checked ? "true" : "false" })
            }
          />
          Direktor Telegram xabarlarini yoqish
        </label>
        <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-lf-muted space-y-1">
          <p>1) @BotFather dan bot oling → token shu yerga</p>
          <p>2) Botga direktor akkauntidan /start bosing</p>
          <p>
            3) Chat ID: brauzerda oching{" "}
            <code className="text-white/80">https://api.telegram.org/botTOKEN/getUpdates</code>
          </p>
          <p>4) message.chat.id ni «Direktor Chat ID» ga yozing → Saqlash</p>
        </div>
      </section>

      <button
        type="submit"
        disabled={loading}
        className="rounded-xl bg-lf-red px-5 py-3 text-sm font-semibold disabled:opacity-60"
      >
        {loading ? "Saqlanmoqda..." : "Saqlash"}
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setMsg("");
          await fetch("/api/admin/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          });
          const res = await fetch("/api/admin/telegram-test", { method: "POST" });
          const data = await res.json();
          setLoading(false);
          setMsg(
            res.ok
              ? `Direktor test xabari yuborildi (${data.orderNumber}) ✓`
              : data.error || "Test xatosi"
          );
        }}
        className="ml-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold disabled:opacity-60"
      >
        Direktor Telegram test
      </button>
      {msg && <p className="text-sm text-emerald-400">{msg}</p>}
    </form>
  );
}
