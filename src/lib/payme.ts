/**
 * Payme Business — Merchant API (JSON-RPC 2.0) + checkout URL.
 * Amount: tiyin (1 so‘m = 100 tiyin).
 */

import { getSetting, getAppUrl } from "@/lib/settings";

export type PaymeConfig = {
  merchantId: string;
  /** Basic Auth: Paycom:<key> */
  key: string;
};

export async function getPaymeConfig(): Promise<PaymeConfig> {
  const merchantId =
    (process.env.PAYME_MERCHANT_ID || "").trim() ||
    (await getSetting("payme_merchant_id")).trim();
  const key =
    (process.env.PAYME_KEY || process.env.PAYME_SECRET_KEY || "").trim() ||
    (await getSetting("payme_key")).trim();
  return { merchantId, key };
}

export function isPaymeConfigured(cfg: PaymeConfig) {
  return Boolean(cfg.merchantId && cfg.key);
}

/** Checkout: https://checkout.paycom.uz/<base64> */
export function buildPaymeCheckoutUrl(opts: {
  merchantId: string;
  orderNumber: string;
  amountSom: number;
  returnUrl?: string;
}) {
  const payload: Record<string, unknown> = {
    m: opts.merchantId,
    ac: { order_id: opts.orderNumber },
    a: Math.round(opts.amountSom * 100),
  };
  if (opts.returnUrl) payload.c = opts.returnUrl;
  const b64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
  return `https://checkout.paycom.uz/${b64}`;
}

export async function buildPaymeCheckoutUrlForOrder(orderNumber: string, amountSom: number) {
  const cfg = await getPaymeConfig();
  if (!isPaymeConfigured(cfg)) return null;
  const appUrl = await getAppUrl();
  return buildPaymeCheckoutUrl({
    merchantId: cfg.merchantId,
    orderNumber,
    amountSom,
    returnUrl: `${appUrl}/orders/success?no=${encodeURIComponent(orderNumber)}&pay=PAYME&ps=PENDING`,
  });
}

export function somToTiyin(som: number) {
  return Math.round(Number(som) * 100);
}

export function tiyinToSom(tiyin: number) {
  return Math.round(Number(tiyin) / 100);
}

/** Authorization: Basic base64(Paycom:KEY) */
export function verifyPaymeBasicAuth(header: string | null, key: string) {
  if (!header || !key) return false;
  const m = header.match(/^Basic\s+(.+)$/i);
  if (!m) return false;
  try {
    const decoded = Buffer.from(m[1], "base64").toString("utf8");
    const [user, pass] = decoded.split(":");
    return user === "Paycom" && pass === key;
  } catch {
    return false;
  }
}

export const PaymeError = {
  InvalidAmount: -31001,
  OrderNotFound: -31050,
  CantPerform: -31008,
  CantCancel: -31007,
  TransactionNotFound: -31003,
  AlreadyDone: -31051,
  InsufficientPrivilege: -32504,
  MethodNotFound: -32601,
  ParseError: -32700,
} as const;

export function paymeError(
  id: unknown,
  code: number,
  message: string,
  data?: string
) {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    error: {
      code,
      message: { uz: message, ru: message, en: message },
      ...(data ? { data } : {}),
    },
  };
}

export function paymeResult(id: unknown, result: Record<string, unknown>) {
  return { jsonrpc: "2.0", id: id ?? null, result };
}
