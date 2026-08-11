import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Package, Truck } from "lucide-react";
import { StoreShell } from "@/components/StoreShell";
import { prisma } from "@/lib/prisma";
import { ORDER_STATUS, formatSom } from "@/lib/utils";

export default async function TrackPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      events: { orderBy: { createdAt: "asc" } },
      warehouse: true,
      courier: true,
      items: { include: { product: true, variant: true } },
    },
  });
  if (!order) notFound();

  const st = ORDER_STATUS[order.status] || ORDER_STATUS.NEW;
  const last = order.events[order.events.length - 1];

  return (
    <StoreShell>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lf-muted">Tracking</p>
          <h1 className="mt-1 text-xl font-bold">{order.orderNumber}</h1>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold text-white ${st.color}`}>{st.label}</span>
      </div>

      <div className="relative mt-4 overflow-hidden rounded-3xl border border-lf-border bg-white shadow-sm">
        <div className="relative aspect-[16/10] bg-gradient-to-br from-lf-pink via-white to-lf-bg p-4">
          <div className="absolute inset-6 rounded-2xl border border-dashed border-lf-red/25" />
          <div
            className="absolute h-3.5 w-3.5 rounded-full bg-lf-red shadow-[0_0_20px_rgba(225,29,46,0.8)]"
            style={{ left: "28%", top: "42%" }}
          />
          <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-lf-border bg-white/95 p-3 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Truck className="h-4 w-4 text-lf-red" />
              Live GPS · {last?.note || "Yangilanmoqda"}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-lf-muted">
              <MapPin className="h-3.5 w-3.5" />
              {order.city}, {order.address}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-3xl border border-lf-border bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-sm font-bold">Holatlar</h2>
        <ol className="space-y-4">
          {order.events.map((ev, idx) => (
            <li key={ev.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-lf-red" />
                {idx < order.events.length - 1 && <span className="mt-1 w-px flex-1 bg-lf-border" />}
              </div>
              <div className="pb-2">
                <div className="text-sm font-semibold">{ev.title}</div>
                {ev.note && <div className="text-xs text-lf-muted">{ev.note}</div>}
                <div className="mt-1 text-[11px] text-lf-muted">
                  {new Date(ev.createdAt).toLocaleString("uz-UZ")}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-3 space-y-2 rounded-3xl border border-lf-border bg-white p-4 text-sm shadow-sm">
        <div className="flex items-center gap-2 font-bold">
          <Package className="h-4 w-4 text-lf-red" /> Buyurtma tafsiloti
        </div>
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between text-lf-muted">
            <span>
              {item.product.name} · {item.variant.color}/{item.variant.size} ×{item.quantity}
            </span>
            <span>{formatSom(item.price * item.quantity)}</span>
          </div>
        ))}
        {order.warehouse && (
          <div className="pt-2 text-xs text-lf-muted">Ombor: {order.warehouse.name}</div>
        )}
        {order.courierLabel && (
          <div className="text-xs text-lf-muted">
            Kuryer: {order.courierLabel}
            {order.courierTracking ? ` · Trek: ${order.courierTracking}` : ""}
          </div>
        )}
        <div className="flex justify-between border-t border-lf-border pt-2 font-bold text-lf-text">
          <span>Jami</span>
          <span>{formatSom(order.total)}</span>
        </div>
      </div>

      <Link href="/orders" className="mt-4 block text-center text-sm font-semibold text-lf-red">
        Buyurtmalarimga qaytish
      </Link>
    </StoreShell>
  );
}
