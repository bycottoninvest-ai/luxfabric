import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  answerTelegramCallback,
  getTelegramBotToken,
  parseOrderCallbackData,
  syncTelegramOrderMessage,
} from "@/lib/telegram-orders";
import {
  eventTitleForStatus,
  normalizeStatus,
  validateTransition,
} from "@/lib/fulfillment";
import { notifyOrderStatus } from "@/lib/notify";

export const runtime = "nodejs";

function verifySecret(req: Request) {
  const secret =
    process.env.TELEGRAM_WEBHOOK_SECRET ||
    process.env.TELEGRAM_BOT_WEBHOOK_SECRET ||
    "";
  if (!secret) return true;
  const header = req.headers.get("x-telegram-bot-api-secret-token") || "";
  return header === secret;
}

/**
 * Telegram Bot webhook — inline status tugmalari.
 * Production: https://www.luxfabricshop.uz/api/telegram/webhook
 */
export async function POST(req: Request) {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let update: {
    callback_query?: {
      id: string;
      data?: string;
      from?: { id: number; username?: string };
      message?: { chat?: { id: number }; message_id?: number };
    };
  };

  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const cb = update.callback_query;
  if (!cb?.data) {
    return NextResponse.json({ ok: true });
  }

  const botToken = await getTelegramBotToken();
  if (!botToken) {
    return NextResponse.json({ ok: true, skipped: "no-token" });
  }

  const parsed = parseOrderCallbackData(cb.data);
  if (!parsed) {
    await answerTelegramCallback(botToken, cb.id, "Noma’lum tugma", true);
    return NextResponse.json({ ok: true });
  }

  const { orderId, status: toStatusRaw } = parsed;
  const toStatus =
    toStatusRaw === "WITH_COURIER" || toStatusRaw === "ON_THE_WAY"
      ? "SHIPPED"
      : toStatusRaw === "DONE"
        ? "DELIVERED"
        : toStatusRaw;

  try {
    const current = await prisma.order.findUnique({ where: { id: orderId } });
    if (!current) {
      await answerTelegramCallback(botToken, cb.id, "Buyurtma topilmadi", true);
      return NextResponse.json({ ok: true });
    }

    if (normalizeStatus(current.status) === normalizeStatus(toStatus)) {
      await answerTelegramCallback(botToken, cb.id, "Allaqachon shu statusda");
      await syncTelegramOrderMessage(orderId);
      return NextResponse.json({ ok: true });
    }

    const tracking =
      toStatus === "SHIPPED" && !current.courierTracking?.trim()
        ? "TELEGRAM"
        : current.courierTracking;

    const check = validateTransition(current.status, toStatus, {
      deliveryType: current.deliveryType,
      paymentStatus: current.paymentStatus,
      paymentMethod: current.paymentMethod,
      courierTracking: tracking,
    });

    if (!check.ok) {
      await answerTelegramCallback(botToken, cb.id, check.error, true);
      return NextResponse.json({ ok: true, error: check.error });
    }

    const title = eventTitleForStatus(toStatus, current.deliveryType);
    const who = cb.from?.username ? `@${cb.from.username}` : `id:${cb.from?.id || "?"}`;

    const prevStatus = current.status;
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: toStatus,
        ...(toStatus === "SHIPPED"
          ? {
              courierTracking: tracking,
              handedToCourierAt: current.handedToCourierAt || new Date(),
            }
          : {}),
        ...(toStatus === "DELIVERED" || toStatus === "DONE"
          ? { paymentStatus: "PAID" }
          : {}),
        ...(toStatus === "CANCELLED" && current.stockDeducted
          ? { stockDeducted: false }
          : {}),
        // Agar xabar boshqa chatdan kelgan bo‘lsa — shu message ni saqlaymiz
        ...(cb.message?.chat?.id != null && cb.message.message_id != null
          ? {
              telegramChatId: String(cb.message.chat.id),
              telegramMessageId: String(cb.message.message_id),
            }
          : {}),
        events: {
          create: {
            status: toStatus,
            title,
            note: `Telegram tugma · ${who}`,
          },
        },
      },
    });

    await syncTelegramOrderMessage(orderId, {
      statusNote: `Telegram: ${who}`,
    });

    try {
      await notifyOrderStatus({
        orderId,
        status: toStatus,
        prevStatus,
      });
    } catch (e) {
      console.error("[TG-WEBHOOK] customer notify", e);
    }

    await answerTelegramCallback(botToken, cb.id, `Status: ${title}`);
    return NextResponse.json({ ok: true, status: toStatus });
  } catch (e) {
    console.error("[TG-WEBHOOK]", e);
    await answerTelegramCallback(
      botToken,
      cb.id,
      e instanceof Error ? e.message : "Xatolik",
      true
    );
    return NextResponse.json({ ok: true });
  }
}

/** Health / BotFather tekshiruv */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "luxfabric-telegram-webhook",
    path: "/api/telegram/webhook",
  });
}
