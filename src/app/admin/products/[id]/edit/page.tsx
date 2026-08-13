import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductEditForm } from "@/components/admin/ProductEditForm";

export default async function AdminProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [product, warehouses] = await Promise.all([
    prisma.product.findFirst({
      where: { id, status: { not: "DELETED" } },
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        category: true,
        variants: {
          include: {
            stocks: { select: { warehouseId: true, quantity: true } },
          },
        },
      },
    }),
    prisma.warehouse.findMany({
      where: { isActive: true },
      select: { id: true, name: true, city: true, isCentral: true },
      orderBy: [{ isCentral: "desc" }, { city: "asc" }],
    }),
  ]);

  if (!product) notFound();

  const centralId = warehouses.find((w) => w.isCentral)?.id || warehouses[0]?.id || "";

  const sizes = product.variants.map((v) => {
    const byWarehouse: Record<string, number> = {};
    for (const s of v.stocks) byWarehouse[s.warehouseId] = s.quantity;
    return {
      variantId: v.id,
      color: v.color,
      size: v.size,
      byWarehouse,
      quantity: centralId ? byWarehouse[centralId] ?? 0 : 0,
    };
  });

  return (
    <ProductEditForm
      product={{
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        oldPrice: product.oldPrice,
        description: product.description,
        fabric: product.fabric,
        care: product.care,
        status: product.status,
        featured: product.featured,
        gender: product.gender,
        categorySlug: product.category.slug,
        imageUrl: product.images[0]?.url ?? null,
        sizes,
        warehouses,
      }}
    />
  );
}
