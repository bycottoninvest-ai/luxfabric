import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { encodeSkuQr } from "@/lib/qr";
import { getAppUrl } from "@/lib/settings";
import { QrLabelsClient } from "@/components/admin/QrLabelsClient";

type Props = {
  params: Promise<{ barcode: string }>;
  searchParams: Promise<{ qty?: string }>;
};

/** Upakovka QR — kirimdan keyin chop. Chiqimda shu QR skanerlansa son kamayadi. */
export default async function PackLabelsPage({ params, searchParams }: Props) {
  const { barcode: raw } = await params;
  const barcode = decodeURIComponent(raw);
  const sp = await searchParams;
  const qty = Math.min(200, Math.max(1, Number(sp.qty) || 1));

  const variant = await prisma.productVariant.findUnique({
    where: { barcode },
    include: {
      product: {
        include: { images: { orderBy: { sortOrder: "asc" }, take: 4 } },
      },
    },
  });
  if (!variant) notFound();

  const appUrl = await getAppUrl();
  const payload = encodeSkuQr(variant.barcode, appUrl);
  const qr = await QRCode.toDataURL(payload, { width: 220, margin: 1 });
  const img =
    variant.product.images.find((i) => i.color === variant.color)?.url ||
    variant.product.images[0]?.url ||
    null;

  const copies = Array.from({ length: qty }, (_, i) => i);

  return (
    <div className="space-y-4 pb-16 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <Link
            href="/admin/scan"
            className="mb-2 inline-flex items-center gap-1 text-xs text-white/50 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Skanerga qaytish
          </Link>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">Upakovka QR</h1>
          <p className="mt-1 text-sm text-white/60">
            {variant.product.name} · {variant.color}/{variant.size} · {qty} ta yorliq
          </p>
          <p className="mt-1 text-xs text-amber-300/90">
            Chop eting → upakovkaga yopishtiring → <Link href="/admin/chiqim" className="text-lf-red underline">Chiqim</Link> da
            skanerlang → son avtomatik kamayadi
          </p>
        </div>
        <QrLabelsClient />
      </div>

      <div className="labels-print grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {copies.map((i) => (
          <div
            key={i}
            className="label-card flex gap-3 rounded-xl border border-white/15 bg-white p-3 text-black"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="QR" className="h-28 w-28 shrink-0" />
            <div className="min-w-0 flex-1 text-xs">
              <div className="font-bold leading-tight">{variant.product.name}</div>
              <div className="mt-1">
                {variant.color} / {variant.size}
              </div>
              <div className="mt-1 font-mono text-[10px] text-black/60">{variant.barcode}</div>
              <div className="mt-2 text-[10px] text-black/45">
                #{i + 1}/{qty} · LUXFABRIC
              </div>
              {img && (
                <div className="relative mt-2 hidden h-12 w-10 overflow-hidden rounded sm:block">
                  <Image
                    src={img}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="40px"
                    unoptimized={img.startsWith("/")}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
