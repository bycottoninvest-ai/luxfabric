import { createHash, timingSafeEqual } from "node:crypto";
import { getSetting } from "@/lib/settings";

/** Paynet JSON-RPC / SOAP xato kodlari (Provider Web Service) */
export const PaynetError = {
  Parse: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  Internal: -32603,
  TransactionExists: 201,
  TransactionCancelled: 202,
  TransactionNotFound: 203,
  ClientNotFound: 302,
  InvalidLogin: 412,
  InvalidAmount: 413,
  ServiceUnavailable: 100,
} as const;

export const PaynetState = {
  Created: 0,
  Successful: 1,
  Cancelled: 2,
} as const;

export type PaynetConfig = {
  username: string;
  password: string;
  serviceId: string;
  merchantId: string;
};

export async function getPaynetConfig(): Promise<PaynetConfig> {
  const username =
    (process.env.PAYNET_USERNAME || "").trim() ||
    (await getSetting("paynet_username")).trim();
  const password =
    (process.env.PAYNET_PASSWORD || "").trim() ||
    (await getSetting("paynet_password")).trim();
  const serviceId =
    (process.env.PAYNET_SERVICE_ID || "").trim() ||
    (await getSetting("paynet_service_id")).trim();
  const merchantId =
    (process.env.PAYNET_MERCHANT_ID || "").trim() ||
    (await getSetting("paynet_merchant_id")).trim();
  return { username, password, serviceId, merchantId };
}

export function isPaynetConfigured(cfg: PaynetConfig) {
  return Boolean(cfg.username && cfg.password);
}

export function somToTiyin(som: number) {
  return Math.round(Number(som) * 100);
}

export function amountsMatchPaynet(orderTotalSom: number, rawAmount: unknown) {
  const n = Number(rawAmount);
  if (!Number.isFinite(n)) return false;
  const tiyin = somToTiyin(orderTotalSom);
  return Math.abs(n - tiyin) < 1 || Math.abs(n - orderTotalSom) < 0.01;
}

export function paynetTimestamp(d = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(d)
    .replace("T", " ");
}

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function verifyPaynetUserPass(username: string, password: string, cfg: PaynetConfig) {
  if (!cfg.username || !cfg.password) return false;
  return safeEqual(username, cfg.username) && safeEqual(password, cfg.password);
}

/** HTTP Basic Auth yoki RPC body dagi username/password */
export function verifyPaynetAuth(
  header: string | null,
  cfg: PaynetConfig,
  bodyUser?: string,
  bodyPass?: string
) {
  if (bodyUser != null && bodyPass != null && (bodyUser || bodyPass)) {
    return verifyPaynetUserPass(bodyUser, bodyPass, cfg);
  }
  if (!header || !/^Basic\s+/i.test(header)) return false;
  try {
    const decoded = Buffer.from(header.replace(/^Basic\s+/i, ""), "base64").toString("utf8");
    const idx = decoded.indexOf(":");
    if (idx < 0) return false;
    return verifyPaynetUserPass(decoded.slice(0, idx), decoded.slice(idx + 1), cfg);
  } catch {
    return false;
  }
}

export function serviceIdOk(cfg: PaynetConfig, incoming: unknown) {
  if (!cfg.serviceId) return true;
  if (incoming == null || incoming === "") return true;
  return String(cfg.serviceId) === String(incoming);
}

export function extractOrderId(params: Record<string, unknown> | undefined): string {
  if (!params) return "";
  const fields = (params.fields || params.parameters || {}) as unknown;
  if (fields && typeof fields === "object" && !Array.isArray(fields)) {
    const o = fields as Record<string, unknown>;
    const v = o.order_id ?? o.orderId ?? o.orderNumber ?? o.account ?? o.customer_id;
    if (v != null && String(v).trim()) return String(v).trim().toUpperCase();
  }
  if (Array.isArray(fields)) {
    for (const row of fields) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const key = String(r.key ?? r.paramKey ?? r.name ?? "").toLowerCase();
      const val = String(r.value ?? r.paramValue ?? r.val ?? "").trim();
      if (
        val &&
        (key === "order_id" ||
          key === "orderid" ||
          key === "ordernumber" ||
          key === "account" ||
          key === "customer_id")
      ) {
        return val.toUpperCase();
      }
    }
  }
  const direct = params.order_id ?? params.orderId ?? params.orderNumber ?? params.account;
  return direct != null ? String(direct).trim().toUpperCase() : "";
}

export function makePaynetProviderTrnId(orderId: string, transactionId: string) {
  const hex = createHash("md5").update(`${orderId}:${transactionId}`).digest("hex").slice(0, 7);
  const n = parseInt(hex, 16) % 2_000_000_000;
  return n || 1;
}

/** Paynet ilova/terminal deep-link (merchant_id bo‘lsa) */
export function buildPaynetPayUrl(opts: {
  merchantId: string;
  orderNumber: string;
  amountSom: number;
}) {
  const u = new URL("https://app.paynet.uz/");
  u.searchParams.set("m", opts.merchantId);
  u.searchParams.set("c", opts.orderNumber);
  u.searchParams.set("a", String(somToTiyin(opts.amountSom)));
  return u.toString();
}

export async function buildPaynetPayUrlForOrder(orderNumber: string, amountSom: number) {
  const cfg = await getPaynetConfig();
  if (!isPaynetConfigured(cfg) || !cfg.merchantId) return null;
  return buildPaynetPayUrl({
    merchantId: cfg.merchantId,
    orderNumber,
    amountSom,
  });
}

export function paynetRpcError(id: unknown, code: number, message: string) {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    error: { code, message },
  };
}

export function paynetRpcResult(id: unknown, result: unknown) {
  return { jsonrpc: "2.0", id: id ?? null, result };
}
