import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyDirector } from "@/lib/notify";
import { getSetting } from "@/lib/settings";

/** Direktor Telegram xabarini test qilish */
export async function POST() {
  const botToken = await getSetting("telegram_bot_token");
  const chat = await getSetting("telegram_director_chat_id");
  if (!botToken || !chat) {
    return NextResponse.json(
      {
        error:
          "Avval Sozlamalarda telegram_bot_token va telegram_director_chat_id ni saqlang",
      },
      { status: 400 }
    );
  }

  const order = await prisma.order.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true, orderNumber: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Test uchun kamida 1 ta buyurtma kerak" }, { status: 400 });
  }

  const result = await notifyDirector({
    orderId: order.id,
    event: "NEW",
    statusNote: "TEST xabar — sozlamalar tekshiruvi",
  });

  return NextResponse.json({ ok: true, orderNumber: order.orderNumber, result });
}
