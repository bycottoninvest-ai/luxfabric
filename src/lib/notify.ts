import { getSetting, getAppUrl } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import { formatSom, ORDER_STATUS } from "@/lib/utils";

export type NotifyPayload = {
  phone: string;
  telegramUsername?: string | null;
  channel: "SMS" | "TELEGRAM" | "BOTH" | "NONE";
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

function directorChatIds(raw: string) {
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function getBotToken() {
  return (
    (await getSetting("telegram_bot_token")) ||
    process.env.TELEGRAM_BOT_TOKEN ||
    ""
  );
}

async function getDirectorChats() {
  const raw =
    (await getSetting("telegram_director_chat_id")) ||
    process.env.TELEGRAM_DIRECTOR_CHAT_ID ||
    "";
  return directorChatIds(raw);
}

/** Buyurtma tasdiqlanganda mijozga SMS / Telegram */
export async function notifyOrderCreated(payload: NotifyPayload) {
  const results: { sms?: string; telegram?: string } = {};
  const appUrl = await getAppUrl();
  const trackUrl = `${appUrl}/track/${payload.orderNumber}`;
  const text =
    `LUXFABRIC: Buyurtmangiz qabul qilindi.\n` +
    `Raqam: ${payload.orderNumber}\n` +
    `Summa: ${payload.totalLabel}\n` +
    `Yetkazish: ${payload.deliveryLabel}\n` +
    `Tracking: ${trackUrl}`;

  const wantSms = payload.channel === "SMS" || payload.channel === "BOTH";
  const wantTg = payload.channel === "TELEGRAM" || payload.channel === "BOTH";

  if (wantSms) {
    const smsKey = await getSetting("sms_api_key");
    results.sms = smsKey ? `queued:${payload.phone}` : `demo-sms-sent:${payload.phone}`;
    console.log("[SMS]", payload.phone, text);
  }

  if (wantTg) {
    const botToken = await getBotToken();
    const chat = payload.telegramUsername?.replace(/^@/, "") || "";
    if (botToken && chat) {
      try {
        const r = await tgApi(botToken, "sendMessage", { chat_id: chat, text });
        results.telegram = r.ok ? `sent:@${chat}` : `failed:@${chat}`;
      } catch {
        results.telegram = `failed:@${chat}`;
      }
    } else {
      results.telegram = chat ? `demo-tg:@${chat}` : "demo-tg:no-username";
      console.log("[TELEGRAM]", chat || payload.phone, text);
    }
  }

  return results;
}

export type DirectorOrderNotify = {
  orderId: string;
  event: "NEW" | "STATUS" | "PACKED" | "CANCELLED" | "DELIVERED";
  statusNote?: string;
};

/** Direktor Telegramiga: har bir zakaz bo‘yicha xabar (majburiy oqim) */
export async function notifyDirector(payload: DirectorOrderNotify) {
  const enabled = (await getSetting("telegram_director_enabled", "true")) !== "false";
  const botToken = await getBotToken();
  const chats = await getDirectorChats();

  if (!enabled) {
    console.log("[DIRECTOR-TG] o‘chiq");
    return { skipped: "disabled" as const };
  }
  if (!botToken) {
    console.log("[DIRECTOR-TG] BOT TOKEN yo‘q — Admin → Sozlamalar");
    return { skipped: "no-token" as const, needSetup: true };
  }
  if (chats.length === 0) {
    console.log("[DIRECTOR-TG] CHAT ID yo‘q — Admin → Sozlamalar → Direktor Chat ID");
    return { skipped: "no-chat" as const, needSetup: true };
  }

  const order = await prisma.order.findUnique({
    where: { id: payload.orderId },
    include: {
      warehouse: true,
      preferredCourier: true,
      courier: true,
      items: {
        include: {
          product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 2 } } },
          variant: true,
        },
      },
    },
  });
  if (!order) return { skipped: "order-not-found" as const };

  const appUrl = await getAppUrl();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [todayCount, unpaidToday, paidToday, newOpen, picking, packed] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.order.count({
      where: { createdAt: { gte: startOfDay }, paymentStatus: { not: "PAID" } },
    }),
    prisma.order.count({
      where: { createdAt: { gte: startOfDay }, paymentStatus: "PAID" },
    }),
    prisma.order.count({ where: { status: "NEW" } }),
    prisma.order.count({ where: { status: "PICKING" } }),
    prisma.order.count({ where: { status: "PACKED" } }),
  ]);

  const paid = order.paymentStatus === "PAID";
  const payLabel = paid
    ? `TO‘LANGAN (${order.paymentMethod})`
    : `TO‘LANMAGAN (${order.paymentMethod} · ${order.paymentStatus})`;

  const statusLabel = ORDER_STATUS[order.status]?.label || order.status;
  const eventTitle =
    payload.event === "NEW"
      ? "YANGI BUYURTMA"
      : payload.event === "PACKED"
        ? "QADOQLANDI (QR)"
        : payload.event === "CANCELLED"
          ? "BEKOR QILINDI"
          : payload.event === "DELIVERED"
            ? "YETKAZILDI"
            : `STATUS: ${statusLabel}`;

  const itemsText = order.items
    .map(
      (i) =>
        `• ${i.product.name} — ${i.variant.color}/${i.variant.size} ×${i.quantity} = ${formatSom(i.price * i.quantity)}\n  barcode: ${i.variant.barcode}`
    )
    .join("\n");

  const text = [
    `<b>${eventTitle}</b>`,
    ``,
    `<b>${order.orderNumber}</b> · ${statusLabel}`,
    `Mijoz: ${escapeHtml(order.customerName)}`,
    `Telefon: <code>${escapeHtml(order.customerPhone)}</code>`,
    `Manzil: ${escapeHtml(order.city)}, ${escapeHtml(order.address)}`,
    `Ombor: ${escapeHtml(order.warehouse?.name || "—")}`,
    `Yetkazish: ${escapeHtml(order.courier?.nameUz || order.preferredCourier?.nameUz || order.deliveryType)}`,
    `Tolov: ${payLabel}`,
    `Jami: <b>${formatSom(order.total)}</b>`,
    ``,
    `<b>Mahsulotlar:</b>`,
    itemsText,
    ``,
    `<b>Bugungi statistika:</b>`,
    `Buyurtmalar: ${todayCount} (tolangan ${paidToday} · tolanmagan ${unpaidToday})`,
    `Navbat: yangi ${newOpen} · yigilmoqda ${picking} · qadoq ${packed}`,
    ``,
    payload.statusNote ? `Izoh: ${escapeHtml(payload.statusNote)}` : null,
    `Admin: ${appUrl}/admin/orders`,
    `Tracking: ${appUrl}/track/${order.orderNumber}`,
    `Skaner: ${appUrl}/admin/scan`,
  ]
    .filter(Boolean)
    .join("\n");

  const photoUrls = order.items
    .flatMap((i) => i.product.images.map((img) => absoluteUrl(appUrl, img.url)))
    .filter((u, idx, arr) => arr.indexOf(u) === idx)
    .slice(0, 5);

  const results: { chat: string; ok: boolean; detail?: string }[] = [];

  for (const chat of chats) {
    try {
      const msg = await tgApi(botToken, "sendMessage", {
        chat_id: chat,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      });

      // Rasmlar (public URL bo‘lsa Telegram o‘zi yuklaydi)
      const publicPhotos = photoUrls.filter((u) => u.startsWith("https://") && !u.includes("localhost"));
      if (publicPhotos.length === 1) {
        await tgApi(botToken, "sendPhoto", {
          chat_id: chat,
          photo: publicPhotos[0],
          caption: `${order.orderNumber} · mahsulot rasmi`,
        });
      } else if (publicPhotos.length > 1) {
        await tgApi(botToken, "sendMediaGroup", {
          chat_id: chat,
          media: publicPhotos.map((photo, i) => ({
            type: "photo",
            media: photo,
            caption: i === 0 ? `${order.orderNumber}` : undefined,
          })),
        });
      } else if (photoUrls.length > 0) {
        await tgApi(botToken, "sendMessage", {
          chat_id: chat,
          text: `Rasmlar (local): ${photoUrls.join("\n")}`,
        });
      }

      results.push({ chat, ok: msg.ok, detail: msg.ok ? "sent" : JSON.stringify(msg.data) });
      console.log("[DIRECTOR-TG]", chat, msg.ok ? "sent" : msg.data);
    } catch (e) {
      results.push({ chat, ok: false, detail: e instanceof Error ? e.message : "fail" });
    }
  }

  return { results, orderNumber: order.orderNumber };
}

function absoluteUrl(appUrl: string, path: string) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${appUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
