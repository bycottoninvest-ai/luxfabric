import { prisma } from "@/lib/prisma";
import { notifyDirector, notifyOrderStatus } from "@/lib/notify";
import {
  ClickError,
  amountsMatch,
  getClickConfig,
  isClickConfigured,
  makeClickPrepareId,
  normalizeClickBody,
  parseClickRequest,
  verifyClickSign,
  type ClickWebhookBody,
} from "@/lib/click";

function okPrepare(body: ClickWebhookBody, prepareId: number) {
  return {
    click_trans_id: Number(body.click_trans_id) || body.click_trans_id,
    merchant_trans_id: body.merchant_trans_id,
    merchant_prepare_id: prepareId,
    error: ClickError.Success,
    error_note: "Success",
  };
}

function okComplete(body: ClickWebhookBody, confirmId: number) {
  return {
    click_trans_id: Number(body.click_trans_id) || body.click_trans_id,
    merchant_trans_id: body.merchant_trans_id,
    merchant_confirm_id: confirmId,
    error: ClickError.Success,
    error_note: "Success",
  };
}

function fail(body: Partial<ClickWebhookBody>, error: number, error_note: string) {
  return {
    click_trans_id: body.click_trans_id
      ? Number(body.click_trans_id) || body.click_trans_id
      : null,
    merchant_trans_id: body.merchant_trans_id ?? "",
    error,
    error_note,
  };
}

export async function handleClickWebhook(req: Request, forcedAction?: 0 | 1) {
  const cfg = await getClickConfig();
  if (!isClickConfigured(cfg)) {
    return fail({}, ClickError.BadRequest, "Click sozlanmagan");
  }

  let raw: Partial<ClickWebhookBody>;
  try {
    raw = await parseClickRequest(req);
  } catch {
    return fail({}, ClickError.BadRequest, "Bad request body");
  }

  const body = normalizeClickBody(raw);
  if (!body) {
    return fail(raw, ClickError.BadRequest, "Missing required fields");
  }

  const action = forcedAction ?? (Number(body.action) as 0 | 1);
  if (action !== 0 && action !== 1) {
    return fail(body, ClickError.ActionNotFound, "Invalid action");
  }

  if (String(cfg.serviceId) !== String(body.service_id)) {
    return fail(body, ClickError.BadRequest, "Invalid service_id");
  }

  if (!verifyClickSign(body, cfg.secretKey, action)) {
    return fail(body, ClickError.SignFailed, "Invalid sign_string");
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber: body.merchant_trans_id },
  });
  if (!order || order.paymentMethod !== "CLICK") {
    return fail(body, ClickError.OrderNotFound, "Order not found");
  }

  if (!amountsMatch(order.total, body.amount)) {
    return fail(body, ClickError.InvalidAmount, "Incorrect amount");
  }

  if (action === 0) {
    if (order.paymentStatus === "PAID") {
      return fail(body, ClickError.AlreadyPaid, "Already paid");
    }
    if (order.paymentStatus === "FAILED" || order.paymentStatus === "CANCELLED") {
      return fail(body, ClickError.TransactionCanceled, "Transaction cancelled");
    }

    const prepareId =
      order.clickTransId === body.click_trans_id && order.clickPrepareId
        ? order.clickPrepareId
        : makeClickPrepareId(order.id, body.click_trans_id);

    await prisma.order.update({
      where: { id: order.id },
      data: {
        clickTransId: body.click_trans_id,
        clickPrepareId: prepareId,
        paymentStatus: "PENDING",
      },
    });

    return okPrepare(body, prepareId);
  }

  // Complete (action=1)
  const prepareId = Number(body.merchant_prepare_id);
  if (!Number.isFinite(prepareId) || order.clickPrepareId !== prepareId) {
    return fail(body, ClickError.TransactionNotFound, "Transaction not found");
  }

  if (order.paymentStatus === "PAID") {
    return okComplete(body, prepareId);
  }

  const clickError = Number(body.error);
  if (Number.isFinite(clickError) && clickError < 0) {
    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: "FAILED" },
      }),
      prisma.trackingEvent.create({
        data: {
          orderId: order.id,
          status: "NEW",
          title: "Click to‘lov bekor",
          note: `click_trans_id=${body.click_trans_id} · error=${body.error} · ${body.error_note || ""}`,
        },
      }),
    ]);
    return fail(body, ClickError.TransactionCanceled, body.error_note || "Payment failed");
  }

  const advanceToPaid = order.status === "NEW";
  try {
    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "PAID",
          clickTransId: body.click_trans_id,
          ...(advanceToPaid ? { status: "PAID" } : {}),
        },
      }),
      prisma.trackingEvent.create({
        data: {
          orderId: order.id,
          status: "PAID",
          title: "Click orqali to‘landi",
          note: `click_trans_id=${body.click_trans_id} · paydoc=${body.click_paydoc_id || "—"}`,
        },
      }),
    ]);
  } catch (e) {
    console.error("[CLICK] complete update failed", e);
    return fail(body, ClickError.FailedToUpdate, "Failed to update order");
  }

  try {
    await notifyDirector({ orderId: order.id, event: "STATUS", statusNote: "Click: PAID" });
  } catch (e) {
    console.error("[CLICK] director notify", e);
  }

  if (advanceToPaid) {
    try {
      await notifyOrderStatus({
        orderId: order.id,
        status: "PAID",
        prevStatus: order.status,
      });
    } catch (e) {
      console.error("[CLICK] customer notify", e);
    }
  }

  return okComplete(body, prepareId);
}
