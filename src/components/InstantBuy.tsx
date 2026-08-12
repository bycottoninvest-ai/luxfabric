"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ShieldCheck, Truck, Zap } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatSom } from "@/lib/utils";

type Variant = {
  id: string;
  color: string;
  colorHex: string;
  size: string;
  stock: number;
};

type Props = {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    oldPrice?: number | null;
    image: string;
  };
  variants: Variant[];
};

export function InstantBuy({ product, variants }: Props) {
  const router = useRouter();
  const addItem = useCart((s) => s.addItem);

  const colors = useMemo(() => {
    const map = new Map<string, { color: string; colorHex: string }>();
    variants.forEach((v) => map.set(v.color, { color: v.color, colorHex: v.colorHex }));
    return [...map.values()];
  }, [variants]);

  const [color, setColor] = useState(colors[0]?.color || "");
  const sizesForColor = variants.filter((v) => v.color === color);
  const [size, setSize] = useState(
    sizesForColor.find((v) => v.size === "M" && v.stock > 0)?.size ||
      sizesForColor.find((v) => v.stock > 0)?.size ||
      sizesForColor[0]?.size ||
      "M"
  );
  const selected = variants.find((v) => v.color === color && v.size === size);
  const max = selected?.stock || 0;

  useEffect(() => {
    const available = variants.filter((v) => v.color === color);
    if (available.length > 0 && !available.some((v) => v.size === size)) {
      setSize(available.find((v) => v.stock > 0)?.size || available[0].size);
    }
  }, [color, size, variants]);

  function buyNow() {
    if (!selected || max < 1) return;
    addItem({
      productId: product.id,
      variantId: selected.id,
      slug: product.slug,
      name: product.name,
      image: product.image,
      color: selected.color,
      colorHex: selected.colorHex,
      size: selected.size,
      price: product.price,
      quantity: 1,
      maxStock: max,
    });
    router.push("/checkout?from=instagram");
  }

  const discount =
    product.oldPrice && product.oldPrice > product.price
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : null;

  return (
    <div className="relative">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-lf-cream">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 512px) 100vw, 512px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-lf-muted">Rasm yo‘q</div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/55 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <p className="font-[family-name:var(--font-display)] text-lg font-black tracking-tight drop-shadow">
            luxfabric
          </p>
          <p className="text-sm font-medium opacity-95 drop-shadow">{product.name}</p>
        </div>
        {discount != null && (
          <span className="absolute right-3 top-3 rounded-lg bg-lf-red px-2 py-1 text-xs font-bold text-white">
            −{discount}%
          </span>
        )}
      </div>

      <div className="space-y-3 px-1 pt-3 pb-28">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-extrabold">{formatSom(product.price)}</span>
          {product.oldPrice != null && product.oldPrice > product.price && (
            <span className="text-sm text-lf-muted line-through">{formatSom(product.oldPrice)}</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-lf-muted">
          <div className="flex items-center gap-1.5 rounded-xl bg-white px-2.5 py-2 border border-lf-border">
            <Truck className="h-3.5 w-3.5 text-lf-red" /> 1–2 kun yetkazish
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-white px-2.5 py-2 border border-lf-border">
            <ShieldCheck className="h-3.5 w-3.5 text-lf-red" /> 14 kun qaytarish
          </div>
        </div>

        {colors.length > 1 && (
          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-lf-muted">
              Rang
            </div>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => (
                <button
                  key={c.color}
                  type="button"
                  onClick={() => {
                    setColor(c.color);
                    const first =
                      variants.find((v) => v.color === c.color && v.stock > 0) ||
                      variants.find((v) => v.color === c.color);
                    if (first) setSize(first.size);
                  }}
                  className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm ${
                    color === c.color ? "border-lf-red bg-lf-pink" : "border-lf-border bg-white"
                  }`}
                >
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-black/10"
                    style={{ background: c.colorHex }}
                  />
                  {c.color}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.12em] text-lf-muted">
            <span>O‘lcham</span>
            <span className="normal-case tracking-normal text-lf-red">
              {max > 0 ? `${size} — bor` : "Tugagan"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {sizesForColor.map((v) => (
              <button
                key={v.id}
                type="button"
                disabled={v.stock < 1}
                onClick={() => setSize(v.size)}
                className={`min-w-12 rounded-xl border px-3 py-2.5 text-sm font-semibold disabled:opacity-30 ${
                  size === v.size ? "border-lf-red bg-lf-red text-white" : "border-lf-border bg-white"
                }`}
              >
                {v.size}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-lf-border bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
        <div className="mx-auto max-w-lg">
          <button
            type="button"
            onClick={buyNow}
            disabled={!selected || max < 1}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-lf-red py-4 text-base font-bold text-white shadow-lg shadow-lf-red/25 transition active:scale-[0.99] disabled:opacity-40"
          >
            <Zap className="h-5 w-5" />
            Sotib olish · {formatSom(product.price)}
          </button>
          <p className="mt-1.5 text-center text-[11px] text-lf-muted">
            Bir bosishda checkout — o‘lchamni tanlang
          </p>
        </div>
      </div>
    </div>
  );
}
