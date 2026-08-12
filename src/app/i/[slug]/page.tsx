import { notFound } from "next/navigation";
import Link from "next/link";
import { InstantBuy } from "@/components/InstantBuy";
import { ProductReviews } from "@/components/ProductReviews";
import { getProductBySlug } from "@/lib/catalog";
import { getApprovedReviews, getReviewStats } from "@/lib/reviews";

type Props = { params: Promise<{ slug: string }> };

/**
 * Instagram / short-link landing — mobil bir-bosishda sotib olish.
 * Havola: https://www.luxfabricshop.uz/i/[slug]
 */
export default async function InstagramInstantBuyPage({ params }: Props) {
  const { slug } = await params;
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
  const [reviews, stats] = await Promise.all([
    getApprovedReviews(product.id, 12),
    getReviewStats(product.id),
  ]);

  const sizes = [...new Set(product.variants.map((v) => v.size))];

  return (
    <div className="min-h-screen bg-lf-bg text-lf-text">
      <header className="sticky top-0 z-40 border-b border-lf-border bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-11 max-w-lg items-center justify-between px-3">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-lg font-black tracking-tight"
          >
            luxfabric
          </Link>
          <Link href={`/product/${product.slug}?from=instagram`} className="text-xs font-semibold text-lf-red">
            Batafsil
          </Link>
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
        />

        <div className="space-y-3 px-3 pb-8">
          <section className="rounded-3xl border border-lf-border bg-white p-4 text-sm leading-relaxed text-lf-muted shadow-sm">
            <h2 className="text-base font-bold text-lf-text">Tez savollar</h2>
            <ul className="mt-2 space-y-1.5">
              <li>
                <span className="font-semibold text-lf-text">Narx:</span> sahifadagi narx — Click yoki naqd.
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
