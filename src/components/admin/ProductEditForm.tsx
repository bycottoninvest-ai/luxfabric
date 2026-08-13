"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { PRODUCT_CATEGORIES, GENDER_LABEL } from "@/lib/product-options";

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
  imageUrl: string | null;
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

  function loadDraftsForWarehouse(whId: string) {
    const m: Record<string, string> = {};
    for (const s of product.sizes) {
      m[s.variantId] = String(s.byWarehouse[whId] ?? 0);
    }
    setQtyDrafts(m);
  }

  const multiColor = orderedSizes.some((x) => x.color !== orderedSizes[0]?.color);

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMsg("");
    try {
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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Saqlash xatosi");
      setMsg("Mahsulot saqlandi");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setLoading(false);
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

      {product.imageUrl && (
        <div className="relative h-28 w-24 overflow-hidden rounded-xl border border-white/10 bg-lf-surface">
          <Image src={product.imageUrl} alt={product.name} fill className="object-cover" sizes="96px" />
        </div>
      )}

      <form onSubmit={saveProduct} className="space-y-4 rounded-2xl border border-white/10 bg-lf-card p-5">
        <h2 className="font-semibold">Asosiy ma’lumot</h2>
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
