"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type Img = { url: string; alt: string | null; color?: string | null };

export function ProductGallery({
  images,
  name,
  discount,
  selectedColor,
  selectedColorHex,
}: {
  images: Img[];
  name: string;
  discount?: number | null;
  selectedColor?: string;
  selectedColorHex?: string;
}) {
  const colored = useMemo(() => {
    if (!selectedColor) return images;
    const matched = images.filter(
      (img) => img.color && img.color.toLowerCase() === selectedColor.toLowerCase()
    );
    return matched.length > 0 ? matched : images;
  }, [images, selectedColor]);

  const list = colored.length > 0 ? colored : [{ url: "/brand/luxfabric-mark.svg", alt: name, color: null }];
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
  }, [selectedColor]);

  const current = list[Math.min(active, list.length - 1)];
  const hasColorMatch = images.some(
    (img) => selectedColor && img.color && img.color.toLowerCase() === selectedColor.toLowerCase()
  );

  return (
    <div className="space-y-2">
      <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-lf-border bg-white">
        <Image
          key={`${current.url}-${selectedColor || ""}`}
          src={current.url}
          alt={current.alt || name}
          fill
          className="object-cover transition-opacity duration-300"
          priority
          sizes="(max-width: 768px) 100vw, 480px"
          unoptimized={current.url.startsWith("/")}
        />
        {/* Rangga bog‘langan rasm bo‘lmasa — rang overlay bilan ko‘rsatamiz */}
        {!hasColorMatch && selectedColorHex && (
          <div
            className="pointer-events-none absolute inset-0 mix-blend-multiply opacity-45"
            style={{ backgroundColor: selectedColorHex }}
            aria-hidden
          />
        )}
        {discount ? (
          <span className="absolute left-3 top-3 rounded-lg bg-lf-red px-2.5 py-1 text-sm font-bold text-white">
            -{discount}%
          </span>
        ) : null}
        {selectedColor && (
          <span className="absolute left-3 bottom-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white">
            {selectedColor}
          </span>
        )}
        {list.length > 1 && (
          <div className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white">
            {active + 1} / {list.length}
          </div>
        )}
      </div>

      {list.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {list.map((img, idx) => (
            <button
              key={`${img.url}-${idx}`}
              type="button"
              onClick={() => setActive(idx)}
              className={`relative h-16 w-14 shrink-0 overflow-hidden rounded-xl border-2 ${
                active === idx ? "border-lf-red" : "border-lf-border"
              }`}
            >
              <Image
                src={img.url}
                alt={img.alt || `${name} ${idx + 1}`}
                fill
                className="object-cover"
                sizes="56px"
                unoptimized={img.url.startsWith("/")}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
