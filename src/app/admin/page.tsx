import Link from "next/link";
import { getDashboardStats } from "@/lib/catalog";
import { ORDER_STATUS, formatSom } from "@/lib/utils";
import { ResetDashboardStatsButton } from "@/components/admin/ResetDashboardStatsButton";

export default async function AdminDashboard() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-6 pb-8 lg:pb-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">Dashboard</h1>
          <p className="mt-1 text-sm text-lf-muted">Real-time savdo, ombor va buyurtmalar holati</p>
        </div>
        {stats.orderCount > 0 || stats.customers > 0 || stats.revenue > 0 ? (
          <ResetDashboardStatsButton />
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Tushum (to‘langan)", value: formatSom(stats.revenue) },
          { label: "Buyurtmalar", value: String(stats.orderCount) },
          { label: "Mahsulotlar", value: String(stats.productCount) },
          { label: "Mijozlar", value: String(stats.customers) },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-white/10 bg-lf-card p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-lf-muted">{card.label}</div>
            <div className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-white/10 bg-lf-card p-4 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">So‘nggi buyurtmalar</h2>
            <Link href="/admin/orders" className="text-xs text-lf-red">
              Barchasi
            </Link>
          </div>
          <div className="space-y-2">
            {stats.recentOrders.length === 0 && (
              <p className="rounded-xl border border-white/5 px-3 py-6 text-center text-sm text-lf-muted">
                Hozircha buyurtma yo‘q
              </p>
            )}
            {stats.recentOrders.map((o) => {
              const st = ORDER_STATUS[o.status] || ORDER_STATUS.NEW;
              return (
                <div key={o.id} className="flex items-center justify-between rounded-xl border border-white/5 px-3 py-2.5 text-sm">
                  <div>
                    <div className="font-medium">{o.orderNumber}</div>
                    <div className="text-xs text-lf-muted">
                      {o.customerPhone} · {o.items[0]?.product.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatSom(o.total)}</div>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] text-white ${st.color}`}>
                      {st.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-lf-card p-4 lg:col-span-2">
          <h2 className="mb-4 font-semibold">Top mahsulotlar</h2>
          <div className="space-y-3">
            {stats.topProducts.every((p) => p.soldCount === 0) ? (
              <p className="rounded-xl border border-white/5 px-3 py-6 text-center text-sm text-lf-muted">
                Hozircha savdo yo‘q
              </p>
            ) : (
              stats.topProducts.map((p, idx) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-lf-red/15 text-xs text-lf-red">
                      {idx + 1}
                    </span>
                    <span>{p.name}</span>
                  </div>
                  <span className="text-lf-muted">{p.soldCount}</span>
                </div>
              ))
            )}
          </div>
          <div className="mt-6 rounded-xl border border-lf-red/30 bg-lf-red/10 p-3 text-xs leading-relaxed text-lf-muted">
            12 ta ombor onlayn. Eng past qoldiqlar avtomatik ogohlantirishga tayyor.
          </div>
        </div>
      </div>
    </div>
  );
}
