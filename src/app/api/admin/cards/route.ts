import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE, readSessionToken } from "@/lib/admin-session";

const saveSchema = z.object({
  orderNumber: z.string().min(3),
});

const clearSchema = z.union([
  z.object({ all: z.literal(true) }),
  z.object({ orderNumber: z.string().min(3) }),
]);

async function requireAdmin() {
  const jar = await cookies();
  return readSessionToken(jar.get(ADMIN_COOKIE)?.value);
}

/** Kartochkani arxivga saqlash (QR chop etilgach) */
export async function POST(req: Request) {
  try {
    const body = saveSchema.parse(await req.json());
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

/**
 * Saqlangan kartochka belgisini tozalash (`cardSavedAt` → null).
 * Buyurtmani o‘chirmaydi — faqat «Saqlangan kartochkalar» ro‘yxatidan chiqaradi.
 */
export async function DELETE(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = clearSchema.parse(await req.json());

    if ("all" in body) {
      const result = await prisma.order.updateMany({
        where: { cardSavedAt: { not: null } },
        data: { cardSavedAt: null },
      });
      return NextResponse.json({ ok: true, cleared: result.count });
    }

    const orderNumber = body.orderNumber.toUpperCase();
    const order = await prisma.order.update({
      where: { orderNumber },
      data: { cardSavedAt: null },
      select: { orderNumber: true, customerName: true, cardSavedAt: true },
    });
    return NextResponse.json({ ok: true, cleared: 1, order });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Xatolik" },
      { status: 400 }
    );
  }
}
