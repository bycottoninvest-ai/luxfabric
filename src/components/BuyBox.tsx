"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Minus, Plus, ShoppingBag, Zap } from "lucide-react";
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
    image: string;
  };
  variants: Variant[];
  color?: string;
  onColorChange?: (color: string) => void;
};

export function BuyBox({ product, variants, color: controlledColor, onColorChange }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromIg = searchParams.get("from") === "instagram";
  const addItem = useCart((s) => s.addItem);
  const colors = useMemo(() => {
    const map = new Map<string, { color: string; colorHex: string }>();
    variants.forEach((v) => map.set(v.color, { color: v.color, colorHex: v.colorHex }));
    return [...map.values()];
  }, [variants]);

  const [innerColor, setInnerColor] = useState(controlledColor || colors[0]?.color || "");
  const color = controlledColor ?? innerColor;

  function setColor(next: string) {
    setInnerColor(next);
    onColorChange?.(next);
  }

  const sizesForColor = variants.filter((v) => v.color === color);
  const [size, setSize] = useState(sizesForColor.find((v) => v.size === "M")?.size || sizesForColor[0]?.size || "M");
  const selected = variants.find((v) => v.color === color && v.size === size);
  const [qty, setQty] = useState(1);
  const max = selected?.stock || 0;

  useEffect(() => {
    const available = variants.filter((v) => v.color === color);
    if (available.length > 0 && !available.some((v) => v.size === size)) {
      setSize(available.find((v) => v.stock > 0)?.size || available[0].size);
    }
  }, [color, size, variants]);

  function pushToCart() {
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
      quantity: Math.min(qty, max),
      maxStock: max,
    });
  }

  return (
    <div className="space-y-4 rounded-3xl border border-lf-border bg-white p-4 shadow-sm">
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-lf-muted">Rang</div>
        <div className="flex flex-wrap gap-2">
          {colors.map((c) => (
            <button
              key={c.color}
              type="button"
              onClick={() => {
                setColor(c.color);
                const first = variants.find((v) => v.color === c.color && v.stock > 0) || variants.find((v) => v.color === c.color);
                if (first) setSize(first.size);
              }}
              className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm ${
                color === c.color ? "border-lf-red bg-lf-pink" : "border-lf-border"
              }`}
            >
              <span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ background: c.colorHex }} />
              {c.color}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.12em] text-lf-muted">
          <span>O‘lcham</span>
          <span className="normal-case tracking-normal text-lf-red">
            {max > 0 ? `${size} — ${max} dona qoldi` : "Tugagan"}
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
                size === v.size ? "border-lf-red bg-lf-red text-white" : "border-lf-border bg-lf-bg"
              }`}
            >
              {v.size}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="inline-flex items-center rounded-full border border-lf-border bg-lf-bg">
          <button type="button" className="p-3" onClick={() => setQty((q) => Math.max(1, q - 1))}>
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-8 text-center text-sm font-bold">{qty}</span>
          <button type="button" className="p-3" onClick={() => setQty((q) => Math.min(max || 1, q + 1))}>
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="text-right">
          <div className="text-xs text-lf-muted">Jami</div>
          <div className="text-lg font-bold">{formatSom(product.price * qty)}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={pushToCart}
          disabled={!selected || max < 1}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-lf-border px-4 py-3.5 text-sm font-bold disabled:opacity-40"
        >
          <ShoppingBag className="h-4 w-4" /> Savatga
        </button>
        <button
          type="button"
          onClick={() => {
            pushToCart();
            router.push(fromIg ? "/checkout?from=instagram" : "/checkout");
          }}
          disabled={!selected || max < 1}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-lf-red px-4 py-3.5 text-sm font-bold text-white disabled:opacity-40"
        >
          <Zap className="h-4 w-4" /> Hozir sotib ol
        </button>
      </div>
    </div>
  );
}
