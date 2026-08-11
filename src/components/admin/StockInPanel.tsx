"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { PackagePlus } from "lucide-react";

export type StockInProduct = {
  id: string;
  name: string;
  images: { url: string; color: string | null }[];
  variants: {
    id: string;
    color: string;
    colorHex: string;
    size: string;
    barcode: string;
  }[];
};

type Warehouse = { id: string; name: string; city: string; isCentral: boolean };

export function StockInPanel({
  products,
  warehouses,
}: {
  products: StockInProduct[];
  warehouses: Warehouse[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [productId, setProductId] = useState<string | null>(null);
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [qty, setQty] = useState("10");
  const [warehouseId, setWarehouseId] = useState(
    warehouses.find((w) => w.isCentral)?.id || warehouses[0]?.id || ""
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products.slice(0, 24);
    return products.filter((p) => p.name.toLowerCase().includes(s)).slice(0, 24);
  }, [products, q]);

  const product = products.find((p) => p.id === productId) || null;

  const colors = useMemo(() => {
    if (!product) return [] as { color: string; colorHex: string }[];
    const map = new Map<string, string>();
    for (const v of product.variants) {
      if (!map.has(v.color)) map.set(v.color, v.colorHex);
    }
    return [...map.entries()].map(([c, hex]) => ({ color: c, colorHex: hex }));
  }, [product]);

  const sizes = useMemo(() => {
    if (!product) return [] as string[];
    const set = new Set(
      product.variants.filter((v) => !color || v.color === color).map((v) => v.size)
    );
    return [...set];
  }, [product, color]);

  const variant = useMemo(() => {
    if (!product || !color || !size) return null;
    return product.variants.find((v) => v.color === color && v.size === size) || null;
  }, [product, color, size]);

  const previewImg =
    product?.images.find((i) => i.color && color && i.color.toLowerCase() === color.toLowerCase())
      ?.url || product?.images[0]?.url;

  async function submitKirim() {
    if (!variant) {
      setError("Model, rang va o‘lchamni tanlang");
      return;
    }
    const quantity = Math.max(1, Number(qty) || 0);
    if (!quantity) {
      setError("Nechta kelganini yozing");
      return;
    }
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch("/api/admin/stock-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: variant.id,
          warehouseId,
          quantity,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kirim xatosi");
      setMsg(data.message || "Kirim OK");
      // Avtomatik upakovka QR chop sahifasiga
      router.push(data.printPath as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-[#121212] p-4 lg:p-5">
      <div className="flex items-start gap-2">
        <PackagePlus className="mt-0.5 h-5 w-5 shrink-0 text-lf-red" />
        <div>
          <h2 className="text-lg font-bold">Kirim · model tanlash</h2>
          <p className="text-xs text-white/50">
            Model → rasm/rang/razmer → nechta keldi → saqlash → upakovka QR chop. Chiqimda QR skan → son
            kamayadi.
          </p>
        </div>
      </div>

      <label className="block space-y-1">
        <span className="text-[10px] uppercase tracking-[0.12em] text-white/40">Ombor</span>
        <select
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-[#0c0c0c] px-3 py-2.5 text-sm"
        >
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} — {w.city}
              {w.isCentral ? " (markaz)" : ""}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-[10px] uppercase tracking-[0.12em] text-white/40">Model qidirish</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Masalan: Nice Print Futbolka"
          className="w-full rounded-xl border border-white/10 bg-[#0c0c0c] px-3 py-2.5 text-sm outline-none focus:border-lf-red/50"
        />
      </label>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        {filtered.map((p) => {
          const thumb = p.images[0]?.url;
          const active = p.id === productId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setProductId(p.id);
                const firstColor = p.variants[0]?.color || "";
                setColor(firstColor);
                setSize(p.variants.find((v) => v.color === firstColor)?.size || p.variants[0]?.size || "");
                setMsg("");
                setError("");
              }}
              className={`overflow-hidden rounded-xl border text-left transition ${
                active ? "border-lf-red bg-lf-red/15" : "border-white/10 hover:border-white/25"
              }`}
            >
              <div className="relative aspect-square bg-black/40">
                {thumb ? (
                  <Image
                    src={thumb}
                    alt={p.name}
                    fill
                    className="object-cover"
                    sizes="120px"
                    unoptimized={thumb.startsWith("/")}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] text-white/30">—</div>
                )}
              </div>
              <div className="truncate px-1.5 py-1 text-[10px] font-medium">{p.name}</div>
            </button>
          );
        })}
      </div>

      {product && (
        <div className="grid gap-4 border-t border-white/10 pt-4 lg:grid-cols-[160px_1fr]">
          <div className="relative mx-auto aspect-square w-full max-w-[160px] overflow-hidden rounded-xl border border-white/10 bg-black/40">
            {previewImg ? (
              <Image
                src={previewImg}
                alt={product.name}
                fill
                className="object-cover"
                sizes="160px"
                unoptimized={previewImg.startsWith("/")}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-white/30">Rasm yo‘q</div>
            )}
          </div>

          <div className="space-y-3">
            <div className="font-semibold">{product.name}</div>

            <div>
              <div className="mb-1.5 text-[10px] uppercase tracking-[0.12em] text-white/40">Rang</div>
              <div className="flex flex-wrap gap-1.5">
                {colors.map((c) => (
                  <button
                    key={c.color}
                    type="button"
                    onClick={() => {
                      setColor(c.color);
                      const sz =
                        product.variants.find((v) => v.color === c.color && v.size === size)?.size ||
                        product.variants.find((v) => v.color === c.color)?.size ||
                        "";
                      setSize(sz);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs ${
                      color === c.color ? "border-lf-red bg-lf-red/20" : "border-white/10"
                    }`}
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-white/25"
                      style={{ backgroundColor: c.colorHex }}
                    />
                    {c.color}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1.5 text-[10px] uppercase tracking-[0.12em] text-white/40">Razmer</div>
              <div className="flex flex-wrap gap-1.5">
                {sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    className={`min-w-10 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                      size === s ? "border-lf-red bg-lf-red text-white" : "border-white/10"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <label className="block max-w-[200px] space-y-1">
              <span className="text-[10px] uppercase tracking-[0.12em] text-white/40">
                Nechta keldi (dona)
              </span>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#0c0c0c] px-3 py-2.5 text-xl font-bold outline-none focus:border-lf-red/50"
              />
            </label>

            {variant && (
              <p className="text-[11px] text-white/45">
                Barcode: <span className="font-mono text-white/70">{variant.barcode}</span>
              </p>
            )}

            <button
              type="button"
              disabled={busy || !variant}
              onClick={submitKirim}
              className="rounded-xl bg-lf-red px-5 py-3 text-sm font-semibold disabled:opacity-40"
            >
              {busy ? "Saqlanmoqda..." : "Kirim qilish + QR chop etish"}
            </button>
          </div>
        </div>
      )}

      {msg && <div className="rounded-xl bg-emerald-500/90 px-3 py-2 text-sm">{msg}</div>}
      {error && <div className="rounded-xl bg-rose-500/90 px-3 py-2 text-sm">{error}</div>}
    </div>
  );
}
