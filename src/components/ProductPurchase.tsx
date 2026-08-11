"use client";

import { Suspense, useMemo, useState, type ReactNode } from "react";
import { ProductGallery } from "@/components/ProductGallery";
import { BuyBox } from "@/components/BuyBox";

type Img = { url: string; alt: string | null; color: string | null };
type Variant = {
  id: string;
  color: string;
  colorHex: string;
  size: string;
  stock: number;
};

export function ProductPurchase({
  product,
  images,
  variants,
  discount,
  children,
}: {
  product: { id: string; name: string; slug: string; price: number };
  images: Img[];
  variants: Variant[];
  discount?: number | null;
  children?: ReactNode;
}) {
  const colors = useMemo(() => {
    const map = new Map<string, { color: string; colorHex: string }>();
    variants.forEach((v) => map.set(v.color, { color: v.color, colorHex: v.colorHex }));
    return [...map.values()];
  }, [variants]);

  const [color, setColor] = useState(colors[0]?.color || "");
  const colorHex = colors.find((c) => c.color === color)?.colorHex || "#111111";

  const activeImage =
    images.find((img) => img.color && img.color.toLowerCase() === color.toLowerCase())?.url ||
    images[0]?.url ||
    "";

  return (
    <>
      <ProductGallery
        name={product.name}
        discount={discount}
        selectedColor={color}
        selectedColorHex={colorHex}
        images={images}
      />
      {children}
      <div className="mt-3">
        <Suspense fallback={<div className="rounded-3xl border border-lf-border bg-white p-4">Yuklanmoqda...</div>}>
          <BuyBox
            product={{ ...product, image: activeImage }}
            variants={variants}
            color={color}
            onColorChange={setColor}
          />
        </Suspense>
      </div>
    </>
  );
}
