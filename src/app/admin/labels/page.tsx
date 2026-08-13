import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { ORDER_STATUS, formatSom } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { ClearSavedCardsPanel } from "@/components/admin/ClearSavedCardsPanel";

/** Buyurtmalar ro‘yxati — ism, to‘liq ma’lumot, model rasmi. Ichiga kirganda QR. */
export default async function AdminLabelsPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      warehouse: true,
      items: {
        include: {
          product: {
            include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
          },
          variant: true,
        },
      },
    },
  });

  const savedCards = orders
    .filter((o) => o.cardSavedAt)
    .map((o) => ({ orderNumber: o.orderNumber, customerName: o.customerName }));

  return (
    <div className="space-y-6 pb-20 text-white">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">QR Yorliqlar</h1>
        <p className="mt-1 text-sm text-white/60">
          Buyurtma → QR → Kartochka. Telefonda QR skanerlansa mijoz kartochkasi ochiladi.
        </p>
      </div>

      <ClearSavedCardsPanel cards={savedCards} />

      {orders.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/50">
          Hali buyurtma yo‘q. Checkoutdan zakaz kelgach shu yerda chiqadi.
        </div>
      )}

      <div className="space-y-3">
        {orders.map((o) => {
          const st = ORDER_STATUS[o.status] || ORDER_STATUS.NEW;
          const paid = o.paymentStatus === "PAID";
          const cover = o.items[0]?.product.images[0]?.url;

          return (
            <Link
              key={o.id}
              href={`/admin/labels/${o.orderNumber}`}
              className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:border-lf-red/50 hover:bg-white/[0.07]"
            >
              <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-black/40">
                {cover ? (
                  <Image
                    src={cover}
                    alt={o.items[0]?.product.name || o.orderNumber}
                    fill
                    className="object-cover"
                    sizes="80px"
                    unoptimized={cover.startsWith("/")}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] text-white/30">Rasm yo‘q</div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{o.customerName}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] text-white ${st.color}`}>{st.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                      paid ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-200"
                    }`}
                  >
                    {paid ? "To‘langan" : "To‘lanmagan"}
                  </span>
                  {o.cardSavedAt && (
                    <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] text-sky-300">
                      Kartochka
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-sm text-white/70">{o.orderNumber}</div>
                <div className="mt-1 text-xs text-white/50">
                  {o.customerPhone} · {o.city}, {o.address}
                </div>
                <div className="mt-1 text-xs text-white/45">
                  Ombor: {o.warehouse?.name || "—"} · {formatSom(o.total)} · {o.items.length} pozitsiya
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {o.items.slice(0, 4).map((item) => (
                    <span key={item.id} className="rounded-lg bg-black/30 px-2 py-1 text-[10px] text-white/70">
                      {item.product.name} {item.variant.color}/{item.variant.size} ×{item.quantity}
                    </span>
                  ))}
                  {o.items.length > 4 && (
                    <span className="rounded-lg bg-black/30 px-2 py-1 text-[10px] text-white/40">
                      +{o.items.length - 4}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center text-lf-red">
                <span className="mr-1 hidden text-xs sm:inline">QR ochish</span>
                <ChevronRight className="h-5 w-5" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
