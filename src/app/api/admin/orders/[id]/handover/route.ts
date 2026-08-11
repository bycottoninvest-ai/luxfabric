import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  courierId: z.string(),
  tracking: z.string().optional(),
  note: z.string().optional(),
});

/** Ombordan kuryerga topshirish */
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

    const tracking =
      body.tracking ||
      `${courier.code}-${order.orderNumber.replace("LF-", "")}-${Date.now().toString().slice(-6)}`;

    // Real API hook joyi (token bo‘lganda)
    // await callCourierApi(courier, order)

    const updated = await prisma.order.update({
      where: { id },
      data: {
        courierId: courier.id,
        courierCode: courier.code,
        courierLabel: courier.nameUz,
        courierTracking: tracking,
        handedToCourierAt: new Date(),
        status: "WITH_COURIER",
        events: {
          create: {
            status: "WITH_COURIER",
            title: `${courier.nameUz} ga topshirildi`,
            note:
              body.note ||
              `Ombor: ${order.warehouse?.name || "—"} · Trek: ${tracking} · Kuryer olib ketishi mumkin`,
          },
        },
      },
      include: { courier: true, warehouse: true },
    });

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
