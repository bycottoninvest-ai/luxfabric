import { StoreShell } from "@/components/StoreShell";
import { ProductCard } from "@/components/ProductCard";
import { getCategories, getFeaturedProducts } from "@/lib/catalog";
import Link from "next/link";
import { Play } from "lucide-react";

export default async function HomePage() {
  const [products, categories] = await Promise.all([getFeaturedProducts(), getCategories()]);

  return (
    <StoreShell>
      {/* Hero — faqat luxfabric, telefon uchun ixcham */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-white via-[#fff5f5] to-lf-bg px-3 py-5 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(2.75rem,14vw,4.25rem)] font-black leading-[0.9] tracking-tight text-lf-text">
          luxfabric
        </h1>
        <p className="mt-2 text-xs text-lf-muted">Premium tekstil</p>
        <div className="mt-3 flex justify-center gap-2">
          <Link
            href="/instagram"
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-lf-red px-3 py-2.5 text-sm font-semibold text-white"
          >
            <Play className="h-3.5 w-3.5" /> Reels
          </Link>
          <Link
            href="/catalog"
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-lf-border bg-white px-3 py-2.5 text-sm font-semibold"
          >
            Katalog
          </Link>
        </div>
      </section>

      <section className="mt-3 flex gap-1.5 overflow-x-auto text-[10px] text-lf-muted">
        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 border border-lf-border">2 daq checkout</span>
        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 border border-lf-border">1–2 kun yetkazish</span>
        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 border border-lf-border">14 kun qaytarish</span>
      </section>

      <section className="mt-4">
        <div className="mb-2 flex items-end justify-between">
          <h2 className="text-base font-bold">Kategoriyalar</h2>
          <Link href="/catalog" className="text-[11px] font-semibold text-lf-red">
            Barchasi
          </Link>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {[
            { href: "/catalog", label: "Hitlar", on: true },
            { href: "/catalog?cat=futbolkalar", label: "Yangi" },
            { href: "/catalog?cat=futbolkalar", label: "Chegirma" },
            ...categories.slice(0, 6).map((c) => ({
              href: `/catalog?cat=${c.slug}`,
              label: c.name,
            })),
          ].map((c) => (
            <Link
              key={c.href + c.label}
              href={c.href}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
                "on" in c && c.on
                  ? "border-lf-red bg-lf-red text-white"
                  : "border-lf-border bg-white"
              }`}
            >
              {c.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-4 mb-2">
        <h2 className="mb-2 text-base font-bold">Sizga yoqishi mumkin</h2>
        <div className="grid grid-cols-2 gap-2">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </StoreShell>
  );
}
