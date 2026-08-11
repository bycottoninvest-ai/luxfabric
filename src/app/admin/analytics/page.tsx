import { prisma } from "@/lib/prisma";
import { formatSom } from "@/lib/utils";

export default async function AdminAnalyticsPage() {
  const [paid, byMethod, products, unpaid, statusGroups] = await Promise.all([
    prisma.order.aggregate({ where: { paymentStatus: "PAID" }, _sum: { total: true }, _count: true }),
    prisma.order.groupBy({ by: ["paymentMethod"], _count: true, _sum: { total: true } }),
    prisma.product.findMany({ orderBy: { soldCount: "desc" }, take: 10 }),
    prisma.order.aggregate({
      where: { paymentStatus: { not: "PAID" } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.order.groupBy({ by: ["status"], _count: true }),
  ]);

  const maxSold = Math.max(1, ...products.map((p) => p.soldCount));

  return (
    <div className="space-y-6 pb-8 lg:space-y-8 lg:pb-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold lg:text-4xl">Analitika</h1>
          <p className="mt-1 text-sm text-lf-muted">Savdo, to‘lov va hit mahsulotlar — to‘liq ekran</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-lf-card p-5 lg:min-h-[140px] lg:p-6">
          <div className="text-xs uppercase tracking-[0.14em] text-lf-muted">To‘langan tushum</div>
          <div className="mt-3 font-[family-name:var(--font-display)] text-2xl font-bold lg:text-3xl">
            {formatSom(paid._sum.total || 0)}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-lf-card p-5 lg:min-h-[140px] lg:p-6">
          <div className="text-xs uppercase tracking-[0.14em] text-lf-muted">To‘langan buyurtmalar</div>
          <div className="mt-3 font-[family-name:var(--font-display)] text-2xl font-bold lg:text-3xl">
            {paid._count}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-lf-card p-5 lg:min-h-[140px] lg:p-6">
          <div className="text-xs uppercase tracking-[0.14em] text-lf-muted">O‘rtacha chek</div>
          <div className="mt-3 font-[family-name:var(--font-display)] text-2xl font-bold lg:text-3xl">
            {formatSom(paid._count ? Math.round((paid._sum.total || 0) / paid._count) : 0)}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-lf-card p-5 lg:min-h-[140px] lg:p-6">
          <div className="text-xs uppercase tracking-[0.14em] text-lf-muted">To‘lanmagan</div>
          <div className="mt-3 font-[family-name:var(--font-display)] text-2xl font-bold lg:text-3xl">
            {unpaid._count}
          </div>
          <div className="mt-1 text-xs text-lf-muted">{formatSom(unpaid._sum.total || 0)}</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12 lg:gap-6">
        <div className="rounded-2xl border border-white/10 bg-lf-card p-5 lg:col-span-4 lg:min-h-[360px] lg:p-6">
          <h2 className="mb-5 text-lg font-semibold">To‘lov kanallari</h2>
          <div className="space-y-4">
            {byMethod.length === 0 && <p className="text-sm text-lf-muted">Ma’lumot yo‘q</p>}
            {byMethod.map((m) => (
              <div key={m.paymentMethod} className="flex items-center justify-between gap-3 border-b border-white/5 pb-3 text-sm last:border-0">
                <span className="font-medium">{m.paymentMethod}</span>
                <span className="text-right text-lf-muted">
                  <span className="block text-white">{m._count} ta</span>
                  {formatSom(m._sum.total || 0)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-lf-card p-5 lg:col-span-5 lg:min-h-[360px] lg:p-6">
          <h2 className="mb-5 text-lg font-semibold">Sotuv dinamikasi (hitlar)</h2>
          <div className="space-y-4">
            {products.map((p) => (
              <div key={p.id}>
                <div className="mb-1.5 flex justify-between gap-3 text-sm">
                  <span className="truncate">{p.name}</span>
                  <span className="shrink-0 text-lf-muted">{p.soldCount}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-lf-red"
                    style={{ width: `${Math.min(100, (100 * p.soldCount) / maxSold)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-lf-card p-5 lg:col-span-3 lg:min-h-[360px] lg:p-6">
          <h2 className="mb-5 text-lg font-semibold">Statuslar</h2>
          <div className="space-y-3">
            {statusGroups.map((s) => (
              <div key={s.status} className="flex justify-between rounded-xl bg-white/5 px-3 py-2.5 text-sm">
                <span className="text-white/70">{s.status}</span>
                <span className="font-semibold">{s._count}</span>
              </div>
            ))}
            {statusGroups.length === 0 && <p className="text-sm text-lf-muted">Ma’lumot yo‘q</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
