import { prisma } from "@/lib/prisma";
import { notifyDirector, notifyOrderStatus } from "@/lib/notify";
import { syncTelegramOrderMessage } from "@/lib/telegram-orders";
import { setSettings } from "@/lib/settings";
import {
  PaynetError,
  PaynetState,
  amountsMatchPaynet,
  extractOrderId,
  getPaynetConfig,
  isPaynetConfigured,
  makePaynetProviderTrnId,
  paynetRpcError,
  paynetRpcResult,
  paynetTimestamp,
  serviceIdOk,
  somToTiyin,
  verifyPaynetAuth,
} from "@/lib/paynet";

type RpcBody = {
  jsonrpc?: string;
  id?: unknown;
  method?: string;
  params?: Record<string, unknown>;
};

function xmlTag(xml: string, tag: string) {
  const re = new RegExp(`<(?:[\\w-]+:)?${tag}[^>]*>([\\s\\S]*?)</(?:[\\w-]+:)?${tag}>`, "i");
  const m = xml.match(re);
  return m ? m[1].trim() : "";
}

function soapMethod(xml: string) {
  const m = xml.match(/<(?:[\w-]+:)?(GetInformation|PerformTransaction|CheckTransaction|CancelTransaction|GetStatement|ChangePassword)\b/i);
  return m ? m[1] : "";
}

function soapParams(xml: string): Record<string, unknown> {
  const parameters: Array<{ key: string; value: string }> = [];
  const pairRe =
    /<(?:[\w-]+:)?(?:genericParam|parameter|param)\b[\s\S]*?<\/(?:[\w-]+:)?(?:genericParam|parameter|param)>/gi;
  const chunks = xml.match(pairRe) || [];
  for (const chunk of chunks) {
    const key = xmlTag(chunk, "paramKey") || xmlTag(chunk, "key") || xmlTag(chunk, "name");
    const value = xmlTag(chunk, "paramValue") || xmlTag(chunk, "value");
    if (key) parameters.push({ key, value });
  }
  if (!parameters.length) {
    const orderId = xmlTag(xml, "order_id") || xmlTag(xml, "orderId");
    if (orderId) parameters.push({ key: "order_id", value: orderId });
  }
  return {
    username: xmlTag(xml, "username"),
    password: xmlTag(xml, "password"),
    serviceId: xmlTag(xml, "serviceId") || xmlTag(xml, "service_id"),
    transactionId: xmlTag(xml, "transactionId") || xmlTag(xml, "transaction_id"),
    amount: xmlTag(xml, "amount"),
    dateFrom: xmlTag(xml, "dateFrom") || xmlTag(xml, "date_from"),
    dateTo: xmlTag(xml, "dateTo") || xmlTag(xml, "date_to"),
    newPassword: xmlTag(xml, "newPassword") || xmlTag(xml, "new_password"),
    parameters,
  };
}

function soapEnvelope(inner: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>${inner}</soapenv:Body>
</soapenv:Envelope>`;
}

function soapOk(method: string, fields: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  const params = Object.entries(fields)
    .map(
      ([k, v]) =>
        `<genericParam><paramKey>${escapeXml(k)}</paramKey><paramValue>${escapeXml(String(v))}</paramValue></genericParam>`
    )
    .join("");
  const extraXml = Object.entries(extra)
    .map(([k, v]) => `<${k}>${escapeXml(String(v))}</${k}>`)
    .join("");
  return soapEnvelope(
    `<${method}Response><status>0</status><errorMsg>Success</errorMsg><timeStamp>${paynetTimestamp()}</timeStamp>${extraXml}<parameters>${params}</parameters></${method}Response>`
  );
}

function soapFail(method: string, status: number, errorMsg: string) {
  return soapEnvelope(
    `<${method}Response><status>${status}</status><errorMsg>${escapeXml(errorMsg)}</errorMsg><timeStamp>${paynetTimestamp()}</timeStamp></${method}Response>`
  );
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function markPaid(orderId: string, prevStatus: string, note: string) {
  const advance = prevStatus === "NEW";
  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "PAID",
        paymentMethod: "PAYNET",
        ...(advance ? { status: "PAID" } : {}),
      },
    }),
    prisma.trackingEvent.create({
      data: {
        orderId,
        status: "PAID",
        title: "Paynet orqali to‘landi",
        note,
      },
    }),
  ]);
  try {
    await notifyDirector({ orderId, event: "STATUS", statusNote: "Paynet: PAID" });
  } catch {
    /* soft */
  }
  if (advance) {
    try {
      await notifyOrderStatus({ orderId, status: "PAID", prevStatus });
    } catch {
      /* soft */
    }
  }
  try {
    await syncTelegramOrderMessage(orderId);
  } catch {
    /* soft */
  }
}

function findOrderNumber(raw: string) {
  const t = raw.trim().toUpperCase();
  if (/^LF-\d+$/i.test(t)) return t;
  const m = t.match(/LF-\d+/i);
  return m ? m[0].toUpperCase() : t;
}

export async function handlePaynetRequest(req: Request): Promise<{ json?: unknown; xml?: string; status?: number }> {
  const cfg = await getPaynetConfig();
  const ct = req.headers.get("content-type") || "";
  const rawText = await req.text();

  if (!isPaynetConfigured(cfg)) {
    if (ct.includes("xml")) {
      return { xml: soapFail("GetInformation", PaynetError.ServiceUnavailable, "Paynet sozlanmagan") };
    }
    return { json: paynetRpcError(null, PaynetError.ServiceUnavailable, "Paynet sozlanmagan") };
  }

  const isXml = ct.includes("xml") || /^\s*</.test(rawText);

  let rpc: RpcBody;
  if (isXml) {
    const method = soapMethod(rawText);
    rpc = { id: 1, method, params: soapParams(rawText) };
  } else {
    try {
      rpc = JSON.parse(rawText) as RpcBody;
    } catch {
      return { json: paynetRpcError(null, PaynetError.Parse, "Error parsing JSON") };
    }
  }

  const id = rpc.id ?? null;
  const method = rpc.method || "";
  const params = rpc.params || {};
  const bodyUser = params.username != null ? String(params.username) : undefined;
  const bodyPass = params.password != null ? String(params.password) : undefined;

  if (!verifyPaynetAuth(req.headers.get("authorization"), cfg, bodyUser, bodyPass)) {
    if (isXml) return { xml: soapFail(method || "GetInformation", PaynetError.InvalidLogin, "Invalid login or password") };
    return { json: paynetRpcError(id, PaynetError.InvalidLogin, "Invalid login or password") };
  }

  if (!serviceIdOk(cfg, params.serviceId ?? params.service_id)) {
    if (isXml) return { xml: soapFail(method, PaynetError.ServiceUnavailable, "Invalid serviceId") };
    return { json: paynetRpcError(id, PaynetError.ServiceUnavailable, "Invalid serviceId") };
  }

  const result = await dispatch(method, params, id);

  if (isXml) {
    if (result && typeof result === "object" && "error" in result) {
      const err = (result as { error: { code: number; message: string } }).error;
      return { xml: soapFail(method || "GetInformation", err.code, err.message) };
    }
    const payload = (result as { result?: Record<string, unknown> }).result || {};
    const fields = (payload.fields as Record<string, unknown>) || {};
    const extra: Record<string, unknown> = {};
    if (payload.providerTrnId != null) extra.providerTrnId = payload.providerTrnId;
    if (payload.transactionState != null) extra.transactionState = payload.transactionState;
    return { xml: soapOk(method || "GetInformation", fields, extra) };
  }

  return { json: result };
}

async function dispatch(method: string, params: Record<string, unknown>, id: unknown) {
  switch (method) {
    case "GetInformation": {
      const orderNumber = findOrderNumber(extractOrderId(params));
      const order = await prisma.order.findUnique({ where: { orderNumber } });
      if (!order) {
        return paynetRpcError(id, PaynetError.ClientNotFound, "Buyurtma topilmadi");
      }
      if (order.paymentStatus === "PAID") {
        return paynetRpcResult(id, {
          status: PaynetState.Successful,
          timestamp: paynetTimestamp(),
          fields: {
            order_id: order.orderNumber,
            name: order.customerName,
            amount: 0,
          },
        });
      }
      if (order.paymentStatus === "FAILED" || order.paymentStatus === "CANCELLED") {
        return paynetRpcError(id, PaynetError.TransactionCancelled, "Buyurtma bekor");
      }
      return paynetRpcResult(id, {
        status: PaynetState.Created,
        timestamp: paynetTimestamp(),
        fields: {
          order_id: order.orderNumber,
          name: order.customerName,
          amount: somToTiyin(order.total),
        },
      });
    }

    case "PerformTransaction": {
      const orderNumber = findOrderNumber(extractOrderId(params));
      const transactionId = String(params.transactionId ?? params.transaction_id ?? "").trim();
      if (!orderNumber || !transactionId) {
        return paynetRpcError(id, PaynetError.InvalidParams, "order_id yoki transactionId yo‘q");
      }
      const order = await prisma.order.findUnique({ where: { orderNumber } });
      if (!order) {
        return paynetRpcError(id, PaynetError.ClientNotFound, "Buyurtma topilmadi");
      }
      if (!amountsMatchPaynet(order.total, params.amount)) {
        return paynetRpcError(id, PaynetError.InvalidAmount, "Noto‘g‘ri summa");
      }

      if (order.paynetTransactionId && order.paynetTransactionId !== transactionId) {
        if (order.paymentStatus === "PAID") {
          return paynetRpcError(id, PaynetError.TransactionExists, "Boshqa tranzaksiya mavjud");
        }
      }

      if (order.paynetTransactionId === transactionId && order.paynetState === PaynetState.Successful) {
        return paynetRpcResult(id, {
          providerTrnId: order.paynetProviderTrnId,
          timestamp: paynetTimestamp(order.updatedAt),
          fields: { order_id: order.orderNumber },
        });
      }

      if (order.paymentStatus === "PAID") {
        return paynetRpcError(id, PaynetError.TransactionExists, "Allaqachon to‘langan");
      }

      const existing = await prisma.order.findFirst({
        where: { paynetTransactionId: transactionId, NOT: { id: order.id } },
      });
      if (existing) {
        return paynetRpcError(id, PaynetError.TransactionExists, "Transaction already exists");
      }

      const providerTrnId =
        order.paynetProviderTrnId || makePaynetProviderTrnId(order.id, transactionId);

      await prisma.order.update({
        where: { id: order.id },
        data: {
          paynetTransactionId: transactionId,
          paynetProviderTrnId: providerTrnId,
          paynetState: PaynetState.Successful,
        },
      });
      await markPaid(order.id, order.status, `paynet_txn=${transactionId}`);
      return paynetRpcResult(id, {
        providerTrnId,
        timestamp: paynetTimestamp(),
        fields: { order_id: order.orderNumber },
      });
    }

    case "CheckTransaction": {
      const transactionId = String(params.transactionId ?? params.transaction_id ?? "").trim();
      const order = await prisma.order.findFirst({ where: { paynetTransactionId: transactionId } });
      if (!order || !transactionId) {
        return paynetRpcError(id, PaynetError.TransactionNotFound, "Transaction not found");
      }
      return paynetRpcResult(id, {
        transactionState: order.paynetState ?? PaynetState.Created,
        timestamp: paynetTimestamp(order.updatedAt),
        providerTrnId: order.paynetProviderTrnId,
      });
    }

    case "CancelTransaction": {
      const transactionId = String(params.transactionId ?? params.transaction_id ?? "").trim();
      const order = await prisma.order.findFirst({ where: { paynetTransactionId: transactionId } });
      if (!order || !transactionId) {
        return paynetRpcError(id, PaynetError.TransactionNotFound, "Transaction not found");
      }
      if (order.paynetState === PaynetState.Cancelled) {
        return paynetRpcError(id, PaynetError.TransactionCancelled, "Transaction already cancelled");
      }
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paynetState: PaynetState.Cancelled,
          paymentStatus: "FAILED",
        },
      });
      return paynetRpcResult(id, {
        providerTrnId: order.paynetProviderTrnId,
        timestamp: paynetTimestamp(),
        transactionState: PaynetState.Cancelled,
      });
    }

    case "GetStatement": {
      const from = params.dateFrom ? new Date(String(params.dateFrom)) : new Date(0);
      const to = params.dateTo ? new Date(String(params.dateTo)) : new Date();
      const rows = await prisma.order.findMany({
        where: {
          paynetTransactionId: { not: null },
          paynetState: PaynetState.Successful,
          updatedAt: { gte: from, lte: to },
        },
        orderBy: { updatedAt: "asc" },
        take: 500,
      });
      return paynetRpcResult(id, {
        statements: rows.map((o) => ({
          amount: somToTiyin(o.total),
          providerTrnId: o.paynetProviderTrnId,
          transactionId: Number(o.paynetTransactionId) || o.paynetTransactionId,
          timestamp: paynetTimestamp(o.updatedAt),
        })),
      });
    }

    case "ChangePassword": {
      const next = String(params.newPassword ?? params.new_password ?? "").trim();
      if (!next) {
        return paynetRpcError(id, PaynetError.InvalidParams, "newPassword yo‘q");
      }
      await setSettings({ paynet_password: next });
      return paynetRpcResult(id, "success");
    }

    default:
      return paynetRpcError(id, PaynetError.MethodNotFound, `method ${method} is not supported`);
  }
}
