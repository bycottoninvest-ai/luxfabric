import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ORDER_STATUS, formatSom } from "@/lib/utils";
import { CourierTrackingForm } from "@/components/admin/CourierTrackingForm";
import { OrderStatusActions } from "@/components/admin/OrderStatusActions";
import { cutoffReminder, formatTashkentDate, formatTashkentDateTime } from "@/lib/tashkent-time";
import { isOpenForShipping, normalizeStatus } from "@/lib/fulfillment";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const now = new Date();
  const cutoff = cutoffReminder(now);

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

  const mustShipToday = orders.filter((o) => {
    if (!isOpenForShipping(o.status)) return false;
    if (!o.shipBy) return false;
    return o.shipBy.getTime() <= now.getTime() + 60 * 60 * 1000; // cutoff yaqin/o‘tgan
  });

  return (
    <div className="space-y-4 pb-10 lg:pb-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold lg:text-3xl">
            Buyurtmalar
          </h1>
          <p className="mt-0.5 text-xs text-lf-muted">
            {orders.length} ta · fulfillment pipeline · QR skaner
          </p>
        </div>
      </div>

      {/* Ops: cutoff + bugun jo‘natish */}
      <div
        className={`rounded-xl border px-3 py-2.5 text-xs ${
          cutoff.beforeCutoff
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
            : "border-amber-500/40 bg-amber-500/10 text-amber-100"
        }`}
      >
        <div className="font-semibold">Cutoff 15:00 (Toshkent)</div>
        <div className="mt-0.5 opacity-90">{cutoff.label}</div>
      </div>

      {mustShipToday.length > 0 && (
        <div className="rounded-xl border border-lf-red/40 bg-lf-red/10 px-3 py-2.5">
          <div className="text-xs font-semibold text-white">
            Bugun jo‘natilishi kerak · {mustShipToday.length} ta
          </div>
          <ul className="mt-2 space-y-1.5">
            {mustShipToday.map((o) => (
              <li
                key={o.id}
                className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-white/85"
              >
                <span className="font-mono font-semibold">{o.orderNumber}</span>
                <span className="text-white/50">
                  {ORDER_STATUS[normalizeStatus(o.status)]?.label || o.status}
                </span>
                <span className="text-amber-200/90">
                  shipBy {o.shipBy ? formatTashkentDateTime(o.shipBy) : "—"}
                </span>
                {o.promisedBy && (
                  <span className="text-white/45">
                    va’da {formatTashkentDate(o.promisedBy)}
                  </span>
                )}
                {!o.courierTracking && o.deliveryType !== "PICKUP" && (
                  <span className="text-rose-300">treksiz</span>
                )}
                <Link href={`/track/${o.orderNumber}`} className="text-lf-red hover:underline">
                  Track
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-white/10">
        {orders.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-lf-muted">Buyurtma yo‘q</p>
        )}

        {orders.map((o, idx) => {
          const st = ORDER_STATUS[normalizeStatus(o.status)] || ORDER_STATUS.NEW;
          const picked = o.items.reduce((s, i) => s + i.pickedQty, 0);
          const totalQty = o.items.reduce((s, i) => s + i.quantity, 0);
          const due =
            o.shipBy && isOpenForShipping(o.status) && o.shipBy.getTime() <= now.getTime();

          return (
            <div
              key={o.id}
              className={`border-b border-white/5 px-3 py-2.5 last:border-b-0 ${
                due ? "bg-lf-red/10" : idx % 2 === 0 ? "bg-lf-card" : "bg-black/20"
              }`}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-mono text-sm font-semibold">{o.orderNumber}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] text-white ${st.color}`}>
                  {st.label}
                </span>
                <span className="text-xs text-lf-muted">{o.paymentMethod}</span>
                {o.handoffMode && (
                  <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-lf-muted">
                    {o.handoffMode === "PVZ"
                      ? "PVZ"
                      : o.handoffMode === "WAREHOUSE"
                        ? "Ombor"
                        : "Uyga"}
                  </span>
                )}
                {due && (
                  <span className="rounded bg-lf-red px-1.5 py-0.5 text-[10px] text-white">
                    Bugun jo‘nat
                  </span>
                )}
                <span className="ml-auto text-sm font-semibold">{formatSom(o.total)}</span>
              </div>

              <div className="mt-1 flex flex-wrap items-baseline gap-x-2 text-[11px] text-lf-muted">
                <span className="text-white/80">
                  {o.customerName} · {o.customerPhone}
                </span>
                <span className="truncate">
                  {o.regionCode ? `${o.regionCode} · ` : ""}
                  {o.city}, {o.address}
                  {o.warehouse ? ` · ${o.warehouse.name}` : ""}
                </span>
                {o.promisedBy && (
                  <span className="text-emerald-300/90">
                    va’da {formatTashkentDate(o.promisedBy)}
                  </span>
                )}
                <span className="text-lf-red/80">{o.source}</span>
                <span className="text-amber-300/90">
                  QR {picked}/{totalQty}
                  {o.stockDeducted ? " ✓" : ""}
                </span>
              </div>

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
                          <div className="flex h-full items-center justify-center text-[8px] text-lf-muted">
                            —
                          </div>
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

              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <OrderStatusActions
                  orderId={o.id}
                  current={o.status}
                  deliveryType={o.deliveryType}
                  paymentStatus={o.paymentStatus}
                  courierTracking={o.courierTracking}
                />
                {o.deliveryType !== "PICKUP" && (
                  <CourierTrackingForm orderId={o.id} initialCode={o.courierTracking} />
                )}
                <div className="flex gap-2 text-[10px]">
                  <Link href="/admin/scan" className="text-lf-red hover:underline">
                    Skaner
                  </Link>
                  <Link
                    href={`/admin/labels/${o.orderNumber}`}
                    className="text-lf-red hover:underline"
                  >
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
