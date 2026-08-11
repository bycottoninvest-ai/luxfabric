import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { encodeSkuQr, encodeOrderQr, encodeWarehouseQr } from "@/lib/qr";
import { getAppUrl } from "@/lib/settings";

/** QR rasm — telefonda ochiladigan URL bilan */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const barcode = searchParams.get("barcode");
  const order = searchParams.get("order");
  const warehouseId = searchParams.get("warehouse");
  const appUrl = await getAppUrl();

  let payload = "";
  let meta: Record<string, unknown> = {};

  if (barcode) {
    const variant = await prisma.productVariant.findUnique({
      where: { barcode },
      include: { product: true, stocks: { include: { warehouse: true } } },
    });
    if (!variant) return NextResponse.json({ error: "SKU topilmadi" }, { status: 404 });
    payload = encodeSkuQr(variant.barcode, appUrl);
    meta = {
      type: "sku",
      barcode: variant.barcode,
      sku: variant.sku,
      name: variant.product.name,
      color: variant.color,
      size: variant.size,
      stocks: variant.stocks.map((s) => ({
        warehouse: s.warehouse.name,
        qty: s.quantity,
      })),
    };
  } else if (order) {
    const row = await prisma.order.findUnique({
      where: { orderNumber: order },
      select: { orderNumber: true, status: true, customerName: true },
    });
    if (!row) return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });
    payload = encodeOrderQr(row.orderNumber, appUrl);
    meta = { type: "order", ...row };
  } else if (warehouseId) {
    const wh = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
    if (!wh) return NextResponse.json({ error: "Ombor topilmadi" }, { status: 404 });
    payload = encodeWarehouseQr(wh.id, appUrl);
    meta = { type: "warehouse", id: wh.id, name: wh.name, city: wh.city };
  } else {
    return NextResponse.json({ error: "barcode, order yoki warehouse kerak" }, { status: 400 });
  }

  const dataUrl = await QRCode.toDataURL(payload, {
    margin: 1,
    width: 360,
    color: { dark: "#0a0a0a", light: "#ffffff" },
  });

  return NextResponse.json({ qr: dataUrl, value: payload, ...meta });
}
