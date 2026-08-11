import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ORDER_STATUS, formatSom } from "@/lib/utils";
import { Phone, MapPin, Package } from "lucide-react";

type Props = { params: Promise<{ orderNumber: string }> };

/** Mobil kartochka — QR skanerlansa telefon ochadi, topib olish uchun */
export default async function OrderCardPage({ params }: Props) {
  const { orderNumber } = await params;
  const order = await prisma.order.findUnique({
    where: { orderNumber: decodeURIComponent(orderNumber).toUpperCase() },
    include: {
      warehouse: true,
      preferredCourier: true,
      courier: true,
      items: {
        include: {
          product: {
            include: { images: { orderBy: { sortOrder: "asc" }, take: 3 } },
          },
          variant: true,
        },
      },
    },
  });

  if (!order) notFound();

  const st = ORDER_STATUS[order.status] || ORDER_STATUS.NEW;
  const paid = order.paymentStatus === "PAID";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="mx-auto max-w-lg px-4 py-6 pb-24">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-lf-red">
            LUXFABRIC · Kartochka
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[10px] text-white ${st.color}`}>{st.label}</span>
        </div>

        <h1 className="text-2xl font-bold leading-tight">{order.customerName}</h1>
        <p className="mt-1 font-mono text-sm text-white/60">{order.orderNumber}</p>

        <div className="mt-4 space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
          <a href={`tel:${order.customerPhone}`} className="flex items-center gap-2 text-white">
            <Phone className="h-4 w-4 text-lf-red" />
            {order.customerPhone}
          </a>
          <div className="flex items-start gap-2 text-white/80">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-lf-red" />
            <span>
              {order.city}, {order.address}
            </span>
          </div>
          <div className="flex items-center gap-2 text-white/70">
            <Package className="h-4 w-4 text-lf-red" />
            Ombor: {order.warehouse?.name || "—"}
          </div>
          <div className="pt-2 border-t border-white/10 flex flex-wrap gap-2 text-xs">
            <span
              className={`rounded-full px-2.5 py-1 ${
                paid ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-200"
              }`}
            >
              {paid ? "To‘langan" : "To‘lanmagan"} · {order.paymentMethod}
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-1">{formatSom(order.total)}</span>
          </div>
        </div>

        <h2 className="mt-6 mb-3 text-sm font-semibold text-white/50">Mahsulotlar / model</h2>
        <div className="space-y-3">
          {order.items.map((item) => {
            const img =
              item.product.images.find((i) => i.color === item.variant.color)?.url ||
              item.product.images[0]?.url;
            return (
              <div
                key={item.id}
                className="flex gap-3 overflow-hidden rounded-2xl border border-white/10 bg-white/5"
              >
                <div className="relative h-28 w-24 shrink-0 bg-black/40">
                  {img ? (
                    <Image
                      src={img}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                      sizes="96px"
                      unoptimized={img.startsWith("/")}
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1 py-3 pr-3">
                  <div className="font-semibold">{item.product.name}</div>
                  <div className="mt-0.5 text-xs text-white/55">
                    {item.variant.color} / {item.variant.size} · ×{item.quantity}
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-white/40">{item.variant.barcode}</div>
                  <div className="mt-1 text-xs text-white/70">{formatSom(item.price * item.quantity)}</div>
                  <div className="mt-1 text-[11px] text-white/40">
                    Yig‘ilgan: {item.pickedQty}/{item.quantity}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 grid gap-2">
          <Link
            href={`/admin/labels/${order.orderNumber}`}
            className="rounded-2xl bg-lf-red py-3.5 text-center text-sm font-bold"
          >
            QR yorliqlarni ochish
          </Link>
          <Link
            href="/admin/scan"
            className="rounded-2xl border border-white/15 py-3.5 text-center text-sm font-semibold"
          >
            QR Skaner
          </Link>
          <Link
            href={`/track/${order.orderNumber}`}
            className="rounded-2xl border border-white/10 py-3 text-center text-xs text-white/50"
          >
            Tracking
          </Link>
        </div>
      </div>
    </div>
  );
}
