import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { encodeOrderQr, encodeSkuQr } from "@/lib/qr";
import { ORDER_STATUS, formatSom } from "@/lib/utils";
import { getAppUrl } from "@/lib/settings";
import { QrLabelsClient } from "@/components/admin/QrLabelsClient";
import { ArrowLeft } from "lucide-react";

type Props = { params: Promise<{ orderNumber: string }> };

export default async function OrderLabelsPage({ params }: Props) {
  const { orderNumber } = await params;
  const appUrl = await getAppUrl();

  const order = await prisma.order.findUnique({
    where: { orderNumber },
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

  const orderPayload = encodeOrderQr(order.orderNumber, appUrl);
  const orderQr = await QRCode.toDataURL(orderPayload, { width: 280, margin: 1 });

  const itemLabels = await Promise.all(
    order.items.map(async (item) => {
      const value = encodeSkuQr(item.variant.barcode, appUrl);
      const qr = await QRCode.toDataURL(value, { width: 220, margin: 1 });
      const img =
        item.product.images.find((i) => i.color === item.variant.color)?.url ||
        item.product.images[0]?.url ||
        null;
      return {
        id: item.id,
        qr,
        barcode: item.variant.barcode,
        sku: item.variant.sku,
        name: item.product.name,
        color: item.variant.color,
        size: item.variant.size,
        quantity: item.quantity,
        image: img,
      };
    })
  );

  return (
    <div className="space-y-6 pb-20 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/admin/labels" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Barcha buyurtmalar
        </Link>
        <QrLabelsClient orderNumber={order.orderNumber} />
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 print:hidden">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{order.customerName}</h1>
            <div className="mt-1 text-sm text-white/70">{order.orderNumber}</div>
            {order.cardSavedAt && (
              <div className="mt-1 text-[11px] text-emerald-400">
                Kartochka saqlangan · {new Date(order.cardSavedAt).toLocaleString("uz-UZ")}
              </div>
            )}
            <div className="mt-2 space-y-1 text-sm text-white/60">
              <div>
                Telefon: <span className="text-white">{order.customerPhone}</span>
              </div>
              <div>
                Manzil:{" "}
                <span className="text-white">
                  {order.city}, {order.address}
                </span>
              </div>
              <div>
                Ombor: <span className="text-white">{order.warehouse?.name || "—"}</span>
              </div>
              <div>
                To‘lov:{" "}
                <span className={paid ? "text-emerald-300" : "text-amber-200"}>
                  {paid ? "To‘langan" : "To‘lanmagan"} · {order.paymentMethod}
                </span>
              </div>
              <div>
                Jami: <span className="font-semibold text-white">{formatSom(order.total)}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className={`inline-block rounded-full px-3 py-1 text-xs text-white ${st.color}`}>{st.label}</span>
            <Link href={`/card/${order.orderNumber}`} className="mt-3 block text-xs text-lf-red">
              Mobil kartochka →
            </Link>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {order.items.map((item) => {
            const img =
              item.product.images.find((i) => i.color === item.variant.color)?.url ||
              item.product.images[0]?.url;
            return (
              <div key={item.id} className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
                <div className="relative aspect-square">
                  {img ? (
                    <Image
                      src={img}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                      sizes="120px"
                      unoptimized={img.startsWith("/")}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-white/30">—</div>
                  )}
                </div>
                <div className="p-1.5 text-[10px] text-white/70">
                  {item.product.name}
                  <br />
                  {item.variant.color}/{item.variant.size} ×{item.quantity}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <p className="text-sm text-white/50 print:hidden">
        QR ichida: <code className="break-all text-white/80">{orderPayload}</code>
        <br />
        Telefonda skanerlansa kartochka ochiladi.
      </p>

      <div className="labels-print grid gap-3 sm:grid-cols-2">
        <article className="label-card rounded-2xl border border-white/10 bg-white p-4 text-black">
          <div className="flex gap-3">
            <Image src={orderQr} alt={order.orderNumber} width={120} height={120} unoptimized className="h-28 w-28" />
            <div className="text-sm">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-lf-red">Buyurtma QR</div>
              <div className="mt-1 text-lg font-bold">{order.orderNumber}</div>
              <div className="font-semibold">{order.customerName}</div>
              <div className="text-xs text-neutral-600">{order.customerPhone}</div>
              <div className="mt-1 text-xs text-neutral-600">
                {order.city}, {order.address}
              </div>
              <div className="mt-2 text-[10px] font-semibold">LUXFABRIC · KARTOCHKA</div>
            </div>
          </div>
        </article>

        {itemLabels.map((l) => (
          <article key={l.id} className="label-card rounded-2xl border border-white/10 bg-white p-4 text-black">
            <div className="flex gap-3">
              <Image src={l.qr} alt={l.barcode} width={120} height={120} unoptimized className="h-28 w-28" />
              <div className="min-w-0 flex-1 text-sm">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-lf-red">Mahsulot QR</div>
                <div className="mt-1 font-bold leading-tight">{l.name}</div>
                <div className="text-xs text-neutral-600">
                  {l.color} / {l.size} · ×{l.quantity}
                </div>
                <div className="mt-1 font-mono text-[11px]">{l.barcode}</div>
                <div className="mt-1 text-[10px] text-neutral-500">{order.orderNumber}</div>
                <div className="mt-1 text-[10px] font-semibold">LUXFABRIC</div>
              </div>
              {l.image && (
                <div className="relative hidden h-20 w-16 shrink-0 overflow-hidden rounded-lg sm:block">
                  <Image
                    src={l.image}
                    alt={l.name}
                    fill
                    className="object-cover"
                    sizes="64px"
                    unoptimized={l.image.startsWith("/")}
                  />
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
