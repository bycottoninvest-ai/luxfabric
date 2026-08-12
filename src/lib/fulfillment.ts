/**
 * Fulfillment pipeline — aniq bosqichlar, event + vaqt.
 * NEW → PAID → PICKING → PACKED → SHIPPED|READY_PICKUP → DELIVERED → DONE
 */

export const FULFILLMENT_STATUSES = [
  "NEW",
  "PAID",
  "PICKING",
  "PACKED",
  "SHIPPED",
  "READY_PICKUP",
  "DELIVERED",
  "DONE",
  "CANCELLED",
] as const;

export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

/** Eski statuslar → yangi (o‘qishda). */
export function normalizeStatus(status: string): string {
  if (status === "WITH_COURIER" || status === "ON_THE_WAY") return "SHIPPED";
  return status;
}

export const STATUS_RANK: Record<string, number> = {
  NEW: 0,
  PAID: 1,
  PICKING: 2,
  PACKED: 3,
  READY_PICKUP: 4,
  SHIPPED: 4,
  WITH_COURIER: 4,
  ON_THE_WAY: 4,
  DELIVERED: 5,
  DONE: 6,
  CANCELLED: -1,
};

export type TransitionContext = {
  deliveryType: string;
  paymentStatus: string;
  paymentMethod: string;
  courierTracking?: string | null;
};

export type FlowStep = {
  status: string;
  title: string;
  /** Mijoz timeline sarlavhasi */
  customerTitle: string;
};

export function flowForDelivery(deliveryType: string): FlowStep[] {
  const pickup = deliveryType === "PICKUP";
  return [
    { status: "NEW", title: "Yangi", customerTitle: "Buyurtma qabul qilindi" },
    { status: "PAID", title: "To‘langan", customerTitle: "To‘lov tasdiqlandi" },
    { status: "PICKING", title: "Yig‘ish", customerTitle: "Omborda yig‘ilmoqda" },
    { status: "PACKED", title: "Qadoq", customerTitle: "Qadoqlandi" },
    pickup
      ? {
          status: "READY_PICKUP",
          title: "Olib ketishga tayyor",
          customerTitle: "Olib ketishga tayyor",
        }
      : { status: "SHIPPED", title: "Jo‘natildi", customerTitle: "Kuryerga topshirildi" },
    {
      status: "DELIVERED",
      title: pickup ? "Olib ketildi" : "Yetkazildi",
      customerTitle: pickup ? "Olib ketildi" : "Yetkazib berildi",
    },
    { status: "DONE", title: "Yakunlandi", customerTitle: "Yakunlandi" },
  ];
}

/** Trek majburiy: kuryer usuli + SHIPPED. */
export function requiresTrackingForTransition(
  toStatus: string,
  deliveryType: string
): boolean {
  if (deliveryType === "PICKUP") return false;
  return toStatus === "SHIPPED" || toStatus === "WITH_COURIER" || toStatus === "ON_THE_WAY";
}

export function validateTransition(
  fromStatus: string,
  toStatus: string,
  ctx: TransitionContext
): { ok: true } | { ok: false; error: string } {
  if (toStatus === "CANCELLED") {
    if (fromStatus === "DONE") return { ok: false, error: "Yakunlangan buyurtmani bekor qilib bo‘lmaydi" };
    return { ok: true };
  }

  const from = normalizeStatus(fromStatus);
  const to = normalizeStatus(toStatus);
  const flow = flowForDelivery(ctx.deliveryType).map((s) => s.status);

  if (!flow.includes(to) && to !== "CANCELLED") {
    return { ok: false, error: `Noma’lum status: ${toStatus}` };
  }

  // COD: PAID ni o‘tkazib yuborish mumkin (to‘lov yetkazishda)
  const fromRank = STATUS_RANK[from] ?? 0;
  const toRank = STATUS_RANK[to] ?? 0;

  if (to === from) return { ok: false, error: "Allaqachon shu statusda" };

  // Oldinga yoki bir qadam orqaga (tuzatish) — lekin DONE dan orqaga yo‘q
  if (from === "DONE" && to !== "DONE") {
    return { ok: false, error: "Yakunlangan buyurtma o‘zgarmaydi" };
  }

  if (toRank < fromRank && !(from === "PACKED" && (to === "PICKING" || to === "PAID"))) {
    // Ruxsat: faqat cheklangan rollback
    if (!(fromRank - toRank === 1 && toRank >= 1 && toRank <= 3)) {
      return { ok: false, error: `Noto‘g‘ri o‘tish: ${from} → ${to}` };
    }
  }

  if (to === "SHIPPED" && ctx.deliveryType === "PICKUP") {
    return { ok: false, error: "Pickup uchun READY_PICKUP ishlating" };
  }
  if (to === "READY_PICKUP" && ctx.deliveryType !== "PICKUP") {
    return { ok: false, error: "READY_PICKUP faqat o‘zi olib ketish uchun" };
  }

  if (requiresTrackingForTransition(to, ctx.deliveryType)) {
    const track = (ctx.courierTracking || "").trim();
    if (!track) {
      return { ok: false, error: "SHIPPED uchun trek-kod majburiy" };
    }
  }

  return { ok: true };
}

/** Admin tugmalari — keyingi mantiqiy qadamlar. */
export function nextAdminActions(
  current: string,
  deliveryType: string,
  paymentStatus: string
): FlowStep[] {
  const flow = flowForDelivery(deliveryType);
  const cur = normalizeStatus(current);
  const idx = flow.findIndex((s) => s.status === cur);
  const actions: FlowStep[] = [];

  if (cur === "CANCELLED" || cur === "DONE") return actions;

  // Keyingi 1–2 qadam
  if (idx >= 0 && idx < flow.length - 1) {
    let next = flow[idx + 1];
    // COD + NEW: PAID ni o‘tkazib PICKING ga
    if (
      cur === "NEW" &&
      paymentStatus !== "PAID" &&
      next.status === "PAID"
    ) {
      actions.push(next); // ixtiyoriy PAID
      const picking = flow.find((s) => s.status === "PICKING");
      if (picking) actions.push(picking);
      return actions;
    }
    actions.push(next);
    // PAID dan keyin PICKING ni ham ko‘rsat
    if (next.status === "PAID" && paymentStatus === "PAID") {
      const picking = flow.find((s) => s.status === "PICKING");
      if (picking) actions.push(picking);
    }
  } else if (idx < 0) {
    // Noma’lum eski status
    const picking = flow.find((s) => s.status === "PICKING");
    if (picking) actions.push(picking);
  }

  return actions;
}

export function eventTitleForStatus(status: string, deliveryType: string): string {
  const step = flowForDelivery(deliveryType).find((s) => s.status === normalizeStatus(status));
  return step?.title || status;
}

export function isOpenForShipping(status: string): boolean {
  const s = normalizeStatus(status);
  return !["SHIPPED", "READY_PICKUP", "DELIVERED", "DONE", "CANCELLED"].includes(s);
}

/** Keyingi mijoz qadami (track). */
export function nextCustomerStep(
  status: string,
  deliveryType: string,
  paymentStatus: string
): { title: string; hint: string } | null {
  const s = normalizeStatus(status);
  if (s === "CANCELLED") return null;
  if (s === "DONE" || s === "DELIVERED") return { title: "Yakunlandi", hint: "Rahmat!" };

  const pickup = deliveryType === "PICKUP";
  const map: Record<string, { title: string; hint: string }> = {
    NEW:
      paymentStatus === "PAID"
        ? { title: "Ombor yig‘ishni boshlaydi", hint: "To‘lov tasdiqlangan" }
        : {
            title: paymentStatus === "PENDING" ? "To‘lov yoki tasdiq" : "Ombor kutilyapti",
            hint: "Buyurtma qabul qilindi",
          },
    PAID: { title: "Omborda yig‘iladi", hint: "Navbatda" },
    PICKING: { title: "Qadoqlash", hint: "Mahsulotlar yig‘ilmoqda" },
    PACKED: pickup
      ? { title: "Olib ketishga tayyorlash", hint: "Tez orada xabar" }
      : { title: "Kuryerga topshirish", hint: "Trek-kod paydo bo‘ladi" },
    READY_PICKUP: { title: "Ombordan olib keting", hint: "Manzil trackingda" },
    SHIPPED: { title: "Yetkazib berish", hint: "Kuryer saytida kuzating" },
  };
  return map[s] || { title: "Jarayon davom etmoqda", hint: "" };
}
