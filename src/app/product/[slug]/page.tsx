import { notFound } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Star, Timer, Truck } from "lucide-react";
import { StoreShell } from "@/components/StoreShell";
import { ProductCard } from "@/components/ProductCard";
import { ProductPurchase } from "@/components/ProductPurchase";
import { ProductReviews } from "@/components/ProductReviews";
import { getFeaturedProducts, getProductBySlug } from "@/lib/catalog";
import { getApprovedReviews, getReviewStats } from "@/lib/reviews";
import { formatSom } from "@/lib/utils";
import { CountdownTimer } from "@/components/CountdownTimer";
import { GENDER_LABEL } from "@/lib/product-options";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = (await getFeaturedProducts()).filter((p) => p.id !== product.id).slice(0, 4);
  const [reviews, stats] = await Promise.all([
    getApprovedReviews(product.id, 20),
    getReviewStats(product.id),
  ]);
  const displayRating = stats.avg ?? product.rating;
  const reviewCount = stats.count;

  const variants = product.variants.map((v) => ({
    id: v.id,
    color: v.color,
    colorHex: v.colorHex,
    size: v.size,
    stock: v.stocks.reduce((s, x) => s + x.quantity, 0),
  }));

  const discount =
    product.oldPrice && product.oldPrice > product.price
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : null;

  return (
    <StoreShell>
      <ProductPurchase
        product={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: product.price,
        }}
        discount={discount}
        images={product.images.map((img) => ({
          url: img.url,
          alt: img.alt,
          color: img.color,
        }))}
        variants={variants}
      >
      <div className="mt-3 space-y-2 rounded-3xl border border-lf-border bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-lf-muted">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          <span className="font-semibold text-lf-text">{displayRating.toFixed(1)}</span>
          <span>· {product.soldCount.toLocaleString("uz-UZ")} sotildi</span>
          <span>· {reviewCount} sharh</span>
        </div>
        <div className="inline-flex rounded-full bg-lf-pink px-2.5 py-1 text-[11px] font-semibold text-lf-red">
          {GENDER_LABEL[product.gender] || product.gender}
        </div>
        <h1 className="text-xl font-bold leading-tight">{product.name}</h1>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-extrabold text-lf-text">{formatSom(product.price)}</span>
          {product.oldPrice && (
            <span className="text-lf-muted line-through">{formatSom(product.oldPrice)}</span>
          )}
        </div>
        {discount && (
          <div className="inline-flex items-center gap-2 rounded-full bg-lf-pink px-3 py-1.5 text-xs font-semibold text-lf-red">
            <Timer className="h-3.5 w-3.5" />
            Chegirma tugashiga: <CountdownTimer hours={2} />
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-lf-muted">
          <div className="flex items-center gap-1.5 rounded-xl bg-lf-bg px-2.5 py-2">
            <Truck className="h-3.5 w-3.5 text-lf-red" /> 1–2 kun yetkazish
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-lf-bg px-2.5 py-2">
            <ShieldCheck className="h-3.5 w-3.5 text-lf-red" /> 14 kun qaytarish
          </div>
        </div>
      </div>
      </ProductPurchase>

      <section className="mt-3 space-y-2 rounded-3xl border border-lf-border bg-white p-4 text-sm leading-relaxed text-lf-muted shadow-sm">
        <h2 className="text-base font-bold text-lf-text">Mahsulot haqida</h2>
        <p>{product.description}</p>
        <p>
          <span className="font-semibold text-lf-text">Mato:</span> {product.fabric}
        </p>
        <p>
          <span className="font-semibold text-lf-text">Parvarish:</span> {product.care}
        </p>
        <p>
          <span className="font-semibold text-lf-text">Kategoriya:</span> {product.category.name}
        </p>
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
      />

      {related.length > 0 && (
        <section className="mt-4 mb-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-bold">O‘xshash mahsulotlar</h2>
            <Link href="/catalog" className="text-xs font-semibold text-lf-red">
              Ko‘proq
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </StoreShell>
  );
}
