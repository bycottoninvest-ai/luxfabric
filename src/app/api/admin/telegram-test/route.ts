import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOrderNotification, telegramOrdersConfigured } from "@/lib/telegram-orders";

/** Oxirgi buyurtma bo‘yicha Telegram test xabari */
export async function POST() {
  const cfg = await telegramOrdersConfigured();
  if (!cfg.hasToken || !cfg.hasChat) {
    return NextResponse.json(
      {
        error:
          "Avval Sozlamalarda telegram_bot_token va chat ID ni saqlang (yoki Vercel TELEGRAM_BOT_TOKEN / TELEGRAM_ORDERS_CHAT_ID)",
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

  const result = await sendOrderNotification(order.id, {
    statusNote: "TEST xabar — sozlamalar tekshiruvi",
  });

  if (result.skipped && result.skipped !== "disabled") {
    return NextResponse.json(
      { error: `Yuborilmadi: ${result.skipped}`, result },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, orderNumber: order.orderNumber, result, configured: cfg });
}
