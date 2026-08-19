import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { LayoutGrid } from "lucide-react";
import { InstantBuy } from "@/components/InstantBuy";
import { ProductReviews } from "@/components/ProductReviews";
import { getFeaturedProducts, getProductBySlug } from "@/lib/catalog";
import { getApprovedReviews, getReviewStats } from "@/lib/reviews";
import { formatSom } from "@/lib/utils";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
};

/**
 * Instagram / short-link landing — mobil bir-bosishda sotib olish.
 * Havola: https://www.luxfabricshop.uz/i/[slug]?from=ig
 */
export default async function InstagramInstantBuyPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const fromIg =
    sp.from === "ig" || sp.from === "instagram" || sp.from === "reel" || sp.from === "story";

  const product = await getProductBySlug(slug);
  if (!product || product.status !== "ACTIVE") notFound();

  const variants = product.variants.map((v) => ({
    id: v.id,
    color: v.color,
    colorHex: v.colorHex,
    size: v.size,
    stock: v.stocks.reduce((s, x) => s + x.quantity, 0),
  }));

  const image = product.images[0]?.url || "";
  const [reviews, stats, featured] = await Promise.all([
    getApprovedReviews(product.id, 12),
    getReviewStats(product.id),
    getFeaturedProducts(),
  ]);

  const related = featured.filter((p) => p.id !== product.id).slice(0, 6);
  const sizes = [...new Set(product.variants.map((v) => v.size))];

  return (
    <div className="min-h-screen bg-lf-bg text-lf-text">
      <header className="sticky top-0 z-40 border-b border-lf-border bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-11 max-w-lg items-center justify-between gap-2 px-3">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-lg font-black tracking-tight"
          >
            luxfabric
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/catalog"
              className="inline-flex items-center gap-1 text-xs font-semibold text-lf-text"
            >
              <LayoutGrid className="h-3.5 w-3.5 text-lf-red" />
              Katalog
            </Link>
            <Link
              href={`/product/${product.slug}?from=instagram`}
              className="text-xs font-semibold text-lf-red"
            >
              Batafsil
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg">
        <InstantBuy
          product={{
            id: product.id,
            name: product.name,
            slug: product.slug,
            price: product.price,
            oldPrice: product.oldPrice,
            image,
          }}
          variants={variants}
          fromIg={fromIg}
        />

        <div className="space-y-3 px-3 pb-8">
          <Link
            href="/catalog"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-lf-red/40 bg-white py-3.5 text-sm font-bold text-lf-text shadow-sm"
          >
            <LayoutGrid className="h-4 w-4 text-lf-red" />
            Boshqa mahsulotlar
          </Link>

          {related.length > 0 && (
            <section>
              <div className="mb-2 flex items-center justify-between px-0.5">
                <h2 className="text-base font-bold text-lf-text">Boshqa mahsulotlar</h2>
                <Link href="/catalog" className="text-xs font-semibold text-lf-red">
                  Katalog
                </Link>
              </div>
              <div className="flex gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {related.map((p) => {
                  const img = p.images[0]?.url;
                  return (
                    <Link
                      key={p.id}
                      href={`/i/${p.slug}?from=ig`}
                      className="w-[42%] shrink-0 overflow-hidden rounded-2xl border border-lf-border bg-white shadow-sm"
                    >
                      <div className="relative aspect-[3/4] bg-[#f0f0f2]">
                        {img && (
                          <Image
                            src={img}
                            alt={p.images[0]?.alt || p.name}
                            fill
                            className="object-cover"
                            sizes="42vw"
                          />
                        )}
                      </div>
                      <div className="space-y-0.5 p-2.5">
                        <div className="line-clamp-2 text-xs font-semibold leading-snug">{p.name}</div>
                        <div className="text-sm font-bold text-lf-red">{formatSom(p.price)}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          <section className="rounded-3xl border border-lf-border bg-white p-4 text-sm leading-relaxed text-lf-muted shadow-sm">
            <h2 className="text-base font-bold text-lf-text">Tez savollar</h2>
            <ul className="mt-2 space-y-1.5">
              <li>
                <span className="font-semibold text-lf-text">Narx:</span> sahifadagi narx — Click, Payme, Paynet yoki naqd.
              </li>
              <li>
                <span className="font-semibold text-lf-text">O‘lcham:</span>{" "}
                {sizes.length ? sizes.join(", ") : "S–XXL"} — tanlab «Sotib olish».
              </li>
              <li>
                <span className="font-semibold text-lf-text">Yetkazish:</span> 1–2 kun, O‘zbekiston bo‘ylab.
              </li>
              <li>
                <span className="font-semibold text-lf-text">Qaytarish:</span> 14 kun (etiketka bilan).
              </li>
            </ul>
            {product.fabric && (
              <p className="mt-2">
                <span className="font-semibold text-lf-text">Mato:</span> {product.fabric}
              </p>
            )}
          </section>

          <ProductReviews
            productId={product.id}
            productName={product.name}
            initialReviews={reviews.map((r) => ({
              ...r,
              createdAt: r.createdAt.toISOString(),
            }))}
            initialAvg={stats.avg ?? product.rating}
            initialCount={stats.count}
            compact
          />
        </div>
      </main>
    </div>
  );
}
