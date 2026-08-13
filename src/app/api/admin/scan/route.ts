import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseQrPayload, encodeSkuQr, encodeOrderQr } from "@/lib/qr";
import { notifyDirector, notifyOrderStatus } from "@/lib/notify";

const schema = z.object({
  code: z.string().min(1),
  /** OUT = ombordan chiqim (kamayadi), IN = kirim, ORDER = buyurtma yig‘ish */
  mode: z.enum(["OUT", "IN", "ORDER", "LOOKUP"]).default("ORDER"),
  warehouseId: z.string().optional().nullable(),
  orderId: z.string().optional().nullable(),
  quantity: z.number().int().positive().default(1),
});

export async function GET() {
  const [recent, warehouses, openOrders] = await Promise.all([
    prisma.scanEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        variant: { include: { product: true } },
        order: { select: { orderNumber: true, status: true } },
        warehouse: { select: { name: true, city: true } },
      },
    }),
    prisma.warehouse.findMany({
      where: { isActive: true },
      orderBy: { isCentral: "desc" },
      select: { id: true, name: true, city: true, isCentral: true },
    }),
    prisma.order.findMany({
      where: { status: { in: ["NEW", "PICKING"] } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        items: {
          include: {
            product: { select: { name: true } },
            variant: { select: { barcode: true, color: true, size: true, sku: true } },
          },
        },
        warehouse: { select: { id: true, name: true } },
      },
    }),
  ]);

  return NextResponse.json({ recent, warehouses, openOrders });
}

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const parsed = parseQrPayload(body.code);

    if (parsed.kind === "unknown") {
      return NextResponse.json({ error: "QR/barcode tanilmadi", parsed }, { status: 400 });
    }

    // Buyurtma QR — sessiyani ochish
    if (parsed.kind === "order") {
      const order = await prisma.order.findUnique({
        where: { orderNumber: parsed.orderNumber },
        include: {
          items: {
            include: {
              product: { select: { name: true } },
              variant: { select: { id: true, barcode: true, color: true, size: true, sku: true } },
            },
          },
          warehouse: true,
        },
      });
      if (!order) return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });

      const prevOpenStatus = order.status;
      if (order.status === "NEW" || order.status === "PAID") {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: "PICKING",
            events: {
              create: {
                status: "PICKING",
                title: "Omborda yig‘ilmoqda",
                note: "QR skaner orqali boshlandi",
              },
            },
          },
        });
        order.status = "PICKING";
      }

      await prisma.scanEvent.create({
        data: {
          action: "ORDER_OPEN",
          rawCode: parsed.raw,
          orderId: order.id,
          warehouseId: order.warehouseId,
          note: `Buyurtma ochildi: ${order.orderNumber}`,
        },
      });

      if (order.status === "PICKING" && prevOpenStatus !== "PICKING") {
        try {
          const { syncTelegramOrderMessage } = await import("@/lib/telegram-orders");
          await syncTelegramOrderMessage(order.id, {
            statusNote: "QR skaner: yig‘ish boshlandi",
          });
        } catch (e) {
          console.error("[SCAN] telegram sync open", e);
        }
        try {
          await notifyOrderStatus({
            orderId: order.id,
            status: "PICKING",
            prevStatus: prevOpenStatus,
          });
        } catch (e) {
          console.error("[SCAN] customer notify open", e);
        }
      }

      return NextResponse.json({
        ok: true,
        type: "ORDER_OPEN",
        message: `${order.orderNumber} ochildi — mahsulot QR larini skanerlang`,
        order: serializeOrder(order),
        qr: encodeOrderQr(order.orderNumber),
      });
    }

    if (parsed.kind === "warehouse") {
      const wh = await prisma.warehouse.findUnique({ where: { id: parsed.warehouseId } });
      if (!wh) return NextResponse.json({ error: "Ombor topilmadi" }, { status: 404 });
      return NextResponse.json({
        ok: true,
        type: "WAREHOUSE",
        message: `Ombor tanlandi: ${wh.name}`,
        warehouse: { id: wh.id, name: wh.name, city: wh.city },
      });
    }

    // SKU / barcode
    const barcode = parsed.barcode;
    const variant = await prisma.productVariant.findUnique({
      where: { barcode },
      include: {
        product: true,
        stocks: { include: { warehouse: true } },
      },
    });
    if (!variant) {
      return NextResponse.json({ error: `Barcode topilmadi: ${barcode}` }, { status: 404 });
    }

    if (body.mode === "LOOKUP") {
      return NextResponse.json({
        ok: true,
        type: "LOOKUP",
        variant: serializeVariant(variant),
        qr: encodeSkuQr(variant.barcode),
      });
    }

    // Buyurtma yig‘ish: stock kamayadi
    if (body.mode === "ORDER") {
      if (!body.orderId) {
        return NextResponse.json(
          { error: "Avval buyurtma QR ini skanerlang" },
          { status: 400 }
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: body.orderId! },
          include: {
            items: {
              include: {
                product: { select: { name: true } },
                variant: { select: { id: true, barcode: true, color: true, size: true, sku: true } },
              },
            },
            warehouse: true,
          },
        });
        if (!order) throw new Error("Buyurtma topilmadi");
        if (["CANCELLED", "DELIVERED"].includes(order.status)) {
          throw new Error("Bu buyurtmani yig‘ib bo‘lmaydi");
        }

        const item = order.items.find((i) => i.variantId === variant.id);
        if (!item) throw new Error("Bu mahsulot buyurtmada yo‘q");
        if (item.pickedQty >= item.quantity) {
          throw new Error("Bu pozitsiya allaqachon to‘liq skanerlangan");
        }

        const warehouseId = order.warehouseId || body.warehouseId;
        if (!warehouseId) throw new Error("Buyurtmada ombor yo‘q");

        const alreadyDeductedLegacy =
          order.stockDeducted && order.items.every((i) => i.pickedQty === 0);

        if (!alreadyDeductedLegacy) {
          const stock = await tx.warehouseStock.findUnique({
            where: { warehouseId_variantId: { warehouseId, variantId: variant.id } },
          });
          if (!stock || stock.quantity < 1) throw new Error("Omborda stock yetarli emas");

          await tx.warehouseStock.update({
            where: { id: stock.id },
            data: { quantity: { decrement: 1 } },
          });
          await tx.product.update({
            where: { id: variant.productId },
            data: { soldCount: { increment: 1 } },
          });
        }

        const stockRow = await tx.warehouseStock.findUnique({
          where: { warehouseId_variantId: { warehouseId, variantId: variant.id } },
        });

        const updatedItem = await tx.orderItem.update({
          where: { id: item.id },
          data: { pickedQty: { increment: 1 } },
          include: {
            product: { select: { name: true } },
            variant: { select: { id: true, barcode: true, color: true, size: true, sku: true } },
          },
        });

        await tx.scanEvent.create({
          data: {
            action: "ORDER_PICK",
            rawCode: parsed.raw,
            barcode: variant.barcode,
            quantity: 1,
            orderId: order.id,
            variantId: variant.id,
            warehouseId,
            note: `${variant.product.name} ${variant.color}/${variant.size} · ${updatedItem.pickedQty}/${item.quantity}`,
          },
        });

        const freshItems = order.items.map((i) =>
          i.id === updatedItem.id ? { ...i, pickedQty: updatedItem.pickedQty } : i
        );
        const allDone = freshItems.every((i) => i.pickedQty >= i.quantity);

        let status = order.status;
        if (order.status === "NEW" || order.status === "PAID") status = "PICKING";
        if (allDone) status = "PACKED";

        await tx.order.update({
          where: { id: order.id },
          data: {
            status,
            stockDeducted: true,
            ...(allDone
              ? {
                  events: {
                    create: {
                      status: "PACKED",
                      title: "Qadoqlandi",
                      note: "Barcha mahsulotlar QR orqali skanerlandi — ombordan yechildi",
                    },
                  },
                }
              : order.status === "NEW" || order.status === "PAID"
                ? {
                    events: {
                      create: {
                        status: "PICKING",
                        title: "Omborda yig‘ilmoqda",
                        note: "QR skaner orqali",
                      },
                    },
                  }
                : {}),
          },
        });

        return {
          order: { ...order, status, items: freshItems },
          prevStatus: order.status,
          item: updatedItem,
          allDone,
          stockLeft: stockRow?.quantity ?? 0,
          warehouseId,
        };
      });

      if (result.allDone) {
        try {
          await notifyDirector({
            orderId: result.order.id,
            event: "PACKED",
            statusNote: "QR skaner orqali to‘liq yig‘ildi",
          });
        } catch (e) {
          console.error("[SCAN] director notify", e);
        }
        try {
          await notifyOrderStatus({
            orderId: result.order.id,
            status: "PACKED",
            prevStatus: result.prevStatus,
          });
        } catch (e) {
          console.error("[SCAN] customer notify", e);
        }
      } else if (result.order.status === "PICKING" && result.prevStatus !== "PICKING") {
        try {
          await notifyDirector({
            orderId: result.order.id,
            event: "STATUS",
            statusNote: "QR skaner: yig‘ilmoqda",
          });
        } catch (e) {
          console.error("[SCAN] director notify picking", e);
        }
        try {
          await notifyOrderStatus({
            orderId: result.order.id,
            status: "PICKING",
            prevStatus: result.prevStatus,
          });
        } catch (e) {
          console.error("[SCAN] customer notify picking", e);
        }
      }

      return NextResponse.json({
        ok: true,
        type: "ORDER_PICK",
        message: result.allDone
          ? `Tayyor! ${result.order.orderNumber} qadoqlandi, stock yechildi`
          : `Skanerlandi: ${result.item.product.name} (${result.item.pickedQty}/${result.item.quantity}) · qoldiq ${result.stockLeft}`,
        order: serializeOrder(result.order),
        stockLeft: result.stockLeft,
        allDone: result.allDone,
      });
    }

    // Oddiy kirim / chiqim
    const warehouseId =
      body.warehouseId ||
      variant.stocks.find((s) => s.warehouse.isCentral)?.warehouseId ||
      variant.stocks[0]?.warehouseId;

    if (!warehouseId) {
      return NextResponse.json({ error: "Ombor tanlang" }, { status: 400 });
    }

    const qty = body.quantity || 1;
    const result = await prisma.$transaction(async (tx) => {
      let stock = await tx.warehouseStock.findUnique({
        where: { warehouseId_variantId: { warehouseId, variantId: variant.id } },
      });
      if (!stock) {
        stock = await tx.warehouseStock.create({
          data: { warehouseId, variantId: variant.id, quantity: 0 },
        });
      }

      if (body.mode === "OUT" && stock.quantity < qty) {
        throw new Error(`Stock yetarli emas (qoldiq: ${stock.quantity})`);
      }

      const updated = await tx.warehouseStock.update({
        where: { id: stock.id },
        data: {
          quantity: body.mode === "IN" ? { increment: qty } : { decrement: qty },
        },
      });

      await tx.scanEvent.create({
        data: {
          action: body.mode,
          rawCode: parsed.raw,
          barcode: variant.barcode,
          quantity: qty,
          variantId: variant.id,
          warehouseId,
          note: `${body.mode === "IN" ? "Kirim" : "Chiqim"} · ${variant.product.name}`,
        },
      });

      return updated.quantity;
    });

    return NextResponse.json({
      ok: true,
      type: body.mode,
      message:
        body.mode === "IN"
          ? `Kirim +${qty}: ${variant.product.name} · qoldiq ${result}`
          : `Chiqim -${qty}: ${variant.product.name} · qoldiq ${result}`,
      stockLeft: result,
      variant: serializeVariant(variant),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Skaner xatosi" },
      { status: 400 }
    );
  }
}

function serializeVariant(variant: {
  id: string;
  sku: string;
  barcode: string;
  color: string;
  size: string;
  product: { id: string; name: string; slug: string };
  stocks: { quantity: number; warehouse: { id: string; name: string; city: string } }[];
}) {
  return {
    id: variant.id,
    sku: variant.sku,
    barcode: variant.barcode,
    color: variant.color,
    size: variant.size,
    productName: variant.product.name,
    productSlug: variant.product.slug,
    stocks: variant.stocks.map((s) => ({
      warehouseId: s.warehouse.id,
      warehouse: s.warehouse.name,
      city: s.warehouse.city,
      quantity: s.quantity,
    })),
    qr: encodeSkuQr(variant.barcode),
  };
}

function serializeOrder(order: {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  customerPhone: string;
  city?: string;
  address?: string;
  deliveryType?: string;
  warehouseId: string | null;
  warehouse?: { id: string; name: string; city?: string } | null;
  items: {
    id: string;
    quantity: number;
    pickedQty: number;
    product: { name: string };
    variant: { id: string; barcode: string; color: string; size: string; sku: string };
  }[];
}) {
  const deliveryLabel =
    order.deliveryType === "PICKUP"
      ? "O‘zi olib ketish"
      : order.deliveryType === "COURIER_CHOICE"
        ? "Kuryer (mijoz tanladi)"
        : "Do‘kon yetkazadi";

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    city: order.city || "",
    address: order.address || "",
    deliveryType: order.deliveryType || "SHOP_DELIVERY",
    deliveryLabel,
    warehouseId: order.warehouseId,
    warehouseName: order.warehouse
      ? `${order.warehouse.name}${order.warehouse.city ? ` · ${order.warehouse.city}` : ""}`
      : null,
    items: order.items.map((i) => ({
      id: i.id,
      quantity: i.quantity,
      pickedQty: i.pickedQty,
      remaining: Math.max(0, i.quantity - i.pickedQty),
      productName: i.product.name,
      barcode: i.variant.barcode,
      color: i.variant.color,
      size: i.variant.size,
      sku: i.variant.sku,
      done: i.pickedQty >= i.quantity,
    })),
    progress: {
      picked: order.items.reduce((s, i) => s + i.pickedQty, 0),
      total: order.items.reduce((s, i) => s + i.quantity, 0),
    },
  };
}
