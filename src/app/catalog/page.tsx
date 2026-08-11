import { StoreShell } from "@/components/StoreShell";
import { ProductCard } from "@/components/ProductCard";
import { getCategories, getProducts } from "@/lib/catalog";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;
  const [products, categories] = await Promise.all([getProducts(cat), getCategories()]);

  return (
    <StoreShell>
      <h1 className="text-xl font-bold">Katalog</h1>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        <Link
          href="/catalog"
          className={cn(
            "shrink-0 rounded-full border px-4 py-2 text-sm font-medium",
            !cat ? "border-lf-red bg-lf-red text-white" : "border-lf-border bg-white"
          )}
        >
          Hammasi
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/catalog?cat=${c.slug}`}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm font-medium",
              cat === c.slug ? "border-lf-red bg-lf-red text-white" : "border-lf-border bg-white"
            )}
          >
            {c.name}
          </Link>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </StoreShell>
  );
}
