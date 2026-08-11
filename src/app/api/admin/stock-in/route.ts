import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { encodeSkuQr } from "@/lib/qr";
import { getAppUrl } from "@/lib/settings";

const schema = z.object({
  variantId: z.string().min(1),
  warehouseId: z.string().min(1),
  quantity: z.number().int().positive(),
});

/** Model tanlab kirim — stock + QR chop sahifasiga yo‘naltirish */
export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());

    const variant = await prisma.productVariant.findUnique({
      where: { id: body.variantId },
      include: {
        product: { select: { id: true, name: true } },
      },
    });
    if (!variant) {
      return NextResponse.json({ error: "Variant topilmadi" }, { status: 404 });
    }

    const warehouse = await prisma.warehouse.findUnique({ where: { id: body.warehouseId } });
    if (!warehouse) {
      return NextResponse.json({ error: "Ombor topilmadi" }, { status: 404 });
    }

    const qty = body.quantity;
    const stockLeft = await prisma.$transaction(async (tx) => {
      let stock = await tx.warehouseStock.findUnique({
        where: {
          warehouseId_variantId: {
            warehouseId: body.warehouseId,
            variantId: variant.id,
          },
        },
      });
      if (!stock) {
        stock = await tx.warehouseStock.create({
          data: {
            warehouseId: body.warehouseId,
            variantId: variant.id,
            quantity: 0,
          },
        });
      }

      const updated = await tx.warehouseStock.update({
        where: { id: stock.id },
        data: { quantity: { increment: qty } },
      });

      await tx.scanEvent.create({
        data: {
          action: "IN",
          rawCode: variant.barcode,
          barcode: variant.barcode,
          quantity: qty,
          variantId: variant.id,
          warehouseId: body.warehouseId,
          note: `Kirim +${qty} · ${variant.product.name} ${variant.color}/${variant.size}`,
        },
      });

      return updated.quantity;
    });

    const appUrl = await getAppUrl();
    const qrPayload = encodeSkuQr(variant.barcode, appUrl);
    const printPath = `/admin/labels/pack/${encodeURIComponent(variant.barcode)}?qty=${qty}`;

    return NextResponse.json({
      ok: true,
      message: `Kirim +${qty}: ${variant.product.name} ${variant.color}/${variant.size} · qoldiq ${stockLeft}`,
      stockLeft,
      barcode: variant.barcode,
      qrPayload,
      printPath,
      variant: {
        id: variant.id,
        color: variant.color,
        size: variant.size,
        barcode: variant.barcode,
        productName: variant.product.name,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Kirim xatosi" },
      { status: 400 }
    );
  }
}
