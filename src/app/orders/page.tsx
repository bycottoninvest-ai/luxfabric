import Link from "next/link";
import { StoreShell } from "@/components/StoreShell";
import { prisma } from "@/lib/prisma";
import { ORDER_STATUS, formatSom } from "@/lib/utils";

export default async function OrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { items: { include: { product: true } } },
  });

  return (
    <StoreShell>
      <h1 className="text-xl font-bold">Buyurtmalarim</h1>
      <p className="mt-1 text-sm text-lf-muted">Status va tracking bir joyda.</p>

      <div className="mt-4 space-y-2.5">
        {orders.map((order) => {
          const st = ORDER_STATUS[order.status] || ORDER_STATUS.NEW;
          return (
            <Link
              key={order.id}
              href={`/track/${order.orderNumber}`}
              className="block rounded-2xl border border-lf-border bg-white p-4 shadow-sm transition hover:border-lf-red/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold">{order.orderNumber}</div>
                  <div className="mt-1 text-xs text-lf-muted">
                    {order.items[0]?.product.name}
                    {order.items.length > 1 ? ` +${order.items.length - 1}` : ""}
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold text-white ${st.color}`}>
                  {st.label}
                </span>
              </div>
              <div className="mt-3 flex justify-between text-sm">
                <span className="text-lf-muted">{new Date(order.createdAt).toLocaleString("uz-UZ")}</span>
                <span className="font-bold">{formatSom(order.total)}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </StoreShell>
  );
}
