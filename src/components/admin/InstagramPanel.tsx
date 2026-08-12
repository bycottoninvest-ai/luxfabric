"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Copy, ExternalLink, Power } from "lucide-react";

type Product = {
  id: string;
  name: string;
  slug: string;
  priceLabel: string;
};

export function InstagramPanel({
  initial,
  domain,
  products,
}: {
  initial: Record<string, string>;
  domain: string;
  products: Product[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState(initial);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState("");
  const [testMsg, setTestMsg] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const ok = searchParams.get("oauth");
    const err = searchParams.get("oauth_error");
    if (ok === "ok") {
      setTestMsg("OAuth OK ✓ Token saqlandi — «Ulanishni tekshirish» ni bosing");
      router.replace("/admin/instagram");
    } else if (err) {
      setTestMsg(`❗ OAuth: ${err}`);
      router.replace("/admin/instagram");
    }
  }, [searchParams, router]);

  const enabled = form.instagram_enabled === "true";
  const webhook = useMemo(
    () => `${(form.app_domain || domain || "http://localhost:3000").replace(/\/$/, "")}/api/instagram`,
    [form.app_domain, domain]
  );
  const storeBase = useMemo(
    () => (form.app_domain || domain || "http://localhost:3000").replace(/\/$/, ""),
    [form.app_domain, domain]
  );

  async function save(extra?: Record<string, string>) {
    setLoading(true);
    setMsg("");
    const payload = { ...form, ...extra };
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (res.ok) {
      setForm(payload);
      setMsg("Saqlandi ✓");
      router.refresh();
    } else {
      setMsg("Xatolik yuz berdi");
    }
  }

  async function toggleEnabled() {
    const next = enabled ? "false" : "true";
    await save({ instagram_enabled: next });
  }

  async function testConnection() {
    setTesting(true);
    setTestMsg("");
    try {
      const res = await fetch("/api/admin/instagram/publish?action=test");
      const data = await res.json();
      if (data.ok) {
        setForm((f) => ({ ...f, instagram_ig_user_id: data.igUserId || f.instagram_ig_user_id }));
        setTestMsg(
          `Ulanish OK ✓ @${data.username || "?"} · IG ID: ${data.igUserId}${
            data.accountType ? ` · ${data.accountType}` : ""
          }`
        );
      } else {
        setTestMsg(`❗ ${data.error || "Ulanish muvaffaqiyatsiz"}`);
      }
    } catch (e) {
      setTestMsg(e instanceof Error ? `❗ ${e.message}` : "❗ Test xatosi");
    } finally {
      setTesting(false);
    }
  }

  async function copyText(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 1500);
  }

  const field = (key: string, label: string, hint?: string, type = "text") => (
    <label className="block space-y-1.5">
      <span className="text-xs uppercase tracking-[0.12em] text-white/45">{label}</span>
      <input
        type={type}
        value={form[key] || ""}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2"
      />
      {hint && <span className="text-[11px] text-white/40">{hint}</span>}
    </label>
  );

  const area = (key: string, label: string) => (
    <label className="block space-y-1.5">
      <span className="text-xs uppercase tracking-[0.12em] text-white/45">{label}</span>
      <textarea
        rows={3}
        value={form[key] || ""}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2"
      />
    </label>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div>
          <div className="text-xs text-white/45">Integratsiya holati</div>
          <div className={`mt-1 text-lg font-semibold ${enabled ? "text-emerald-400" : "text-amber-300"}`}>
            {enabled ? "Yoqilgan — real DM ishlaydi" : "O‘chiq — faqat demo"}
          </div>
          <div className="mt-1 text-xs text-white/45">
            @{form.instagram_username || "luxfabricshop.uz"}
          </div>
        </div>
        <button
          type="button"
          onClick={toggleEnabled}
          disabled={loading}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${
            enabled ? "bg-emerald-500/20 text-emerald-300" : "bg-lf-red text-white"
          }`}
        >
          <Power className="h-4 w-4" />
          {enabled ? "O‘chirish" : "Instagramni yoqish"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-2 text-xs text-white/45">Webhook URL (Meta ga qo‘ying)</div>
          <div className="break-all text-sm text-white/80">{webhook}</div>
          <button
            type="button"
            onClick={() => copyText(webhook, "webhook")}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs"
          >
            {copied === "webhook" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            Nusxa
          </button>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-2 text-xs text-white/45">Tezkor havolalar</div>
          <div className="flex flex-wrap gap-2">
            <Link href="/instagram" className="rounded-lg bg-white/10 px-3 py-1.5 text-xs inline-flex items-center gap-1">
              Reels <ExternalLink className="h-3 w-3" />
            </Link>
            <Link href="/instagram/dm" className="rounded-lg bg-white/10 px-3 py-1.5 text-xs inline-flex items-center gap-1">
              AI DM demo <ExternalLink className="h-3 w-3" />
            </Link>
            <Link href="/admin/settings" className="rounded-lg bg-white/10 px-3 py-1.5 text-xs">
              Umumiy sozlamalar
            </Link>
          </div>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="space-y-4"
      >
        <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="font-semibold">1. Meta / Instagram ulash</h2>
          {field("instagram_username", "Instagram username", "@sizning_akkaunt")}
          {field("instagram_verify_token", "Verify token", "Meta Webhook verify token bilan bir xil")}
          {field(
            "instagram_page_token",
            "Access Token (Page yoki Instagram Login)",
            "Page Access Token (Graph Explorer) yoki Instagram Login token — publish uchun",
            "password"
          )}
          {field(
            "instagram_app_secret",
            "Instagram App Secret",
            "Meta → Instagram API Setup → «Показать». Token olishdan oldin Saqlash",
            "password"
          )}
          {field(
            "instagram_ig_user_id",
            "Instagram Business User ID",
            "Bo‘sh qoldirsangiz «Ulanishni tekshirish» avtomatik topadi"
          )}
          {field(
            "app_domain",
            "Sayt domeni (HTTPS, public)",
            "Muhim: Meta localhost o‘qimaydi. Prod: https://luxfabricshop.uz yoki ngrok"
          )}
          <div className="flex flex-wrap gap-2">
            <a
              href="/api/admin/instagram/oauth/start"
              className="rounded-xl bg-lf-red px-4 py-2.5 text-sm font-semibold text-white"
            >
              Instagram token olish (OAuth)
            </a>
            <button
              type="button"
              disabled={testing || loading}
              onClick={testConnection}
              className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {testing ? "Tekshirilmoqda..." : "Ulanishni tekshirish"}
            </button>
          </div>
          <p className="text-[11px] text-white/40">
            OAuth redirect (Meta ga qo‘ying):{" "}
            <code className="text-white/70">
              https://www.luxfabricshop.uz/api/admin/instagram/oauth/callback
            </code>
          </p>
          {testMsg && (
            <p className={`text-sm ${testMsg.startsWith("❗") ? "text-rose-400" : "text-emerald-400"}`}>
              {testMsg}
            </p>
          )}
        </section>

        <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="font-semibold">2. AI DM avtojavoblar (panelda boshqarasiz)</h2>
          {area("instagram_dm_welcome", "Salomlashuv")}
          {area("instagram_auto_reply_price", "Narx so‘ralganda")}
          {area("instagram_auto_reply_size", "O‘lcham so‘ralganda")}
          {area("instagram_auto_reply_delivery", "Yetkazib berish so‘ralganda")}
          {area("instagram_auto_reply_default", "Boshqa savollarga")}
        </section>

        <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="font-semibold">3. Shop Now mahsulot havolalari</h2>
          <div className="space-y-2">
            {products.map((p) => {
              const link = `${storeBase}/product/${p.slug}?from=instagram`;
              return (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 px-3 py-2.5 text-sm"
                >
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-white/45">{p.priceLabel}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="max-w-[220px] truncate text-[11px] text-white/50">{link}</code>
                    <button
                      type="button"
                      onClick={() => copyText(link, p.id)}
                      className="rounded-lg bg-white/10 px-2 py-1 text-[11px]"
                    >
                      {copied === p.id ? "OK" : "Nusxa"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-lf-red/30 bg-lf-red/10 p-4 text-sm text-white/75">
          <h2 className="mb-2 font-semibold text-white">100% Meta integratsiya — checklist</h2>
          <ol className="list-decimal space-y-1.5 pl-4">
            <li>Instagram Professional (Business/Creator) + Facebook Page bog‘langan</li>
            <li>
              developers.facebook.com → App → Instagram Graph API / Messenger; ruxsatlar:{" "}
              <code className="text-[11px] text-white/90">instagram_basic</code>,{" "}
              <code className="text-[11px] text-white/90">instagram_content_publish</code>,{" "}
              <code className="text-[11px] text-white/90">pages_messaging</code> /{" "}
              <code className="text-[11px] text-white/90">instagram_manage_messages</code>
            </li>
            <li>
              Webhook: <span className="text-white">{webhook}</span> · verify token yuqoridagi bilan bir xil ·
              fields: messages
            </li>
            <li>Page Access Token ni yozing → «Ulanishni tekshirish» → «Instagramni yoqish»</li>
            <li>
              <strong className="text-white">app_domain</strong> = public HTTPS (Meta video/rasmni shu yerda
              o‘qiydi). Localhostda publish ishlamaydi — ngrok yoki prod domen.
            </li>
            <li>
              Reels / Stories ro‘yxatida <strong className="text-white">«Instagramga joylash»</strong> — haqiqiy
              akkauntga post
            </li>
          </ol>
          <p className="mt-2 text-xs text-white/50">
            Eslatma: Story link-sticker Meta API orqali qo‘yilmaydi — video/rasm joylanadi, mahsulot havolasini
            Storyda qo‘lda yoki bio orqali berasiz.
          </p>
        </section>

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-lf-red px-5 py-3 text-sm font-semibold disabled:opacity-60"
        >
          {loading ? "Saqlanmoqda..." : "Barcha Instagram sozlamalarini saqlash"}
        </button>
        {msg && <p className="text-sm text-emerald-400">{msg}</p>}
      </form>
    </div>
  );
}
