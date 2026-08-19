"use client";

import { useState } from "react";

export function SettingsForm({
  initial,
  smsConfigured = false,
  telegramConfigured = false,
}: {
  initial: Record<string, string>;
  smsConfigured?: boolean;
  /** Token + chat + yoqilgan */
  telegramConfigured?: boolean;
}) {
  const [form, setForm] = useState(initial);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [testPhone, setTestPhone] = useState("");

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
        type="text"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        name={`lf-${key}`}
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
        {field("instagram_page_token", "Page access token", "Meta Developer dan olingan token")}
        {field("instagram_app_secret", "App secret")}
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
        <h2 className="font-semibold">To‘lov — Click + Payme + Paynet</h2>
        {field("click_merchant_id", "Click Merchant ID", "mc.click.uz kabinetdan")}
        {field("click_service_id", "Click Service ID")}
        {field(
          "click_secret_key",
          "Click Secret Key",
          "Yoki Vercel env: CLICK_SECRET_KEY (tavsiya)",
          "password"
        )}
        {field("payme_merchant_id", "Payme Merchant ID", "business.payme.uz")}
        {field(
          "payme_key",
          "Payme Key (secret)",
          "Yoki Vercel: PAYME_KEY — Basic Auth Paycom:KEY",
          "password"
        )}
        {field("paynet_username", "Paynet Username", "Anketaga yozilgan login (masalan luxfabric)")}
        {field(
          "paynet_password",
          "Paynet Password",
          "Yoki Vercel: PAYNET_PASSWORD — Paynetga berilgan parol",
          "password"
        )}
        {field("paynet_service_id", "Paynet service_id", "Paynet bergan ID; ixtiyoriy 1")}
        {field(
          "paynet_merchant_id",
          "Paynet Merchant ID",
          "Ixtiyoriy — app.paynet.uz deep-link uchun"
        )}
        <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-lf-muted space-y-1">
          <p className="text-white/80 font-medium">Click callback (kabinetga qo‘ying):</p>
          <p>
            Prepare:{" "}
            <span className="text-white">
              {(form.app_domain || "https://www.luxfabricshop.uz").replace(/\/$/, "")}
              /api/click/prepare
            </span>
          </p>
          <p>
            Complete:{" "}
            <span className="text-white">
              {(form.app_domain || "https://www.luxfabricshop.uz").replace(/\/$/, "")}
              /api/click/complete
            </span>
          </p>
          <p className="pt-2 text-white/80 font-medium">Payme Merchant API URL:</p>
          <p>
            <span className="text-white">
              {(form.app_domain || "https://www.luxfabricshop.uz").replace(/\/$/, "")}/api/payme
            </span>
          </p>
          <p className="pt-2 text-white/80 font-medium">Paynet API (anketa):</p>
          <p>
            Endpoint:{" "}
            <span className="text-white">
              {(form.app_domain || "https://www.luxfabricshop.uz").replace(/\/$/, "")}/api/paynet
            </span>
          </p>
          <p>
            Field Name: <span className="text-white">order_id</span> · Field Value:{" "}
            <span className="text-white">Buyurtma raqami (LF-xxxxxx)</span>
          </p>
          <p className="pt-1">
            Batafsil: docs/TOLASH-ULASH.md · Ishga: docs/ISHGA-TUSHIRISH-REJA.md
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-lf-card p-4 space-y-3">
        <h2 className="font-semibold">Yetkazish — kuryer kontaktlari</h2>
        <p className="text-xs text-lf-muted">
          Shartnoma / call-center ma’lumotlari (ops uchun). To‘liq API kalitlari emas — BTS/Fargo
          hujjat kelguncha manual trek. Ro‘yxat: docs/ISHGA-TUSHIRISH-REJA.md · katalog:
          bts.uz, fargo.uz, delivery.yandex.uz, uz.post
        </p>
        {field(
          "default_courier_partner",
          "Asosiy kuryer (kod)",
          "Masalan: BTS yoki FARGO — shop-ships default eslatma"
        )}
        {field("courier_bts_contact", "BTS kontakt", "1230 yoki manager telefon / Telegram")}
        {field("courier_fargo_contact", "Fargo kontakt", "+998 71 200 00 37 yoki manager")}
        {field(
          "courier_yandex_contact",
          "Yandex Delivery kontakt",
          "B2B manager / ariza holati eslatmasi"
        )}
        {field(
          "courier_notes",
          "Ops izoh",
          "Pickup soati, COD shartlari, ofis manzili — qisqa"
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-lf-card p-4 space-y-3">
        <h2 className="font-semibold">SMS va Telegram</h2>
        <p className="text-xs text-lf-muted">
          Mijozga SMS/Telegram + direktor botiga har bir buyurtma. SMS kalitlari Vercel env orqali
          (Eskiz) — UI da ko‘rsatilmaydi.{" "}
          <span className="text-white/70">docs/SMS-ULASH.md</span>
        </p>

        <div
          className={`rounded-xl border px-3 py-2.5 text-sm ${
            smsConfigured
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : "border-amber-500/40 bg-amber-500/10 text-amber-200"
          }`}
        >
          SMS holati: {smsConfigured ? "sozlangan" : "yo‘q"}
          {!smsConfigured && (
            <span className="mt-1 block text-xs text-lf-muted">
              Vercel: SMS_PROVIDER=eskiz, ESKIZ_EMAIL, ESKIZ_PASSWORD, ESKIZ_FROM
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="block min-w-[200px] flex-1 space-y-1.5">
            <span className="text-xs uppercase tracking-[0.12em] text-lf-muted">Test telefon</span>
            <input
              type="tel"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="+998 XX XXX XX XX"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2"
            />
          </label>
          <button
            type="button"
            disabled={loading || !testPhone.trim()}
            onClick={async () => {
              setLoading(true);
              setMsg("");
              const res = await fetch("/api/admin/sms-test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: testPhone }),
              });
              const data = await res.json().catch(() => ({}));
              setLoading(false);
              setMsg(res.ok ? `Test SMS yuborildi (${data.phone}) ✓` : data.error || "SMS test xatosi");
            }}
            className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            Test SMS
          </button>
        </div>

        <div
          className={`rounded-xl border px-3 py-2 text-sm ${
            telegramConfigured
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : "border-amber-500/40 bg-amber-500/10 text-amber-200"
          }`}
        >
          Telegram buyurtmalar:{" "}
          {telegramConfigured ? "sozlangan ✓" : "sozlanmagan — token + chat ID kerak"}
        </div>
        {field("telegram_bot_token", "Telegram Bot Token", "BotFather: /newbot", "password")}
        {field(
          "telegram_director_chat_id",
          "Buyurtmalar Chat ID",
          "Botga /start → chat id (bir nechta: vergul). Env: TELEGRAM_ORDERS_CHAT_ID"
        )}
        {field(
          "telegram_orders_chat_id",
          "Buyurtmalar Chat ID (ixtiyoriy alias)",
          "Bo‘sh qoldirilsa yuqoridagi Direktor/Chat ID ishlatiladi"
        )}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.telegram_director_enabled !== "false"}
            onChange={(e) =>
              setForm({ ...form, telegram_director_enabled: e.target.checked ? "true" : "false" })
            }
          />
          Telegram buyurtma xabarlarini yoqish
        </label>
        <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-lf-muted space-y-1">
          <p>1) @BotFather → /newbot → token shu yerga yoki Vercel TELEGRAM_BOT_TOKEN</p>
          <p>2) Botga admin akkauntdan /start</p>
          <p>
            3) Chat ID:{" "}
            <code className="text-white/80">https://api.telegram.org/botTOKEN/getUpdates</code>
          </p>
          <p>4) Webhook (production): docs/TELEGRAM-BOT-ULASH.md</p>
          <p>
            Webhook URL:{" "}
            <code className="text-white/80">
              https://www.luxfabricshop.uz/api/telegram/webhook
            </code>
          </p>
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
              ? `Telegram test xabari yuborildi (${data.orderNumber}) ✓`
              : data.error || "Test xatosi"
          );
        }}
        className="ml-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold disabled:opacity-60"
      >
        Telegram buyurtma test
      </button>
      {msg && <p className="text-sm text-emerald-400">{msg}</p>}
    </form>
  );
}
