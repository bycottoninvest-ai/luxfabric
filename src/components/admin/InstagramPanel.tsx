"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Copy, ExternalLink, Link2, Power } from "lucide-react";
import { instagramBioUrl, productBuyUrl, publicShopOrigin } from "@/lib/ig-caption";

type Product = {
  id: string;
  name: string;
  slug: string;
  priceLabel: string;
  metaCatalogProductId?: string | null;
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
  const [catalogDraft, setCatalogDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(products.map((p) => [p.id, p.metaCatalogProductId || ""]))
  );
  const [catalogMsg, setCatalogMsg] = useState("");

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
  const aiComments = (form.instagram_ai_comments || "true") !== "false";
  const webhook = useMemo(
    () => `${(form.app_domain || domain || "http://localhost:3000").replace(/\/$/, "")}/api/instagram`,
    [form.app_domain, domain]
  );
  const storeBase = useMemo(
    () => publicShopOrigin(form.app_domain || domain),
    [form.app_domain, domain]
  );
  const bioUrl = useMemo(() => instagramBioUrl(form.app_domain || domain), [form.app_domain, domain]);

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

  async function toggleAiComments() {
    const next = aiComments ? "false" : "true";
    await save({ instagram_ai_comments: next });
  }

  async function saveCatalogId(productId: string) {
    setCatalogMsg("");
    try {
      const res = await fetch("/api/admin/products/meta-catalog", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          metaCatalogProductId: catalogDraft[productId] || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Saqlash xatosi");
      setCatalogMsg("Katalog ID saqlandi ✓ (Shopping ochilganda tag uriniladi)");
      router.refresh();
    } catch (e) {
      setCatalogMsg(e instanceof Error ? `❗ ${e.message}` : "❗ Saqlash xatosi");
    }
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
          <div
            className={`mt-2 text-sm font-medium ${
              enabled && aiComments ? "text-emerald-300" : "text-white/50"
            }`}
          >
            AI izoh javobi: {enabled && aiComments ? "yoqilgan" : "o‘chiq"}
          </div>
          <p className="mt-1 text-[11px] text-white/40">
            Webhook <code className="text-white/60">comments</code> + Instagram yoqilgan + AI toggle.
            ChatGPT uchun Vercelda <code className="text-white/60">OPENAI_API_KEY</code> (yo‘q bo‘lsa
            shablon).
          </p>
        </div>
        <div className="flex flex-col gap-2">
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
          <button
            type="button"
            onClick={toggleAiComments}
            disabled={loading || !enabled}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-40 ${
              aiComments ? "bg-pink-500/20 text-pink-200" : "bg-white/10 text-white/70"
            }`}
          >
            AI izoh: {aiComments ? "yoqilgan" : "o‘chiq"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-lf-red/35 bg-lf-red/10 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-lf-red" />
          <h2 className="font-semibold text-white">Link in bio / QR (tavsiya)</h2>
        </div>
        <p className="text-xs leading-relaxed text-white/70">
          IG profil → <strong className="text-white">Tahrirlash</strong> →{" "}
          <strong className="text-white">Havola</strong> — quyidagini qo‘ying. Mijozlar Reels + qizil
          «Sotib olish»ga bir zumda kiradi.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="max-w-full flex-1 break-all rounded-lg bg-black/40 px-2.5 py-2 text-[12px] text-emerald-100">
            {bioUrl}
          </code>
          <button
            type="button"
            onClick={() => copyText(bioUrl, "bio")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-lf-red px-3 py-2 text-xs font-semibold"
          >
            {copied === "bio" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            Nusxa
          </button>
        </div>
        <p className="text-[11px] text-white/45">
          Alternativa (do‘kon bosh):{" "}
          <button
            type="button"
            className="underline text-white/70"
            onClick={() => copyText(`${storeBase}/`, "home")}
          >
            {storeBase}/
          </button>
          {copied === "home" ? " ✓" : ""}
        </p>
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
          <h2 className="font-semibold">2. AI DM + izoh avtojavoblar</h2>
          <label className="flex items-start gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={aiComments}
              onChange={(e) =>
                setForm({ ...form, instagram_ai_comments: e.target.checked ? "true" : "false" })
              }
            />
            <span>
              <span className="font-medium">AI izoh javobi (webhook)</span>
              <span className="mt-0.5 block text-[11px] text-white/45">
                Yangi IG izohga avtomatik javob. Admin Reels → Izohlar → «AI javob» ham shu kalitdan
                foydalanadi (manual tugma doim ishlaydi). Meta da fields:{" "}
                <code className="text-white/70">messages</code>,{" "}
                <code className="text-white/70">comments</code>.
              </span>
            </span>
          </label>
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
              const link = productBuyUrl(storeBase, p.slug);
              return (
                <div
                  key={p.id}
                  className="space-y-2 rounded-xl border border-white/5 px-3 py-2.5 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
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
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={catalogDraft[p.id] ?? ""}
                      onChange={(e) =>
                        setCatalogDraft((d) => ({ ...d, [p.id]: e.target.value }))
                      }
                      placeholder="Meta catalog product_id (ixtiyoriy)"
                      className="min-w-[200px] flex-1 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[11px] outline-none ring-lf-red focus:ring-1"
                    />
                    <button
                      type="button"
                      onClick={() => saveCatalogId(p.id)}
                      className="rounded-lg bg-white/10 px-2 py-1 text-[11px]"
                    >
                      Katalog ID
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {catalogMsg && (
            <p className={`text-xs ${catalogMsg.startsWith("❗") ? "text-rose-400" : "text-emerald-400"}`}>
              {catalogMsg}
            </p>
          )}
        </section>

        <section className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/75">
          <h2 className="font-semibold text-white">3b. Instagram Shopping / product tag (keyingi bosqich)</h2>
          <p className="text-xs leading-relaxed text-white/55">
            Postdagi mahsulot «teg» (shopping tag) uchun: tasdiqlangan Instagram Shop + Commerce Manager
            katalog + Facebook Login +{" "}
            <code className="text-white/80">instagram_shopping_tag_products</code>. Hozirgi Instagram Login
            token bilan product tagging API ishlamaydi. Mahsulotda{" "}
            <code className="text-white/80">metaCatalogProductId</code> maydoni tayyor — katalog ID
            qo‘yilganda (va Shop ochilganda) publish urinadi.
          </p>
          <p className="text-xs text-amber-200/80">
            Hozir ishlaydi: caption CTA + birinchi izoh (Admin «Instagramga joylash»). Ishlamaydi: IG
            appda qizil overlay tugma, Story link-sticker API, telefon orqali qo‘lda joylashda avto-izoh.
          </p>
        </section>

        <section className="rounded-2xl border border-lf-red/30 bg-lf-red/10 p-4 text-sm text-white/75">
          <h2 className="mb-2 font-semibold text-white">100% Meta integratsiya — checklist</h2>
          <ol className="list-decimal space-y-1.5 pl-4">
            <li>Instagram Professional (Business/Creator) + Facebook Page bog‘langan</li>
            <li>
              developers.facebook.com → App → Instagram Graph API / Messenger; ruxsatlar:{" "}
              <code className="text-[11px] text-white/90">instagram_business_content_publish</code>,{" "}
              <code className="text-[11px] text-white/90">instagram_business_manage_comments</code>,{" "}
              <code className="text-[11px] text-white/90">instagram_business_manage_messages</code>
            </li>
            <li>
              Webhook: <span className="text-white">{webhook}</span> · verify token yuqoridagi bilan bir xil ·
              fields: messages, <span className="text-white">comments</span>
            </li>
            <li>Page Access Token / IG Login token → «Ulanishni tekshirish» → «Instagramni yoqish»</li>
            <li>
              <strong className="text-white">app_domain</strong> = public HTTPS (Meta video/rasmni shu yerda
              o‘qiydi). Localhostda publish ishlamaydi — ngrok yoki prod domen.
            </li>
            <li>
              Reels / Stories ro‘yxatida <strong className="text-white">«Instagramga joylash»</strong> — haqiqiy
              akkauntga post + avtomatik birinchi izoh
            </li>
          </ol>
          <p className="mt-2 text-xs text-white/50">
            Eslatma: Story link-sticker Meta API orqali qo‘yilmaydi — video/rasm joylanadi, mahsulot havolasini
            Storyda qo‘lda yoki bio orqali berasiz. Qizil «Sotib olish» — saytda /instagram.
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
