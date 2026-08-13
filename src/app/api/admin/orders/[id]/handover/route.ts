import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notifyDirector, notifyOrderStatus } from "@/lib/notify";

const schema = z.object({
  courierId: z.string(),
  tracking: z.string().min(3, "Trek-kod majburiy"),
  note: z.string().optional(),
});

/** Ombordan kuryerga topshirish — trek majburiy (SHIPPED). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = schema.parse(await req.json());

    const courier = await prisma.courierPartner.findUnique({ where: { id: body.courierId } });
    if (!courier || !courier.isActive) {
      return NextResponse.json({ error: "Kuryer topilmadi yoki o‘chiq" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { warehouse: true },
    });
    if (!order) return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });

    const tracking = body.tracking.trim();
    if (!tracking) {
      return NextResponse.json({ error: "Trek-kod majburiy" }, { status: 400 });
    }

    const prevStatus = order.status;
    const updated = await prisma.order.update({
      where: { id },
      data: {
        courierId: courier.id,
        courierCode: courier.code,
        courierLabel: courier.nameUz,
        courierTracking: tracking,
        handedToCourierAt: new Date(),
        status: "SHIPPED",
        events: {
          create: {
            status: "SHIPPED",
            title: `${courier.nameUz} ga topshirildi`,
            note:
              body.note ||
              `Ombor: ${order.warehouse?.name || "—"} · Trek: ${tracking}`,
          },
        },
      },
      include: { courier: true, warehouse: true },
    });

    try {
      await notifyDirector({
        orderId: updated.id,
        event: "STATUS",
        statusNote: `${courier.nameUz} · Trek: ${tracking}`,
      });
    } catch (e) {
      console.error("[HANDOVER] director notify", e);
    }

    try {
      await notifyOrderStatus({
        orderId: updated.id,
        status: "SHIPPED",
        prevStatus,
      });
    } catch (e) {
      console.error("[HANDOVER] customer notify", e);
    }

    return NextResponse.json({
      ok: true,
      order: updated,
      pickup: {
        warehouse: order.warehouse?.name,
        address: order.warehouse?.address,
        city: order.warehouse?.city,
        phone: order.warehouse?.phone,
        message: `${courier.nameUz} ombordan jo‘natmani olib ketishi mumkin`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Xatolik" },
      { status: 400 }
    );
  }
}
