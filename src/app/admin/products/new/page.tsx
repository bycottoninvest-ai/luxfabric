"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Sparkles, Trash2, Upload } from "lucide-react";
import {
  GENDERS,
  PRODUCT_COLORS,
  PRODUCT_CATEGORIES,
  SIZES_BY_GENDER,
  type GenderKey,
} from "@/lib/product-options";
import { uploadAdminMedia } from "@/lib/client-upload";

type ImageRow = { url: string; color: string };

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiHint, setAiHint] = useState("");
  const [error, setError] = useState("");
  const [gender, setGender] = useState<GenderKey>("WOMEN");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("129000");
  const [oldPrice, setOldPrice] = useState("");
  const [categorySlug, setCategorySlug] = useState("futbolkalar");
  const [description, setDescription] = useState("");
  const [fabric, setFabric] = useState("100% premium paxta");
  const [care, setCare] = useState("30°C da yuvish, dazmol o‘rtacha");
  const [images, setImages] = useState<ImageRow[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [stockQty, setStockQty] = useState("40");
  const allSizes = SIZES_BY_GENDER[gender];
  const [sizes, setSizes] = useState<string[]>([...SIZES_BY_GENDER.WOMEN]);
  const aiAutoDone = useRef(false);

  /** Mahsulot ranglari — rasmlarga biriktirilganlardan */
  const colors = useMemo(() => {
    const names = [...new Set(images.map((i) => i.color).filter(Boolean))];
    return names.map((color) => {
      const preset = PRODUCT_COLORS.find((p) => p.color === color);
      return { color, colorHex: preset?.colorHex || "#888888" };
    });
  }, [images]);

  const sizeHint = useMemo(() => {
    if (gender === "KIDS") return "Bolalar o‘lchami (sm / height)";
    if (gender === "MEN") return "Erkaklar o‘lchami";
    return "Ayollar o‘lchami";
  }, [gender]);

  const variantCount = Math.max(colors.length, 1) * Math.max(sizes.length, 1);
  const qty = Math.max(0, Number(stockQty) || 0);

  function changeGender(next: GenderKey) {
    setGender(next);
    setSizes([...SIZES_BY_GENDER[next]]);
  }

  function toggleSize(size: string) {
    setSizes((prev) => (prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]));
  }

  function setImageColor(idx: number, color: string) {
    setImages((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], color };
      return next;
    });
  }

  async function runAiDescribe(imageSrc: string, opts?: { force?: boolean }) {
    if (!imageSrc) return;
    if (aiLoading) return;
    setAiLoading(true);
    setAiHint("");
    setError("");
    try {
      const res = await fetch("/api/admin/products/ai-describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: imageSrc,
          gender,
          nameHint: name || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI xatosi");

      const confidence = typeof data.confidence === "number" ? data.confidence : 0;
      if (data.category && (opts?.force || confidence >= 0.55 || !categorySlug)) {
        setCategorySlug(data.category);
      }
      if (data.name && (opts?.force || !name.trim())) {
        setName(String(data.name));
      }
      if (data.description && (opts?.force || !description.trim())) {
        setDescription(String(data.description));
      }
      if (data.material && (opts?.force || fabric === "100% premium paxta")) {
        setFabric(String(data.material));
      }
      if (data.care && (opts?.force || care === "30°C da yuvish, dazmol o‘rtacha")) {
        setCare(String(data.care));
      }

      const srcLabel =
        data.source === "openai"
          ? "ChatGPT"
          : data.source === "template-fallback"
            ? "shablon (AI javob bermadi)"
            : "shablon";
      setAiHint(
        `AI to‘ldirdi (${srcLabel})${
          confidence ? ` · ishonch ${Math.round(confidence * 100)}%` : ""
        }${data.hint ? ` — ${data.hint}` : ""}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI xatosi");
    } finally {
      setAiLoading(false);
    }
  }

  async function uploadFile(file: File) {
    setUploading(true);
    setError("");
    try {
      const url = await uploadAdminMedia(file, "image", "products");
      setImages((prev) => [...prev, { url, color: PRODUCT_COLORS[0].color }]);
      if (!aiAutoDone.current) {
        aiAutoDone.current = true;
        void runAiDescribe(url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yuklash xatosi");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (images.length < 1) throw new Error("Kamida 1 ta rasm qo‘shing");
      if (colors.length < 1) throw new Error("Har bir rasmga rang tanlang");
      if (sizes.length < 1) throw new Error("Kamida 1 ta o‘lcham tanlang");

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          price: Number(price),
          oldPrice: oldPrice ? Number(oldPrice) : null,
          categorySlug,
          gender,
          description,
          fabric,
          care,
          images,
          colors,
          sizes,
          stockCentral: Math.max(0, Number(stockQty) || 0),
          stockBranch: 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 pb-16 lg:pb-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">Yangi mahsulot</h1>
        <p className="mt-1 text-sm text-lf-muted">
          Rasm + rang → o‘lcham → <span className="text-white">ombor soni</span> → saqlash
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <section className="space-y-4 rounded-2xl border border-white/10 bg-lf-card p-5">
          <h2 className="font-semibold">1. Kim uchun?</h2>
          <div className="grid grid-cols-3 gap-2">
            {GENDERS.map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() => changeGender(g.key)}
                className={`rounded-xl border px-3 py-3 text-left ${
                  gender === g.key ? "border-lf-red bg-lf-red/15 text-white" : "border-white/10 text-lf-muted"
                }`}
              >
                <div className="text-sm font-semibold">{g.label}</div>
                <div className="text-[11px] opacity-70">{g.desc}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-white/10 bg-lf-card p-5">
          <h2 className="font-semibold">2. Asosiy ma’lumot</h2>
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-[0.12em] text-lf-muted">Nomi</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-xs uppercase tracking-[0.12em] text-lf-muted">Narx (so‘m)</span>
              <input
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs uppercase tracking-[0.12em] text-lf-muted">Eski narx (ixtiyoriy)</span>
              <input
                value={oldPrice}
                onChange={(e) => setOldPrice(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2"
              />
            </label>
          </div>
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-[0.12em] text-lf-muted">Kategoriya</span>
            <select
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2"
            >
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-[0.12em] text-lf-muted">Tavsif</span>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-xs uppercase tracking-[0.12em] text-lf-muted">Mato / material</span>
              <input
                required
                value={fabric}
                onChange={(e) => setFabric(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs uppercase tracking-[0.12em] text-lf-muted">Parvarish</span>
              <input
                required
                value={care}
                onChange={(e) => setCare(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2"
              />
            </label>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-white/10 bg-lf-card p-5">
          <h2 className="font-semibold">3. Rasmlar + rang</h2>
          <p className="text-xs text-lf-muted">
            Rasm yuklang — o‘ngdagi kichik ranglardan tanlang. Har bir rasm = bitta rang. Birinchi rasm
            yuklanganda AI avtomatik kategoriya/tavsif to‘ldirishi mumkin.
          </p>

          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-lf-red px-4 py-2.5 text-sm font-semibold">
              <Upload className="h-4 w-4" />
              {uploading ? "Yuklanmoqda..." : "Rasm yuklash"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadFile(f);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              type="button"
              disabled={aiLoading || images.length === 0}
              onClick={() => void runAiDescribe(images[0]?.url || "", { force: true })}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4 text-amber-300" />
              {aiLoading ? "AI o‘qimoqda..." : "AI: rasmdan to‘ldirish"}
            </button>
          </div>

          {aiHint && <p className="text-xs text-emerald-300/90">{aiHint}</p>}

          <div className="flex gap-2">
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Yoki rasm URL qo‘shing"
              className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2"
            />
            <button
              type="button"
              onClick={() => {
                if (!imageUrl.trim()) return;
                const url = imageUrl.trim();
                setImages((p) => [...p, { url, color: PRODUCT_COLORS[0].color }]);
                setImageUrl("");
                if (!aiAutoDone.current) {
                  aiAutoDone.current = true;
                  void runAiDescribe(url);
                }
              }}
              className="rounded-xl border border-white/10 px-3 text-sm"
            >
              Qo‘shish
            </button>
          </div>

          {images.length === 0 && (
            <p className="rounded-xl border border-dashed border-white/15 px-3 py-6 text-center text-sm text-lf-muted">
              Hali rasm yo‘q
            </p>
          )}

          <div className="space-y-3">
            {images.map((img, idx) => (
              <div
                key={`${img.url}-${idx}`}
                className="flex gap-3 rounded-xl border border-white/10 bg-black/25 p-2 sm:gap-4 sm:p-3"
              >
                {/* Chap: rasm */}
                <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-lg border border-white/10 sm:h-36 sm:w-36">
                  <Image
                    src={img.url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="144px"
                    unoptimized={img.url.startsWith("/")}
                  />
                  <button
                    type="button"
                    onClick={() => setImages((p) => p.filter((_, i) => i !== idx))}
                    className="absolute right-1 top-1 rounded-md bg-black/75 p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <div className="absolute bottom-1 left-1 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-medium">
                    {img.color || "—"}
                  </div>
                </div>

                {/* O‘ng: kichik 20 rang — bo‘sh joyda */}
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 text-[10px] uppercase tracking-[0.12em] text-white/40">
                    Rang tanlang
                  </div>
                  <div className="grid grid-cols-5 gap-1 sm:grid-cols-5 md:grid-cols-10">
                    {PRODUCT_COLORS.map((c) => {
                      const active = img.color === c.color;
                      return (
                        <button
                          key={c.color}
                          type="button"
                          title={c.color}
                          onClick={() => setImageColor(idx, c.color)}
                          className={`flex flex-col items-center gap-0.5 rounded-md border p-1 transition ${
                            active
                              ? "border-lf-red bg-lf-red/20"
                              : "border-white/10 hover:border-white/30"
                          }`}
                        >
                          <span
                            className="h-5 w-5 rounded-full border border-white/25 shadow-inner sm:h-6 sm:w-6"
                            style={{ backgroundColor: c.colorHex }}
                          />
                          <span className="max-w-full truncate text-[8px] leading-tight text-white/70 sm:text-[9px]">
                            {c.color}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {colors.length > 0 && (
            <p className="text-xs text-lf-muted">
              Model ranglari: {colors.map((c) => c.color).join(", ")}
            </p>
          )}
        </section>

        <section className="space-y-3 rounded-2xl border border-white/10 bg-lf-card p-5">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-semibold">4. To‘liq o‘lchamlar</h2>
              <p className="text-xs text-lf-muted">{sizeHint}</p>
            </div>
            <button type="button" className="text-xs text-lf-red" onClick={() => setSizes([...allSizes])}>
              Hammasini belgilash
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {allSizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => toggleSize(size)}
                className={`min-w-12 rounded-xl border px-3 py-2.5 text-sm font-semibold ${
                  sizes.includes(size) ? "border-lf-red bg-lf-red text-white" : "border-white/10"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-lf-red/30 bg-lf-card p-5">
          <h2 className="font-semibold">5. Ombor soni</h2>
          <p className="text-xs text-lf-muted">
            Har bir rang + o‘lcham uchun nechta dona bor — shu yerga yozing. Hozircha faqat markaziy omborga
            tushadi; filiallarni keyinroq alohida qilamiz.
          </p>
          <label className="block max-w-xs space-y-1.5">
            <span className="text-xs uppercase tracking-[0.12em] text-lf-muted">Dona (markaziy ombor)</span>
            <input
              required
              type="number"
              min={0}
              value={stockQty}
              onChange={(e) => setStockQty(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-2xl font-bold outline-none ring-lf-red focus:ring-2"
            />
          </label>
          <p className="text-xs text-white/50">
            {colors.length} rang × {sizes.length} o‘lcham = {variantCount} variant · har biriga{" "}
            <span className="text-white font-semibold">{qty}</span> dona
          </p>
        </section>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <button
          type="submit"
          disabled={loading || uploading || aiLoading}
          className="w-full rounded-xl bg-lf-red py-3.5 text-sm font-semibold disabled:opacity-60"
        >
          {loading ? "Saqlanmoqda..." : "Saqlash va barcha kanallarga tarqatish"}
        </button>
      </form>
    </div>
  );
}
