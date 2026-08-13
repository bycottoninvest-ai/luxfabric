"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Star, Trash2, Upload } from "lucide-react";
import { PRODUCT_CATEGORIES, GENDER_LABEL, PRODUCT_COLORS } from "@/lib/product-options";
import { uploadAdminMedia } from "@/lib/client-upload";

type SizeLine = {
  variantId: string;
  color: string;
  size: string;
  quantity: number;
  byWarehouse: Record<string, number>;
};

type WarehouseOpt = {
  id: string;
  name: string;
  city: string;
  isCentral: boolean;
};

type ImageRow = {
  id?: string;
  url: string;
  color: string;
  sortOrder: number;
};

type ProductEdit = {
  id: string;
  name: string;
  slug: string;
  price: number;
  oldPrice: number | null;
  description: string;
  fabric: string;
  care: string;
  status: string;
  featured: boolean;
  gender: string;
  categorySlug: string;
  images: ImageRow[];
  sizes: SizeLine[];
  warehouses: WarehouseOpt[];
};

export function ProductEditForm({ product }: { product: ProductEdit }) {
  const router = useRouter();
  const centralId =
    product.warehouses.find((w) => w.isCentral)?.id || product.warehouses[0]?.id || "";

  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(String(product.price));
  const [oldPrice, setOldPrice] = useState(product.oldPrice ? String(product.oldPrice) : "");
  const [description, setDescription] = useState(product.description);
  const [fabric, setFabric] = useState(product.fabric);
  const [care, setCare] = useState(product.care);
  const [status, setStatus] = useState(product.status);
  const [categorySlug, setCategorySlug] = useState(product.categorySlug);
  const [featured, setFeatured] = useState(product.featured);
  const [warehouseId, setWarehouseId] = useState(centralId);
  const [qtyDrafts, setQtyDrafts] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const s of product.sizes) m[s.variantId] = String(s.quantity);
    return m;
  });
  const [images, setImages] = useState<ImageRow[]>(() =>
    product.images.map((img, i) => ({
      id: img.id,
      url: img.url,
      color: img.color || PRODUCT_COLORS[0].color,
      sortOrder: img.sortOrder ?? i,
    }))
  );
  const [uploading, setUploading] = useState(false);
  const [replacingIdx, setReplacingIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [stockBusy, setStockBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const orderedSizes = useMemo(() => {
    const order = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"];
    return [...product.sizes].sort((a, b) => {
      const ai = order.indexOf(a.size);
      const bi = order.indexOf(b.size);
      if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      return a.color.localeCompare(b.color, "uz");
    });
  }, [product.sizes]);

  const colorNames = useMemo(
    () => [...new Set(images.map((i) => i.color).filter(Boolean))],
    [images]
  );

  function loadDraftsForWarehouse(whId: string) {
    const m: Record<string, string> = {};
    for (const s of product.sizes) {
      m[s.variantId] = String(s.byWarehouse[whId] ?? 0);
    }
    setQtyDrafts(m);
  }

  const multiColor = orderedSizes.some((x) => x.color !== orderedSizes[0]?.color);

  function setImageColor(idx: number, color: string) {
    setImages((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], color };
      return next;
    });
  }

  function setPrimary(idx: number) {
    if (idx <= 0) return;
    setImages((prev) => {
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.unshift(item);
      return next.map((img, i) => ({ ...img, sortOrder: i }));
    });
    setMsg("Asosiy rasm belgilandi — «Ma’lumotni saqlash» ni bosing");
  }

  function removeImage(idx: number) {
    if (images.length <= 1) {
      setError("Kamida 1 ta rasm qolishi kerak");
      return;
    }
    setImages((prev) => prev.filter((_, i) => i !== idx).map((img, i) => ({ ...img, sortOrder: i })));
    setMsg("Rasm o‘chirildi — «Ma’lumotni saqlash» ni bosing");
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMsg("");
    try {
      if (images.length < 1) throw new Error("Kamida 1 ta rasm qo‘shing");
      const res = await fetch("/api/admin/products/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          id: product.id,
          name: name.trim(),
          price: Number(price),
          oldPrice: oldPrice ? Number(oldPrice) : null,
          description: description.trim(),
          fabric: fabric.trim(),
          care: care.trim(),
          status,
          categorySlug,
          featured,
          images: images.map((img) => ({
            ...(img.id ? { id: img.id } : {}),
            url: img.url,
            color: img.color || null,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Saqlash xatosi");
      if (Array.isArray(data.images)) {
        setImages(
          data.images.map((img: { id: string; url: string; color: string | null; sortOrder: number }) => ({
            id: img.id,
            url: img.url,
            color: img.color || PRODUCT_COLORS[0].color,
            sortOrder: img.sortOrder,
          }))
        );
      }
      setMsg("Mahsulot saqlandi");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setLoading(false);
    }
  }

  async function addImages(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    setMsg("");
    try {
      const added: ImageRow[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadAdminMedia(file, "image", "products");
        added.push({
          url,
          color: PRODUCT_COLORS[0].color,
          sortOrder: images.length + added.length,
        });
      }
      setImages((prev) => [...prev, ...added].map((img, i) => ({ ...img, sortOrder: i })));
      setMsg(`${added.length} ta rasm qo‘shildi — «Ma’lumotni saqlash» ni bosing`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rasm yuklash xatosi");
    } finally {
      setUploading(false);
    }
  }

  async function replaceImage(idx: number, file: File) {
    setReplacingIdx(idx);
    setError("");
    setMsg("");
    try {
      const url = await uploadAdminMedia(file, "image", "products");
      setImages((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], url };
        return next;
      });
      setMsg("Rasm almashtirildi — «Ma’lumotni saqlash» ni bosing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rasm yuklash xatosi");
    } finally {
      setReplacingIdx(null);
    }
  }

  async function saveSizeQty(variantId: string) {
    if (!warehouseId) {
      setError("Ombor topilmadi");
      return;
    }
    const quantity = Math.max(0, Math.floor(Number(qtyDrafts[variantId]) || 0));
    setStockBusy(variantId);
    setError("");
    setMsg("");
    try {
      const res = await fetch("/api/admin/warehouses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warehouseId, variantId, quantity }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Qoldiq saqlanmadi");
      setQtyDrafts((d) => ({ ...d, [variantId]: String(quantity) }));
      const line = orderedSizes.find((s) => s.variantId === variantId);
      setMsg(
        `Qoldiq: ${line ? `${line.color}/${line.size}` : variantId} → ${quantity}`
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setStockBusy(null);
    }
  }

  async function saveAllSizes() {
    if (!warehouseId) {
      setError("Ombor topilmadi");
      return;
    }
    setStockBusy("all");
    setError("");
    setMsg("");
    try {
      for (const line of orderedSizes) {
        const quantity = Math.max(0, Math.floor(Number(qtyDrafts[line.variantId]) || 0));
        const res = await fetch("/api/admin/warehouses", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            warehouseId,
            variantId: line.variantId,
            quantity,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `${line.size} saqlanmadi`);
      }
      setMsg("Barcha o‘lchamlar saqlandi");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setStockBusy(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pb-16">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">
            O‘zgartirish
          </h1>
          <p className="mt-1 text-sm text-lf-muted">
            {product.slug} · {GENDER_LABEL[product.gender] || product.gender}
          </p>
        </div>
        <Link
          href="/admin/products"
          className="rounded-xl border border-white/10 px-3 py-2 text-sm text-lf-muted hover:bg-white/5"
        >
          ← Ro‘yxat
        </Link>
      </div>

      <form onSubmit={saveProduct} className="space-y-4 rounded-2xl border border-white/10 bg-lf-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Rasmlar</h2>
          <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-xs font-medium tabular-nums text-lf-muted">
            {images.length} ta rasm
          </span>
        </div>
        <p className="text-xs text-lf-muted">
          Barcha sotuvdagi rasmlar. Birinchisi asosiy. Har bir rasmga rang biriktirishingiz mumkin
          (yaratish oqimidagi kabi).
        </p>

        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-lf-red px-3 py-2 text-sm font-semibold">
            <Upload className="h-4 w-4" />
            {uploading ? "Yuklanmoqda…" : "Rasm qo‘shish"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={uploading || replacingIdx !== null}
              onChange={(e) => {
                void addImages(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        {images.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/15 px-3 py-6 text-center text-sm text-lf-muted">
            Hali rasm yo‘q
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((img, idx) => (
              <div
                key={img.id || `${img.url}-${idx}`}
                className={`overflow-hidden rounded-xl border bg-black/25 ${
                  idx === 0 ? "border-lf-red/60" : "border-white/10"
                }`}
              >
                <div className="relative aspect-[3/4] w-full bg-lf-surface">
                  <Image
                    src={img.url}
                    alt={name || product.name}
                    fill
                    className="object-cover"
                    sizes="160px"
                    unoptimized={img.url.startsWith("/")}
                  />
                  {idx === 0 && (
                    <span className="absolute left-1.5 top-1.5 rounded bg-lf-red px-1.5 py-0.5 text-[10px] font-semibold">
                      Asosiy
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute right-1.5 top-1.5 rounded-md bg-black/75 p-1 hover:bg-black/90"
                    title="O‘chirish"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  {img.color && (
                    <div className="absolute bottom-1.5 left-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-medium">
                      {img.color}
                    </div>
                  )}
                </div>
                <div className="space-y-2 p-2">
                  <div className="flex flex-wrap gap-1">
                    {idx !== 0 && (
                      <button
                        type="button"
                        onClick={() => setPrimary(idx)}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] hover:bg-white/10"
                      >
                        <Star className="h-3 w-3" />
                        Asosiy qilish
                      </button>
                    )}
                    <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] hover:bg-white/10">
                      <Upload className="h-3 w-3" />
                      {replacingIdx === idx ? "…" : "Almashtirish"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploading || replacingIdx !== null}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void replaceImage(idx, f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  <div>
                    <div className="mb-1 text-[9px] uppercase tracking-[0.12em] text-white/40">
                      Rang
                    </div>
                    <div className="grid grid-cols-5 gap-0.5">
                      {PRODUCT_COLORS.map((c) => {
                        const active = img.color === c.color;
                        return (
                          <button
                            key={c.color}
                            type="button"
                            title={c.color}
                            onClick={() => setImageColor(idx, c.color)}
                            className={`flex items-center justify-center rounded border p-0.5 ${
                              active
                                ? "border-lf-red bg-lf-red/20"
                                : "border-white/10 hover:border-white/30"
                            }`}
                          >
                            <span
                              className="h-4 w-4 rounded-full border border-white/25"
                              style={{ backgroundColor: c.colorHex }}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {colorNames.length > 0 && (
          <p className="text-xs text-lf-muted">Model ranglari: {colorNames.join(", ")}</p>
        )}

        <h2 className="pt-2 font-semibold">Asosiy ma’lumot</h2>
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-[0.12em] text-lf-muted">Nomi</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-lf-red"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-[0.12em] text-lf-muted">Narx (so‘m)</span>
            <input
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-lf-red"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-[0.12em] text-lf-muted">Eski narx</span>
            <input
              value={oldPrice}
              onChange={(e) => setOldPrice(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-lf-red"
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-[0.12em] text-lf-muted">Kategoriya</span>
            <select
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm"
            >
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-[0.12em] text-lf-muted">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="DRAFT">DRAFT</option>
              <option value="HIDDEN">HIDDEN</option>
            </select>
          </label>
        </div>
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-[0.12em] text-lf-muted">Tavsif</span>
          <textarea
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-lf-red"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-[0.12em] text-lf-muted">Mato</span>
            <input
              required
              value={fabric}
              onChange={(e) => setFabric(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-[0.12em] text-lf-muted">Parvarish</span>
            <input
              required
              value={care}
              onChange={(e) => setCare(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm"
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm text-lf-muted">
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
            className="rounded border-white/20"
          />
          Featured (asosiy sahifa)
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-lf-red px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {loading ? "Saqlanmoqda…" : "Ma’lumotni saqlash"}
        </button>
      </form>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-lf-card p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-semibold">O‘lcham bo‘yicha qoldiq</h2>
            <p className="text-xs text-lf-muted">
              Har bir o‘lcham uchun alohida son · tanlangan omborga yoziladi (odatda markaz)
            </p>
          </div>
          <button
            type="button"
            disabled={stockBusy === "all" || !warehouseId}
            onClick={() => void saveAllSizes()}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10 disabled:opacity-50"
          >
            {stockBusy === "all" ? "…" : "Hammasini saqlash"}
          </button>
        </div>

        {product.warehouses.length > 0 && (
          <label className="block max-w-sm space-y-1">
            <span className="text-xs uppercase tracking-[0.12em] text-lf-muted">Ombor</span>
            <select
              value={warehouseId}
              onChange={(e) => {
                const next = e.target.value;
                setWarehouseId(next);
                loadDraftsForWarehouse(next);
                setMsg("");
              }}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm"
            >
              {product.warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.city}
                  {w.isCentral ? " (markaz)" : ""} — {w.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="space-y-2">
          {orderedSizes.map((line) => {
            const label = multiColor ? `${line.color} / ${line.size}` : line.size;
            return (
              <div
                key={line.variantId}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-white/5 bg-black/20 px-3 py-2"
              >
                <span className="min-w-[4.5rem] text-sm font-medium">{label}</span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={qtyDrafts[line.variantId] ?? "0"}
                  onChange={(e) =>
                    setQtyDrafts((d) => ({ ...d, [line.variantId]: e.target.value }))
                  }
                  className="w-24 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm tabular-nums"
                />
                <button
                  type="button"
                  disabled={stockBusy === line.variantId || !warehouseId}
                  onClick={() => void saveSizeQty(line.variantId)}
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/15 disabled:opacity-50"
                >
                  {stockBusy === line.variantId ? "…" : "Saqlash"}
                </button>
              </div>
            );
          })}
          {orderedSizes.length === 0 && (
            <p className="text-sm text-lf-muted">Bu mahsulotda variant yo‘q</p>
          )}
        </div>
      </section>

      {error && <p className="text-sm text-rose-400">{error}</p>}
      {msg && <p className="text-sm text-emerald-400">{msg}</p>}
    </div>
  );
}
