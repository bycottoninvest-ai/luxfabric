import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { formatSom } from "@/lib/utils";

type ProductCardProps = {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    oldPrice: number | null;
    rating: number;
    soldCount: number;
    images: { url: string; alt: string | null }[];
  };
};

export function ProductCard({ product }: ProductCardProps) {
  const img = product.images[0]?.url;
  const discount =
    product.oldPrice && product.oldPrice > product.price
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : null;

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group overflow-hidden rounded-2xl border border-lf-border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-lf-red/30 hover:shadow-md"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-[#f0f0f2]">
        {img && (
          <Image
            src={img}
            alt={product.images[0]?.alt || product.name}
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 50vw, 240px"
          />
        )}
        {discount && (
          <span className="absolute left-2 top-2 rounded-md bg-lf-red px-1.5 py-0.5 text-[11px] font-bold text-white">
            -{discount}%
          </span>
        )}
      </div>
      <div className="space-y-1 p-2.5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[15px] font-bold text-lf-text">{formatSom(product.price)}</span>
          {product.oldPrice && (
            <span className="text-[11px] text-lf-muted line-through">{formatSom(product.oldPrice)}</span>
          )}
        </div>
        <h3 className="line-clamp-2 min-h-[2.4em] text-[13px] leading-snug text-lf-text">{product.name}</h3>
        <div className="flex items-center gap-1 text-[11px] text-lf-muted">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span className="font-medium text-lf-text">{product.rating.toFixed(1)}</span>
          <span>· {product.soldCount.toLocaleString("uz-UZ")} buyurtma</span>
        </div>
      </div>
    </Link>
  );
}
