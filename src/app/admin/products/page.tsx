import Image from "next/image";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatSom } from "@/lib/utils";
import { GENDER_LABEL } from "@/lib/product-options";
import { StockByWarehouse } from "@/components/admin/StockByWarehouse";
import { ProductDeleteButton } from "@/components/admin/ProductDeleteButton";

export default async function AdminProductsPage() {
  const [products, warehouses] = await Promise.all([
    prisma.product.findMany({
      where: { status: { not: "DELETED" } },
      include: {
        images: true,
        category: true,
        variants: {
          include: {
            stocks: {
              include: {
                warehouse: { select: { id: true, name: true, city: true, isCentral: true } },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.warehouse.findMany({
      where: { isActive: true },
      select: { id: true, name: true, city: true, isCentral: true },
      orderBy: [{ isCentral: "desc" }, { city: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">Mahsulotlar</h1>
          <p className="mt-1 text-sm text-lf-muted">
            Qoldiq: Jami · + bosilsa o‘lcham / ombor · «O‘zgartirish» — tahrir
          </p>
        </div>
        <Link href="/admin/products/new" className="rounded-xl bg-lf-red px-4 py-2 text-sm font-semibold">
          + Yangi
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-[0.12em] text-lf-muted">
            <tr>
              <th className="px-4 py-3">Mahsulot</th>
              <th className="px-4 py-3">Kim uchun</th>
              <th className="px-4 py-3">Kategoriya</th>
              <th className="px-4 py-3">Narx</th>
              <th className="px-4 py-3">Qoldiq</th>
              <th className="px-4 py-3">Status</th>
              <th className="min-w-[11rem] px-4 py-3 text-right">Amal</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const byWarehouse = new Map<
                string,
                { name: string; city: string; isCentral: boolean; qty: number }
              >();
              for (const v of p.variants) {
                for (const s of v.stocks) {
                  if (!s.warehouse) continue;
                  const cur = byWarehouse.get(s.warehouse.id);
                  if (cur) cur.qty += s.quantity;
                  else {
                    byWarehouse.set(s.warehouse.id, {
                      name: s.warehouse.name,
                      city: s.warehouse.city,
                      isCentral: s.warehouse.isCentral,
                      qty: s.quantity,
                    });
                  }
                }
              }
              const rows = [...byWarehouse.values()]
                .filter((w) => w.qty > 0)
                .sort((a, b) => Number(b.isCentral) - Number(a.isCentral) || b.qty - a.qty);
              const total = [...byWarehouse.values()].reduce((s, w) => s + w.qty, 0);

              const sizes = p.variants.map((v) => {
                const byWh: Record<string, number> = {};
                for (const s of v.stocks) {
                  if (s.warehouse) byWh[s.warehouse.id] = s.quantity;
                }
                return {
                  variantId: v.id,
                  color: v.color,
                  size: v.size,
                  byWarehouse: byWh,
                };
              });

              return (
                <tr key={p.id} className="border-t border-white/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-10 overflow-hidden rounded-lg bg-lf-surface">
                        {p.images[0] && (
                          <Image src={p.images[0].url} alt={p.name} fill className="object-cover" sizes="40px" />
                        )}
                      </div>
                      <div>
                        <Link
                          href={`/admin/products/${p.id}/edit`}
                          className="font-medium text-sky-200 underline-offset-2 hover:underline"
                        >
                          {p.name}
                        </Link>
                        <div className="text-xs text-lf-muted">{p.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-lf-muted">{GENDER_LABEL[p.gender] || p.gender}</td>
                  <td className="px-4 py-3 text-lf-muted">{p.category.name}</td>
                  <td className="px-4 py-3">{formatSom(p.price)}</td>
                  <td className="px-4 py-3">
                    <StockByWarehouse
                      total={total}
                      rows={rows}
                      sizes={sizes}
                      warehouses={warehouses}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[11px] text-emerald-400">
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-nowrap items-center justify-end gap-2">
                      <Link
                        href={`/admin/products/${p.id}/edit`}
                        title="O‘zgartirish"
                        className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-sky-400/50 bg-sky-500/25 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-500/40"
                      >
                        <Pencil className="h-4 w-4 shrink-0" />
                        O‘zgartirish
                      </Link>
                      <ProductDeleteButton
                        productId={p.id}
                        productName={p.name}
                        hasMetaCatalogId={Boolean(p.metaCatalogProductId?.trim())}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
