import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ORDER_FLOW } from "@/lib/utils";
import { notifyDirector } from "@/lib/notify";

const schema = z.object({
  status: z.string().optional(),
  note: z.string().optional(),
  warehouseId: z.string().nullable().optional(),
  /** Kuryer rasmiy trek-kodi (mijoz tracking sahifasida ko‘rinadi) */
  courierTracking: z.string().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = schema.parse(await req.json());

    // Faqat trek-kod
    if (body.courierTracking !== undefined && !body.status && body.warehouseId === undefined) {
      const tracking = (body.courierTracking || "").trim() || null;
      const current = await prisma.order.findUnique({ where: { id } });
      if (!current) return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });

      const order = await prisma.order.update({
        where: { id },
        data: {
          courierTracking: tracking,
          events: tracking
            ? {
                create: {
                  status: current.status,
                  title: "Trek-kod yangilandi",
                  note: `Trek: ${tracking}`,
                },
              }
            : undefined,
        },
      });
      return NextResponse.json({ ok: true, courierTracking: order.courierTracking });
    }

    // Faqat jo‘natish omborini o‘zgartirish
    if (body.warehouseId !== undefined && !body.status) {
      const warehouse = body.warehouseId
        ? await prisma.warehouse.findUnique({ where: { id: body.warehouseId } })
        : null;
      if (body.warehouseId && !warehouse) {
        return NextResponse.json({ error: "Ombor topilmadi" }, { status: 404 });
      }

      const order = await prisma.order.update({
        where: { id },
        data: {
          warehouseId: body.warehouseId,
          events: {
            create: {
              status: "PICKING",
              title: "Jo‘natish ombori belgilandi",
              note: warehouse
                ? `${warehouse.name} · ${warehouse.city}`
                : "Ombor olib tashlandi",
            },
          },
        },
        include: { warehouse: true },
      });

      return NextResponse.json({
        ok: true,
        warehouseId: order.warehouseId,
        warehouseName: order.warehouse?.name || null,
      });
    }

    const status = body.status;
    if (!status) {
      return NextResponse.json({ error: "status yoki warehouseId kerak" }, { status: 400 });
    }

    const flow = ORDER_FLOW.find((f) => f.status === status);
    const title = flow?.title || status;

    const order = await prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!current) throw new Error("Buyurtma topilmadi");

      if (
        status === "CANCELLED" &&
        current.status !== "CANCELLED" &&
        current.stockDeducted &&
        current.warehouseId
      ) {
        for (const item of current.items) {
          const qty = item.pickedQty > 0 ? item.pickedQty : item.quantity;
          if (qty < 1) continue;
          const stock = await tx.warehouseStock.findUnique({
            where: {
              warehouseId_variantId: {
                warehouseId: current.warehouseId,
                variantId: item.variantId,
              },
            },
          });
          if (stock) {
            await tx.warehouseStock.update({
              where: { id: stock.id },
              data: { quantity: { increment: qty } },
            });
          }
          await tx.product.update({
            where: { id: item.productId },
            data: { soldCount: { decrement: qty } },
          });
        }
      }

      const pickupReady =
        status === "PACKED" && current.deliveryType === "PICKUP" && !body.note;
      const defaultNote = pickupReady
        ? `Olib ketishga tayyor · xabar: ${current.notifyChannel}${
            current.telegramUsername ? ` · @${current.telegramUsername.replace(/^@/, "")}` : ""
          }`
        : status === "CANCELLED" && current.stockDeducted
          ? "Bekor · stock omborga qaytarildi"
          : "Admin panel orqali yangilandi";

      return tx.order.update({
        where: { id },
        data: {
          status,
          ...(body.warehouseId !== undefined ? { warehouseId: body.warehouseId } : {}),
          ...(body.courierTracking !== undefined
            ? { courierTracking: (body.courierTracking || "").trim() || null }
            : {}),
          ...(status === "DELIVERED" ? { paymentStatus: "PAID" } : {}),
          ...(status === "CANCELLED" ? { stockDeducted: false } : {}),
          events: {
            create: {
              status,
              title: pickupReady ? "Olib ketishga tayyor" : title,
              note: body.note || defaultNote,
            },
          },
        },
      });
    });

    const event =
      status === "CANCELLED"
        ? "CANCELLED"
        : status === "DELIVERED"
          ? "DELIVERED"
          : status === "PACKED"
            ? "PACKED"
            : "STATUS";

    const director = await notifyDirector({
      orderId: order.id,
      event,
      statusNote: body.note,
    });

    return NextResponse.json({ ...order, director });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Xatolik" },
      { status: 400 }
    );
  }
}
