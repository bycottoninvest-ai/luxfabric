import { createHash, timingSafeEqual } from "node:crypto";
import { getSetting, getAppUrl } from "@/lib/settings";

/** Click SHOP API xato kodlari */
export const ClickError = {
  Success: 0,
  SignFailed: -1,
  InvalidAmount: -2,
  ActionNotFound: -3,
  AlreadyPaid: -4,
  OrderNotFound: -5,
  TransactionNotFound: -6,
  FailedToUpdate: -7,
  BadRequest: -8,
  TransactionCanceled: -9,
} as const;

export type ClickConfig = {
  merchantId: string;
  serviceId: string;
  secretKey: string;
};

export async function getClickConfig(): Promise<ClickConfig> {
  const merchantId =
    (process.env.CLICK_MERCHANT_ID || "").trim() ||
    (await getSetting("click_merchant_id")).trim();
  const serviceId =
    (process.env.CLICK_SERVICE_ID || "").trim() ||
    (await getSetting("click_service_id")).trim();
  const secretKey =
    (process.env.CLICK_SECRET_KEY || "").trim() ||
    (await getSetting("click_secret_key")).trim();
  return { merchantId, serviceId, secretKey };
}

export function isClickConfigured(cfg: ClickConfig) {
  return Boolean(cfg.merchantId && cfg.serviceId && cfg.secretKey);
}

/** my.click.uz to‘lov sahifasi (amount — so‘m) */
export function buildClickPayUrl(opts: {
  merchantId: string;
  serviceId: string;
  amount: number;
  transactionParam: string;
  returnUrl: string;
}) {
  const u = new URL("https://my.click.uz/services/pay");
  u.searchParams.set("service_id", opts.serviceId);
  u.searchParams.set("merchant_id", opts.merchantId);
  u.searchParams.set("amount", String(opts.amount));
  u.searchParams.set("transaction_param", opts.transactionParam);
  u.searchParams.set("return_url", opts.returnUrl);
  return u.toString();
}

export async function buildClickPayUrlForOrder(orderNumber: string, amount: number) {
  const cfg = await getClickConfig();
  if (!isClickConfigured(cfg)) return null;
  const appUrl = await getAppUrl();
  return buildClickPayUrl({
    merchantId: cfg.merchantId,
    serviceId: cfg.serviceId,
    amount,
    transactionParam: orderNumber,
    returnUrl: `${appUrl}/orders/success?no=${encodeURIComponent(orderNumber)}&pay=CLICK&ps=PENDING`,
  });
}

export type ClickWebhookBody = {
  click_trans_id: string;
  service_id: string;
  click_paydoc_id?: string;
  merchant_trans_id: string;
  merchant_prepare_id?: string;
  amount: string;
  action: string;
  error: string;
  error_note?: string;
  sign_time: string;
  sign_string: string;
};

/** Prepare: md5(click_trans_id + service_id + secret + merchant_trans_id + amount + action + sign_time) */
export function clickPrepareSign(parts: {
  clickTransId: string;
  serviceId: string;
  secretKey: string;
  merchantTransId: string;
  amount: string;
  action: string;
  signTime: string;
}) {
  const raw =
    `${parts.clickTransId}${parts.serviceId}${parts.secretKey}` +
    `${parts.merchantTransId}${parts.amount}${parts.action}${parts.signTime}`;
  return createHash("md5").update(raw).digest("hex");
}

/** Complete: + merchant_prepare_id */
export function clickCompleteSign(parts: {
  clickTransId: string;
  serviceId: string;
  secretKey: string;
  merchantTransId: string;
  merchantPrepareId: string;
  amount: string;
  action: string;
  signTime: string;
}) {
  const raw =
    `${parts.clickTransId}${parts.serviceId}${parts.secretKey}` +
    `${parts.merchantTransId}${parts.merchantPrepareId}` +
    `${parts.amount}${parts.action}${parts.signTime}`;
  return createHash("md5").update(raw).digest("hex");
}

function safeEqualHex(a: string, b: string) {
  try {
    const ba = Buffer.from(a.toLowerCase());
    const bb = Buffer.from(b.toLowerCase());
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export function verifyClickSign(body: ClickWebhookBody, secretKey: string, action: 0 | 1) {
  const expected =
    action === 0
      ? clickPrepareSign({
          clickTransId: body.click_trans_id,
          serviceId: body.service_id,
          secretKey,
          merchantTransId: body.merchant_trans_id,
          amount: body.amount,
          action: String(body.action),
          signTime: body.sign_time,
        })
      : clickCompleteSign({
          clickTransId: body.click_trans_id,
          serviceId: body.service_id,
          secretKey,
          merchantTransId: body.merchant_trans_id,
          merchantPrepareId: String(body.merchant_prepare_id ?? ""),
          amount: body.amount,
          action: String(body.action),
          signTime: body.sign_time,
        });
  return safeEqualHex(expected, body.sign_string || "");
}

/** merchant_prepare_id — 32-bit ijobiy int */
export function makeClickPrepareId(orderId: string, clickTransId: string) {
  const hex = createHash("md5").update(`${orderId}:${clickTransId}`).digest("hex").slice(0, 7);
  const n = parseInt(hex, 16) % 2_000_000_000;
  return n || 1;
}

export function amountsMatch(orderTotal: number, clickAmount: string | number) {
  return Math.abs(Number(clickAmount) - Number(orderTotal)) < 0.01;
}

export async function parseClickRequest(req: Request): Promise<Partial<ClickWebhookBody>> {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const json = (await req.json()) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(json).map(([k, v]) => [k, v == null ? "" : String(v)])
    ) as Partial<ClickWebhookBody>;
  }
  const form = await req.formData();
  const out: Record<string, string> = {};
  form.forEach((v, k) => {
    out[k] = String(v);
  });
  return out as Partial<ClickWebhookBody>;
}

export function normalizeClickBody(raw: Partial<ClickWebhookBody>): ClickWebhookBody | null {
  if (
    raw.click_trans_id == null ||
    raw.service_id == null ||
    raw.merchant_trans_id == null ||
    raw.amount == null ||
    raw.action == null ||
    raw.sign_time == null ||
    raw.sign_string == null
  ) {
    return null;
  }
  return {
    click_trans_id: String(raw.click_trans_id),
    service_id: String(raw.service_id),
    click_paydoc_id: raw.click_paydoc_id != null ? String(raw.click_paydoc_id) : undefined,
    merchant_trans_id: String(raw.merchant_trans_id),
    merchant_prepare_id:
      raw.merchant_prepare_id != null ? String(raw.merchant_prepare_id) : undefined,
    amount: String(raw.amount),
    action: String(raw.action),
    error: raw.error != null ? String(raw.error) : "0",
    error_note: raw.error_note != null ? String(raw.error_note) : undefined,
    sign_time: String(raw.sign_time),
    sign_string: String(raw.sign_string),
  };
}
