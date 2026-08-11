import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ORDER_STATUS, formatSom } from "@/lib/utils";
import { OrderStatusActions } from "@/components/admin/OrderStatusActions";

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      warehouse: { include: { region: true } },
      preferredCourier: true,
      courier: true,
      items: {
        include: {
          product: {
            include: { images: { orderBy: { sortOrder: "asc" }, take: 6 } },
          },
          variant: true,
        },
      },
    },
  });

  return (
    <div className="space-y-4 pb-10 lg:pb-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold lg:text-3xl">Buyurtmalar</h1>
          <p className="mt-0.5 text-xs text-lf-muted">{orders.length} ta · QR skaner → ombor</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10">
        {orders.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-lf-muted">Buyurtma yo‘q</p>
        )}

        {orders.map((o, idx) => {
          const st = ORDER_STATUS[o.status] || ORDER_STATUS.NEW;
          const picked = o.items.reduce((s, i) => s + i.pickedQty, 0);
          const totalQty = o.items.reduce((s, i) => s + i.quantity, 0);

          return (
            <div
              key={o.id}
              className={`border-b border-white/5 bg-lf-card px-3 py-2.5 last:border-b-0 ${
                idx % 2 === 0 ? "bg-lf-card" : "bg-black/20"
              }`}
            >
              {/* 1-qator: asosiy */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-mono text-sm font-semibold">{o.orderNumber}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] text-white ${st.color}`}>{st.label}</span>
                <span className="text-xs text-lf-muted">{o.paymentMethod}</span>
                <span className="ml-auto text-sm font-semibold">{formatSom(o.total)}</span>
              </div>

              {/* 2-qator: mijoz + manzil */}
              <div className="mt-1 flex flex-wrap items-baseline gap-x-2 text-[11px] text-lf-muted">
                <span className="text-white/80">
                  {o.customerName} · {o.customerPhone}
                </span>
                <span className="truncate">
                  {o.city}, {o.address}
                  {o.warehouse ? ` · ${o.warehouse.name}` : ""}
                </span>
                <span className="text-lf-red/80">{o.source}</span>
                <span className="text-amber-300/90">
                  QR {picked}/{totalQty}
                  {o.stockDeducted ? " ✓" : ""}
                </span>
              </div>

              {/* 3-qator: kichik thumbnails + variant */}
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {o.items.map((item) => {
                  const img =
                    item.product.images.find(
                      (i) => i.color && i.color.toLowerCase() === item.variant.color.toLowerCase()
                    )?.url || item.product.images[0]?.url;

                  return (
                    <div
                      key={item.id}
                      className="flex max-w-[200px] items-center gap-1.5 rounded-md border border-white/10 bg-black/30 py-0.5 pl-0.5 pr-2"
                      title={`${item.product.name} ${item.variant.color}/${item.variant.size}`}
                    >
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded bg-lf-surface">
                        {img ? (
                          <Image
                            src={img}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="36px"
                            unoptimized={img.startsWith("/")}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[8px] text-lf-muted">—</div>
                        )}
                      </div>
                      <div className="min-w-0 leading-tight">
                        <div className="truncate text-[10px] font-medium">{item.product.name}</div>
                        <div className="truncate text-[9px] text-lf-muted">
                          {item.variant.color}/{item.variant.size} ×{item.quantity}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 4-qator: status + linklar */}
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <OrderStatusActions orderId={o.id} current={o.status} />
                <div className="flex gap-2 text-[10px]">
                  <Link href="/admin/scan" className="text-lf-red hover:underline">
                    Skaner
                  </Link>
                  <Link href={`/admin/labels/${o.orderNumber}`} className="text-lf-red hover:underline">
                    Yorliq
                  </Link>
                  <Link href={`/track/${o.orderNumber}`} className="text-lf-red hover:underline">
                    Track
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
