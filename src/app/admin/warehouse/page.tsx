import { prisma } from "@/lib/prisma";
import { formatSom } from "@/lib/utils";
import { ClearStockButton } from "@/components/admin/ClearStockButton";
import { WarehouseManager } from "@/components/admin/WarehouseManager";

export default async function AdminWarehousePage() {
  const regions = await prisma.region.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      warehouses: {
        include: {
          stocks: {
            include: {
              variant: {
                include: { product: { select: { name: true, price: true } } },
              },
            },
          },
        },
      },
    },
  });

  const payload = regions.map((r) => {
    const warehouses = r.warehouses.map((w) => {
      const totalStock = w.stocks.reduce((s, x) => s + x.quantity, 0);
      const totalValue = w.stocks.reduce(
        (s, x) => s + x.quantity * (x.variant.product.price || 0),
        0
      );
      const lowStock = w.stocks
        .filter((s) => s.quantity < 12)
        .sort((a, b) => a.quantity - b.quantity)
        .slice(0, 8)
        .map((s) => ({
          stockId: s.id,
          warehouseId: w.id,
          variantId: s.variantId,
          label: `${s.variant.product.name} ${s.variant.size}/${s.variant.color}`,
          quantity: s.quantity,
          lineValue: s.quantity * s.variant.product.price,
        }));

      return {
        id: w.id,
        name: w.name,
        city: w.city,
        address: w.address,
        phone: w.phone,
        isCentral: w.isCentral,
        isActive: w.isActive,
        totalStock,
        totalValue,
        lowStock,
      };
    });

    return {
      id: r.id,
      code: r.code,
      nameUz: r.nameUz,
      regionStock: warehouses.reduce((s, w) => s + w.totalStock, 0),
      regionValue: warehouses.reduce((s, w) => s + w.totalValue, 0),
      warehouses,
    };
  });

  const grandQty = payload.reduce((s, r) => s + r.regionStock, 0);
  const grandValue = payload.reduce((s, r) => s + r.regionValue, 0);

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">
            Viloyatlar va omborlar
          </h1>
          <p className="mt-1 text-sm text-lf-muted">
            Har viloyatdagi pul summasi · yuqoridagi itogi = barcha viloyatlar yig‘indisi
          </p>
        </div>
        <ClearStockButton />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-lf-card p-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-lf-muted">Umumiy qoldiq</div>
          <div className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold">
            {grandQty.toLocaleString("uz-UZ")}
          </div>
          <div className="text-xs text-lf-muted">dona (barcha viloyatlar)</div>
        </div>
        <div className="rounded-2xl border border-lf-red/30 bg-lf-red/10 p-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-lf-red/80">To‘liq itogi summa</div>
          <div className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold text-white">
            {formatSom(grandValue)}
          </div>
          <div className="text-xs text-white/50">
            {payload.length} viloyat yig‘indisi · tekshirish: pastdagi kartalar jami = shu
          </div>
        </div>
      </div>

      {/* Kichik panel — har viloyat */}
      <WarehouseManager regions={payload} />
    </div>
  );
}
