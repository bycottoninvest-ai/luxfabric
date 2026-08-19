/**
 * Admin Telegram buyurtma xabarlari — yuborish, edit, inline status tugmalari.
 * Soft-fail: xato buyurtmani buzmaydi.
 */

import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import { formatSom } from "@/lib/utils";
import { encodeOrderQr } from "@/lib/qr";
import { normalizeStatus } from "@/lib/fulfillment";

const TG_API = "https://api.telegram.org";
const CAPTION_LIMIT = 1024;
const TEXT_LIMIT = 4096;

/** Telegram tugma → Order.status */
export const TG_STATUS_BUTTONS: { status: string; label: string }[] = [
  { status: "NEW", label: "Yangi" },
  { status: "PICKING", label: "Yig‘ilmoqda" },
  { status: "PACKED", label: "Tayyor" },
  { status: "SHIPPED", label: "Kuryerga berildi" },
  { status: "DELIVERED", label: "Yetkazildi" },
  { status: "CANCELLED", label: "Bekor qilish" },
];

const STATUS_LABEL_UZ: Record<string, string> = {
  NEW: "Yangi",
  PAID: "To‘langan",
  PICKING: "Yig‘ilmoqda",
  PACKED: "Tayyor",
  SHIPPED: "Kuryerga berildi",
  READY_PICKUP: "Olib ketishga tayyor",
  WITH_COURIER: "Kuryerga berildi",
  ON_THE_WAY: "Yo‘lda",
  DELIVERED: "Yetkazildi",
  DONE: "Yakunlandi",
  CANCELLED: "Bekor qilindi",
};

const SOURCE_LABEL: Record<string, string> = {
  STORE: "Sayt",
  INSTAGRAM: "Instagram",
  TELEGRAM: "Telegram",
  ADMIN: "Admin",
};

const PAY_LABEL: Record<string, string> = {
  CLICK: "Click",
  PAYME: "Payme",
  PAYNET: "Paynet",
  CARD: "Karta",
  COD: "Naqd (yetkazishda)",
};

export function parseOrderCallbackData(data: string): { orderId: string; status: string } | null {
  const m = data.match(/^order:([a-zA-Z0-9_-]+):([A-Z_]+)$/);
  if (!m) return null;
  return { orderId: m[1], status: m[2] };
}

export function orderCallbackData(orderId: string, status: string) {
  return `order:${orderId}:${status}`;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function truncate(s: string, max: number) {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

/** Telegram tashqi URL — production www. */
export function telegramPublicBase(): string {
  const fromEnv = (
    process.env.NEXT_PUBLIC_PROD_DOMAIN ||
    process.env.TELEGRAM_PUBLIC_BASE ||
    "https://www.luxfabricshop.uz"
  ).replace(/\/$/, "");
  if (fromEnv.includes("luxfabricshop.uz") && !fromEnv.includes("www.")) {
    return fromEnv.replace("://luxfabricshop.uz", "://www.luxfabricshop.uz");
  }
  return fromEnv;
}

export function absolutePublicUrl(path: string, appUrl?: string) {
  if (!path) return "";
  if (path.startsWith("https://")) return path;
  if (path.startsWith("http://")) {
    // localhost Telegram o‘qimaydi
    if (path.includes("localhost") || path.includes("127.0.0.1")) return "";
    return path;
  }
  const base = (appUrl || telegramPublicBase()).replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

async function getBotToken() {
  return (
    (await getSetting("telegram_bot_token")) ||
    process.env.TELEGRAM_BOT_TOKEN ||
    ""
  );
}

function splitChatIds(raw: string) {
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function getOrdersChatIds() {
  const raw =
    (await getSetting("telegram_orders_chat_id")) ||
    (await getSetting("telegram_director_chat_id")) ||
    process.env.TELEGRAM_ORDERS_CHAT_ID ||
    process.env.TELEGRAM_DIRECTOR_CHAT_ID ||
    "";
  return splitChatIds(raw);
}

async function isEnabled() {
  return (await getSetting("telegram_director_enabled", "true")) !== "false";
}

type TgResult = { ok: boolean; data: Record<string, unknown> };

async function tgJson(botToken: string, method: string, body: Record<string, unknown>): Promise<TgResult> {
  try {
    const res = await fetch(`${TG_API}/bot${botToken}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok && data.ok !== false, data };
  } catch (e) {
    console.error("[TG]", method, e);
    return { ok: false, data: { description: e instanceof Error ? e.message : "network" } };
  }
}

async function tgForm(botToken: string, method: string, form: FormData): Promise<TgResult> {
  try {
    const res = await fetch(`${TG_API}/bot${botToken}/${method}`, {
      method: "POST",
      body: form,
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok && data.ok !== false, data };
  } catch (e) {
    console.error("[TG]", method, e);
    return { ok: false, data: { description: e instanceof Error ? e.message : "network" } };
  }
}

function statusLabel(status: string) {
  const n = normalizeStatus(status);
  return STATUS_LABEL_UZ[n] || STATUS_LABEL_UZ[status] || status;
}

function buildInlineKeyboard(orderId: string, currentStatus: string, deliveryType: string) {
  const cur = normalizeStatus(currentStatus);
  const shipStatus = deliveryType === "PICKUP" ? "READY_PICKUP" : "SHIPPED";
  const shipLabel = deliveryType === "PICKUP" ? "Olib ketishga tayyor" : "Kuryerga berildi";

  const rows: { text: string; callback_data: string }[][] = [];
  const main = [
    { status: "NEW", label: "Yangi" },
    { status: "PICKING", label: "Yig‘ilmoqda" },
    { status: "PACKED", label: "Tayyor" },
    { status: shipStatus, label: shipLabel },
    { status: "DELIVERED", label: "Yetkazildi" },
  ];

  // 2+2+1
  const line1 = main.slice(0, 2).map((b) => ({
    text: cur === normalizeStatus(b.status) ? `✓ ${b.label}` : b.label,
    callback_data: orderCallbackData(orderId, b.status),
  }));
  const line2 = main.slice(2, 4).map((b) => ({
    text: cur === normalizeStatus(b.status) ? `✓ ${b.label}` : b.label,
    callback_data: orderCallbackData(orderId, b.status),
  }));
  const line3 = main.slice(4).map((b) => ({
    text: cur === normalizeStatus(b.status) ? `✓ ${b.label}` : b.label,
    callback_data: orderCallbackData(orderId, b.status),
  }));
  rows.push(line1, line2, line3);
  rows.push([
    {
      text: cur === "CANCELLED" ? "✓ Bekor qilish" : "Bekor qilish",
      callback_data: orderCallbackData(orderId, "CANCELLED"),
    },
  ]);

  return { inline_keyboard: rows };
}

type OrderFull = NonNullable<Awaited<ReturnType<typeof loadOrder>>>;

async function loadOrder(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      warehouse: true,
      preferredCourier: true,
      courier: true,
      items: {
        include: {
          product: {
            include: { images: { orderBy: { sortOrder: "asc" }, take: 3 } },
          },
          variant: true,
        },
      },
    },
  });
}

function itemLines(order: OrderFull) {
  return order.items.map((i, idx) => {
    const model = i.variant.sku || i.product.slug || "—";
    return [
      `<b>${idx + 1}. ${escapeHtml(i.product.name)}</b>`,
      `Model: <code>${escapeHtml(model)}</code>`,
      `Rang: ${escapeHtml(i.variant.color)} · O‘lcham: ${escapeHtml(i.variant.size)}`,
      `Soni: ${i.quantity} · Narx: ${formatSom(i.price)} · Qator: ${formatSom(i.price * i.quantity)}`,
    ].join("\n");
  });
}

export function formatOrderCaption(order: OrderFull, opts?: { statusNote?: string; appUrl?: string }) {
  const appUrl = opts?.appUrl || telegramPublicBase();
  const paid = order.paymentStatus === "PAID";
  const pay =
    PAY_LABEL[order.paymentMethod] ||
    order.paymentMethod +
      (paid ? " · TO‘LANGAN" : ` · ${order.paymentStatus}`);
  const source = SOURCE_LABEL[order.source] || order.source;
  const qrPayload = encodeOrderQr(order.orderNumber, appUrl);
  const courier =
    order.courier?.nameUz || order.preferredCourier?.nameUz || order.courierLabel || order.deliveryType;

  const parts = [
    `<b>🛍 ${escapeHtml(order.orderNumber)}</b>`,
    `Status: <b>${escapeHtml(statusLabel(order.status))}</b>`,
    `Manba: ${escapeHtml(source)}`,
    ``,
    `<b>Mijoz</b>`,
    `${escapeHtml(order.customerName)}`,
    `📞 <code>${escapeHtml(order.customerPhone)}</code>`,
    `📍 ${escapeHtml(order.city)}, ${escapeHtml(order.address)}`,
    order.note ? `Izoh: ${escapeHtml(order.note)}` : null,
    ``,
    `<b>Mahsulotlar</b>`,
    ...itemLines(order).flatMap((block, i, arr) => (i < arr.length - 1 ? [block, ""] : [block])),
    ``,
    `Yetkazish: ${escapeHtml(courier)}`,
    `To‘lov: ${escapeHtml(pay)}`,
    `Jami: <b>${formatSom(order.total)}</b>`,
    order.courierTracking ? `Trek: <code>${escapeHtml(order.courierTracking)}</code>` : null,
    ``,
    `<b>QR</b>`,
    `<code>${escapeHtml(order.orderNumber)}</code>`,
    escapeHtml(qrPayload),
    opts?.statusNote ? `\nIzoh: ${escapeHtml(opts.statusNote)}` : null,
    `Admin: ${appUrl}/admin/orders`,
  ].filter((x) => x !== null);

  return truncate(parts.join("\n"), TEXT_LIMIT);
}

function productPhotoCaption(order: OrderFull, index: number) {
  const i = order.items[index];
  if (!i) return "";
  const model = i.variant.sku || "—";
  return truncate(
    [
      `${index + 1}/${order.items.length} · ${i.product.name}`,
      `Model: ${model}`,
      `Rang: ${i.variant.color} · O‘lcham: ${i.variant.size}`,
      `×${i.quantity} · ${formatSom(i.price)}`,
      order.orderNumber,
    ].join("\n"),
    CAPTION_LIMIT
  );
}

function collectItemPhotos(order: OrderFull, appUrl: string) {
  return order.items
    .map((item) => {
      const img =
        item.product.images.find((x) => x.color && x.color === item.variant.color) ||
        item.product.images[0];
      const url = img ? absolutePublicUrl(img.url, appUrl) : "";
      return url.startsWith("https://") ? url : "";
    })
    .filter(Boolean);
}

async function sendQrPhoto(botToken: string, chatId: string, order: OrderFull, appUrl: string) {
  try {
    const payload = encodeOrderQr(order.orderNumber, appUrl);
    const buf = await QRCode.toBuffer(payload, {
      type: "png",
      width: 420,
      margin: 1,
      errorCorrectionLevel: "M",
    });
    const form = new FormData();
    form.append("chat_id", chatId);
    form.append(
      "photo",
      new Blob([new Uint8Array(buf)], { type: "image/png" }),
      `${order.orderNumber}-qr.png`
    );
    form.append("caption", truncate(`QR · ${order.orderNumber}`, CAPTION_LIMIT));
    return tgForm(botToken, "sendPhoto", form);
  } catch (e) {
    console.error("[TG-QR]", e);
    return { ok: false, data: {} };
  }
}

/**
 * Yangi buyurtma — media (mahsulot rasmlari) + asosiy xabar (caption + tugmalar) + QR.
 * Birinchi chatga messageId saqlanadi (edit uchun).
 */
export async function sendOrderNotification(
  orderId: string,
  opts?: { statusNote?: string }
): Promise<{
  skipped?: string;
  needSetup?: boolean;
  orderNumber?: string;
  results?: { chat: string; ok: boolean; messageId?: number }[];
}> {
  try {
    if (!(await isEnabled())) return { skipped: "disabled" };
    const botToken = await getBotToken();
    const chats = await getOrdersChatIds();
    if (!botToken) return { skipped: "no-token", needSetup: true };
    if (chats.length === 0) return { skipped: "no-chat", needSetup: true };

    const order = await loadOrder(orderId);
    if (!order) return { skipped: "order-not-found" };

    const appUrl = telegramPublicBase();
    const captionPublic = formatOrderCaption(order, {
      statusNote: opts?.statusNote,
      appUrl,
    });

    const photos = collectItemPhotos(order, appUrl);
    const keyboard = buildInlineKeyboard(order.id, order.status, order.deliveryType);
    const results: { chat: string; ok: boolean; messageId?: number }[] = [];
    let primaryMessageId: number | undefined;
    let primaryChatId: string | undefined;

    for (const chat of chats) {
      try {
        // Mahsulot rasmlari (media group — tugmasiz). Rasm xatosi asosiy xabarni to‘xtatmasin.
        try {
          if (photos.length === 1) {
            await tgJson(botToken, "sendPhoto", {
              chat_id: chat,
              photo: photos[0],
              caption: productPhotoCaption(order, 0),
            });
          } else if (photos.length > 1) {
            const media = photos.slice(0, 10).map((photo, i) => ({
              type: "photo",
              media: photo,
              caption: productPhotoCaption(order, i),
            }));
            await tgJson(botToken, "sendMediaGroup", { chat_id: chat, media });
          }
        } catch (e) {
          console.warn("[TG-ORDERS] photos skip", order.orderNumber, e);
        }

        try {
          await sendQrPhoto(botToken, chat, order, appUrl);
        } catch (e) {
          console.warn("[TG-ORDERS] qr skip", order.orderNumber, e);
        }

        const msg = await tgJson(botToken, "sendMessage", {
          chat_id: chat,
          text: captionPublic,
          parse_mode: "HTML",
          disable_web_page_preview: true,
          reply_markup: keyboard,
        });

        const resultObj = msg.data.result as { message_id?: number } | undefined;
        const messageId = resultObj?.message_id;
        results.push({ chat, ok: msg.ok, messageId });
        if (msg.ok && messageId != null && primaryMessageId == null) {
          primaryMessageId = messageId;
          primaryChatId = chat;
        }
        console.log("[TG-ORDERS] send", order.orderNumber, chat, msg.ok ? "ok" : msg.data);
      } catch (e) {
        results.push({
          chat,
          ok: false,
        });
        console.error("[TG-ORDERS] send fail", chat, e);
      }
    }

    if (primaryMessageId != null && primaryChatId) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          telegramMessageId: String(primaryMessageId),
          telegramChatId: primaryChatId,
        },
      });
    }

    return { orderNumber: order.orderNumber, results };
  } catch (e) {
    console.error("[TG-ORDERS] sendOrderNotification", e);
    return { skipped: "exception" };
  }
}

/**
 * Mavjud Telegram xabarni yangilash (editMessageText + reply_markup).
 * MessageId yo‘q bo‘lsa — yangi yuboradi (recovery).
 */
export async function syncTelegramOrderMessage(
  orderId: string,
  opts?: { statusNote?: string; forceResend?: boolean }
): Promise<{ skipped?: string; ok?: boolean; edited?: boolean; sent?: boolean }> {
  try {
    if (!(await isEnabled())) return { skipped: "disabled" };
    const botToken = await getBotToken();
    if (!botToken) return { skipped: "no-token" };

    const order = await loadOrder(orderId);
    if (!order) return { skipped: "order-not-found" };

    const appUrl = telegramPublicBase();
    const text = formatOrderCaption(order, { statusNote: opts?.statusNote, appUrl });
    const keyboard = buildInlineKeyboard(order.id, order.status, order.deliveryType);

    if (!order.telegramMessageId || !order.telegramChatId || opts?.forceResend) {
      const sent = await sendOrderNotification(orderId, { statusNote: opts?.statusNote });
      return { ok: !sent.skipped || sent.skipped === undefined, sent: true, skipped: sent.skipped };
    }

    const edited = await tgJson(botToken, "editMessageText", {
      chat_id: order.telegramChatId,
      message_id: Number(order.telegramMessageId),
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: keyboard,
    });

    // "message is not modified" — OK
    const desc = String(edited.data.description || "");
    if (!edited.ok && desc.includes("message is not modified")) {
      return { ok: true, edited: true };
    }
    if (!edited.ok) {
      console.warn("[TG-ORDERS] edit failed, resend", order.orderNumber, edited.data);
      await sendOrderNotification(orderId, { statusNote: opts?.statusNote });
      return { ok: true, sent: true };
    }

    return { ok: true, edited: true };
  } catch (e) {
    console.error("[TG-ORDERS] syncTelegramOrderMessage", e);
    return { skipped: "exception" };
  }
}

export async function answerTelegramCallback(
  botToken: string,
  callbackQueryId: string,
  text?: string,
  showAlert?: boolean
) {
  return tgJson(botToken, "answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text: text || undefined,
    show_alert: showAlert || false,
  });
}

export async function getTelegramBotToken() {
  return getBotToken();
}

export async function telegramOrdersConfigured() {
  const token = await getBotToken();
  const chats = await getOrdersChatIds();
  const enabled = await isEnabled();
  return {
    enabled,
    hasToken: Boolean(token),
    hasChat: chats.length > 0,
    chatCount: chats.length,
    configured: Boolean(token && chats.length > 0 && enabled),
  };
}
