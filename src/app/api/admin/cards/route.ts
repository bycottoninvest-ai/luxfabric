import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  orderNumber: z.string().min(3),
});

/** Kartochkani arxivga saqlash (QR chop etilgach) */
export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const order = await prisma.order.update({
      where: { orderNumber: body.orderNumber.toUpperCase() },
      data: { cardSavedAt: new Date() },
      select: { orderNumber: true, customerName: true, cardSavedAt: true },
    });
    return NextResponse.json({ ok: true, order, cardUrl: `/card/${order.orderNumber}` });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Xatolik" },
      { status: 400 }
    );
  }
}
