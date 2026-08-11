import { prisma } from "@/lib/prisma";
import { StockInPanel } from "@/components/admin/StockInPanel";

export default async function AdminKirimPage() {
  const [warehouses, products] = await Promise.all([
    prisma.warehouse.findMany({
      where: { isActive: true },
      orderBy: { isCentral: "desc" },
      select: { id: true, name: true, city: true, isCentral: true },
    }),
    prisma.product.findMany({
      orderBy: { updatedAt: "desc" },
      take: 80,
      select: {
        id: true,
        name: true,
        images: {
          orderBy: { sortOrder: "asc" },
          take: 6,
          select: { url: true, color: true },
        },
        variants: {
          select: {
            id: true,
            color: true,
            colorHex: true,
            size: true,
            barcode: true,
          },
        },
      },
    }),
  ]);

  return (
    <div className="space-y-4 text-white pb-8 lg:pb-2">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">Kirim</h1>
        <p className="mt-1 text-sm text-white/60">
          Model tanlang → rang/razmer → nechta keldi → QR chop. Chiqim alohida sahifada.
        </p>
      </div>
      <StockInPanel products={products} warehouses={warehouses} />
    </div>
  );
}
