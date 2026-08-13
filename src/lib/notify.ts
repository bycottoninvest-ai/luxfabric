import { getSetting, getAppUrl } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/sms";

export type NotifyChannel = "SMS" | "TELEGRAM" | "BOTH" | "NONE";

export type NotifyPayload = {
  phone: string;
  telegramUsername?: string | null;
  channel: NotifyChannel;
  orderNumber: string;
  totalLabel: string;
  deliveryLabel: string;
};

async function tgApi(botToken: string, method: string, body: Record<string, unknown>) {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && data.ok !== false, data };
}

async function getBotToken() {
  return (
    (await getSetting("telegram_bot_token")) ||
    process.env.TELEGRAM_BOT_TOKEN ||
    ""
  );
}

function wantsSms(channel: string | null | undefined) {
  const c = (channel || "SMS").toUpperCase();
  return c === "SMS" || c === "BOTH";
}

function wantsTg(channel: string | null | undefined) {
  const c = (channel || "SMS").toUpperCase();
  return c === "TELEGRAM" || c === "BOTH";
}

async function trackUrlFor(orderNumber: string) {
  const appUrl = await getAppUrl();
  return `${appUrl}/track/${orderNumber}`;
}

async function sendCustomerTelegram(username: string | null | undefined, text: string) {
  const botToken = await getBotToken();
  const chat = username?.replace(/^@/, "") || "";
  if (botToken && chat) {
    try {
      const r = await tgApi(botToken, "sendMessage", { chat_id: chat, text });
      return r.ok ? `sent:@${chat}` : `failed:@${chat}`;
    } catch {
      return `failed:@${chat}`;
    }
  }
  console.log("[TELEGRAM]", chat || "no-username", text.slice(0, 80));
  return chat ? `demo-tg:@${chat}` : "demo-tg:no-username";
}

async function sendCustomerSms(phone: string, text: string) {
  try {
    const r = await sendSms({ to: phone, text });
    if (r.skipped === "not-configured") return `demo-sms:${phone}`;
    if (r.ok) return `sent:${phone}${r.id ? `:${r.id}` : ""}`;
    return `failed:${phone}:${r.error || "error"}`;
  } catch (e) {
    console.error("[SMS] notify exception", e);
    return `failed:${phone}`;
  }
}

/** Buyurtma tasdiqlanganda mijozga SMS / Telegram */
export async function notifyOrderCreated(payload: NotifyPayload) {
  const results: { sms?: string; telegram?: string } = {};
  const trackUrl = await trackUrlFor(payload.orderNumber);
  const text =
    `LUXFABRIC.shop: Buyurtma qabul qilindi.\n` +
    `${payload.orderNumber}\n` +
    `${payload.totalLabel}\n` +
    `Yetkazish: ${payload.deliveryLabel}\n` +
    `${trackUrl}`;

  if (wantsSms(payload.channel)) {
    results.sms = await sendCustomerSms(payload.phone, text);
  }

  if (wantsTg(payload.channel)) {
    results.telegram = await sendCustomerTelegram(payload.telegramUsername, text);
  }

  return results;
}

export type OrderStatusNotify = {
  orderId: string;
  status: string;
  /** Oldingi status — bir xil bo‘lsa yubormaslik */
  prevStatus?: string | null;
};

const CUSTOMER_SMS_STATUSES = new Set([
  "PAID",
  "PICKING",
  "PACKED",
  "SHIPPED",
  "READY_PICKUP",
  "DELIVERED",
]);

function statusSmsText(opts: {
  status: string;
  orderNumber: string;
  trackUrl: string;
  courierLabel?: string | null;
  courierTracking?: string | null;
  deliveryType?: string | null;
}): string | null {
  const { status, orderNumber, trackUrl, courierLabel, courierTracking, deliveryType } = opts;
  const courier = courierLabel || "kuryer";

  switch (status) {
    case "PAID":
      return `LUXFABRIC.shop: To‘lov tasdiqlandi. ${orderNumber}\n${trackUrl}`;
    case "PICKING":
      return `LUXFABRIC.shop: Buyurtma omborda yig‘ilmoqda. ${orderNumber}\n${trackUrl}`;
    case "PACKED":
      return deliveryType === "PICKUP"
        ? `LUXFABRIC.shop: Buyurtma qadoqlandi. ${orderNumber}\n${trackUrl}`
        : `LUXFABRIC.shop: Buyurtma qadoqlandi, jo‘natishga tayyor. ${orderNumber}\n${trackUrl}`;
    case "SHIPPED":
      return courierTracking
        ? `LUXFABRIC.shop: ${courier} ga topshirildi.\n${orderNumber}\nTrek: ${courierTracking}\n${trackUrl}`
        : `LUXFABRIC.shop: ${courier} ga topshirildi.\n${orderNumber}\n${trackUrl}`;
    case "READY_PICKUP":
      return `LUXFABRIC.shop: Olib ketishga tayyor. ${orderNumber}\n${trackUrl}`;
    case "DELIVERED":
      return `LUXFABRIC.shop: Yetkazib berildi. Rahmat! ${orderNumber}\n${trackUrl}`;
    default:
      return null;
  }
}

/**
 * Holat o‘zgarishida mijozga SMS (va kerak bo‘lsa Telegram).
 * Fail-soft: xato buyurtmani buzmaydi.
 */
export async function notifyOrderStatus(payload: OrderStatusNotify) {
  const results: { sms?: string; telegram?: string; skipped?: string } = {};

  try {
    let status = payload.status;
    if (status === "WITH_COURIER" || status === "ON_THE_WAY") status = "SHIPPED";
    if (status === "DONE") status = "DELIVERED";

    if (!CUSTOMER_SMS_STATUSES.has(status)) {
      return { ...results, skipped: "status-not-notified" };
    }
    if (payload.prevStatus && payload.prevStatus === status) {
      return { ...results, skipped: "same-status" };
    }

    const order = await prisma.order.findUnique({
      where: { id: payload.orderId },
      select: {
        orderNumber: true,
        customerPhone: true,
        notifyChannel: true,
        telegramUsername: true,
        courierTracking: true,
        courierLabel: true,
        deliveryType: true,
        preferredCourier: { select: { nameUz: true } },
        courier: { select: { nameUz: true } },
      },
    });
    if (!order) return { ...results, skipped: "order-not-found" };

    const channel = (order.notifyChannel || "SMS") as NotifyChannel;
    if (channel === "NONE") return { ...results, skipped: "channel-none" };

    const trackUrl = await trackUrlFor(order.orderNumber);
    const courierLabel =
      order.courier?.nameUz || order.courierLabel || order.preferredCourier?.nameUz || null;
    const text = statusSmsText({
      status,
      orderNumber: order.orderNumber,
      trackUrl,
      courierLabel,
      courierTracking: order.courierTracking,
      deliveryType: order.deliveryType,
    });
    if (!text) return { ...results, skipped: "no-text" };

    if (wantsSms(channel)) {
      results.sms = await sendCustomerSms(order.customerPhone, text);
    }
    if (wantsTg(channel)) {
      results.telegram = await sendCustomerTelegram(order.telegramUsername, text);
    }
  } catch (e) {
    console.error("[NOTIFY-STATUS]", e);
    results.skipped = "exception";
  }

  return results;
}

export type DirectorOrderNotify = {
  orderId: string;
  event: "NEW" | "STATUS" | "PACKED" | "CANCELLED" | "DELIVERED";
  statusNote?: string;
};

/**
 * Direktor / admin Telegram — yangi buyurtma yoki status sinxron (editMessage).
 * Soft-fail: xato buyurtmani buzmaydi.
 */
export async function notifyDirector(payload: DirectorOrderNotify) {
  try {
    const { sendOrderNotification, syncTelegramOrderMessage } = await import(
      "@/lib/telegram-orders"
    );

    if (payload.event === "NEW") {
      return await sendOrderNotification(payload.orderId, {
        statusNote: payload.statusNote,
      });
    }

    return await syncTelegramOrderMessage(payload.orderId, {
      statusNote: payload.statusNote,
    });
  } catch (e) {
    console.error("[DIRECTOR-TG]", e);
    return { skipped: "exception" as const };
  }
}
