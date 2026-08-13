import { prisma } from "@/lib/prisma";
import { notifyDirector, notifyOrderStatus } from "@/lib/notify";
import { syncTelegramOrderMessage } from "@/lib/telegram-orders";
import {
  PaymeError,
  getPaymeConfig,
  isPaymeConfigured,
  paymeError,
  paymeResult,
  somToTiyin,
  verifyPaymeBasicAuth,
} from "@/lib/payme";

type RpcBody = {
  id?: unknown;
  method?: string;
  params?: Record<string, unknown>;
};

function orderAccount(params: Record<string, unknown> | undefined) {
  const account = (params?.account || {}) as Record<string, unknown>;
  return String(account.order_id || account.orderNumber || "").trim();
}

async function markPaid(orderId: string, prevStatus: string, note: string) {
  const advance = prevStatus === "NEW";
  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "PAID",
        ...(advance ? { status: "PAID" } : {}),
      },
    }),
    prisma.trackingEvent.create({
      data: {
        orderId,
        status: "PAID",
        title: "Payme orqali to‘landi",
        note,
      },
    }),
  ]);
  try {
    await notifyDirector({ orderId, event: "STATUS", statusNote: "Payme: PAID" });
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

export async function handlePaymeRpc(req: Request) {
  const cfg = await getPaymeConfig();
  if (!isPaymeConfigured(cfg)) {
    return paymeError(null, PaymeError.InsufficientPrivilege, "Payme sozlanmagan");
  }

  if (!verifyPaymeBasicAuth(req.headers.get("authorization"), cfg.key)) {
    return paymeError(null, PaymeError.InsufficientPrivilege, "Ruxsat yo‘q");
  }

  let body: RpcBody;
  try {
    body = (await req.json()) as RpcBody;
  } catch {
    return paymeError(null, PaymeError.ParseError, "Parse error");
  }

  const id = body.id;
  const method = body.method || "";
  const params = body.params || {};

  switch (method) {
    case "CheckPerformTransaction": {
      const orderNumber = orderAccount(params);
      const amount = Number(params.amount);
      const order = await prisma.order.findUnique({ where: { orderNumber } });
      if (!order || order.paymentMethod !== "PAYME") {
        return paymeError(id, PaymeError.OrderNotFound, "Buyurtma topilmadi", "order");
      }
      if (order.paymentStatus === "PAID") {
        return paymeError(id, PaymeError.CantPerform, "Allaqachon to‘langan");
      }
      if (amount !== somToTiyin(order.total)) {
        return paymeError(id, PaymeError.InvalidAmount, "Noto‘g‘ri summa", "amount");
      }
      return paymeResult(id, { allow: true });
    }

    case "CreateTransaction": {
      const orderNumber = orderAccount(params);
      const amount = Number(params.amount);
      const paymeId = String(params.id || "");
      const time = Number(params.time) || Date.now();
      const order = await prisma.order.findUnique({ where: { orderNumber } });
      if (!order || order.paymentMethod !== "PAYME") {
        return paymeError(id, PaymeError.OrderNotFound, "Buyurtma topilmadi", "order");
      }
      if (amount !== somToTiyin(order.total)) {
        return paymeError(id, PaymeError.InvalidAmount, "Noto‘g‘ri summa", "amount");
      }

      if (order.paymeId && order.paymeId !== paymeId) {
        return paymeError(id, PaymeError.CantPerform, "Boshqa tranzaksiya mavjud");
      }

      if (order.paymeId === paymeId && order.paymeState != null) {
        return paymeResult(id, {
          create_time: Number(order.paymeCreateTime || time),
          transaction: String(order.id),
          state: order.paymeState,
        });
      }

      if (order.paymentStatus === "PAID") {
        return paymeError(id, PaymeError.CantPerform, "Allaqachon to‘langan");
      }

      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymeId,
          paymeState: 1,
          paymeCreateTime: BigInt(time),
          paymentStatus: "PENDING",
        },
      });

      return paymeResult(id, {
        create_time: time,
        transaction: String(order.id),
        state: 1,
      });
    }

    case "PerformTransaction": {
      const paymeId = String(params.id || "");
      const order = await prisma.order.findFirst({ where: { paymeId } });
      if (!order) {
        return paymeError(id, PaymeError.TransactionNotFound, "Tranzaksiya topilmadi");
      }
      if (order.paymeState === 2) {
        return paymeResult(id, {
          transaction: String(order.id),
          perform_time: Number(order.paymePerformTime || 0),
          state: 2,
        });
      }
      if (order.paymeState !== 1) {
        return paymeError(id, PaymeError.CantPerform, "Bajarib bo‘lmaydi");
      }
      const performTime = Date.now();
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymeState: 2,
          paymePerformTime: BigInt(performTime),
        },
      });
      await markPaid(order.id, order.status, `payme_id=${paymeId}`);
      return paymeResult(id, {
        transaction: String(order.id),
        perform_time: performTime,
        state: 2,
      });
    }

    case "CancelTransaction": {
      const paymeId = String(params.id || "");
      const reason = Number(params.reason) || 0;
      const order = await prisma.order.findFirst({ where: { paymeId } });
      if (!order) {
        return paymeError(id, PaymeError.TransactionNotFound, "Tranzaksiya topilmadi");
      }
      if (order.paymeState === -1 || order.paymeState === -2) {
        return paymeResult(id, {
          transaction: String(order.id),
          cancel_time: Number(order.paymeCancelTime || 0),
          state: order.paymeState,
        });
      }
      const cancelTime = Date.now();
      const nextState = order.paymeState === 2 ? -2 : -1;
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymeState: nextState,
          paymeCancelTime: BigInt(cancelTime),
          paymeReason: reason,
          paymentStatus: "FAILED",
        },
      });
      return paymeResult(id, {
        transaction: String(order.id),
        cancel_time: cancelTime,
        state: nextState,
      });
    }

    case "CheckTransaction": {
      const paymeId = String(params.id || "");
      const order = await prisma.order.findFirst({ where: { paymeId } });
      if (!order) {
        return paymeError(id, PaymeError.TransactionNotFound, "Tranzaksiya topilmadi");
      }
      return paymeResult(id, {
        create_time: Number(order.paymeCreateTime || 0),
        perform_time: Number(order.paymePerformTime || 0),
        cancel_time: Number(order.paymeCancelTime || 0),
        transaction: String(order.id),
        state: order.paymeState ?? 0,
        reason: order.paymeReason ?? null,
      });
    }

    case "GetStatement": {
      const from = Number(params.from) || 0;
      const to = Number(params.to) || Date.now();
      const rows = await prisma.order.findMany({
        where: {
          paymentMethod: "PAYME",
          paymeId: { not: null },
          paymeCreateTime: { gte: BigInt(from), lte: BigInt(to) },
        },
        orderBy: { createdAt: "asc" },
        take: 500,
      });
      return paymeResult(id, {
        transactions: rows.map((o) => ({
          id: o.paymeId,
          time: Number(o.paymeCreateTime || 0),
          amount: somToTiyin(o.total),
          account: { order_id: o.orderNumber },
          create_time: Number(o.paymeCreateTime || 0),
          perform_time: Number(o.paymePerformTime || 0),
          cancel_time: Number(o.paymeCancelTime || 0),
          transaction: String(o.id),
          state: o.paymeState ?? 0,
          reason: o.paymeReason ?? null,
        })),
      });
    }

    default:
      return paymeError(id, PaymeError.MethodNotFound, "Method not found", method);
  }
}
