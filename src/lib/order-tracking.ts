import { getUzCourierByCode, getUzCourierById } from "@/lib/uz-couriers";
import {
  STATUS_RANK,
  flowForDelivery,
  nextCustomerStep,
  normalizeStatus,
} from "@/lib/fulfillment";
import { formatPromisedByLabel } from "@/lib/delivery-eta";

export type TimelineStepState = "done" | "current" | "upcoming";

export type TimelineStep = {
  id: string;
  title: string;
  hint?: string;
  state: TimelineStepState;
  at?: Date | null;
};

export type TrackingOrderLike = {
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  deliveryType: string;
  notifyChannel: string;
  telegramUsername?: string | null;
  city: string;
  address: string;
  promisedBy?: Date | string | null;
  promiseLabel?: string | null;
  handoffMode?: string | null;
  courierCompanyId?: string | null;
  courierCode?: string | null;
  courierLabel?: string | null;
  courierTracking?: string | null;
  courierBranchLabel?: string | null;
  warehouse?: {
    name: string;
    city: string;
    address: string;
    phone?: string | null;
  } | null;
  courier?: {
    code: string;
    name: string;
    nameUz: string;
    website?: string | null;
  } | null;
  events?: Array<{
    status: string;
    title: string;
    note?: string | null;
    createdAt: Date | string;
  }>;
};

function eventAt(
  events: TrackingOrderLike["events"],
  match: (ev: NonNullable<TrackingOrderLike["events"]>[number]) => boolean
): Date | null {
  if (!events?.length) return null;
  const hit = [...events].reverse().find(match);
  return hit ? new Date(hit.createdAt) : null;
}

function paidAt(order: TrackingOrderLike): Date | null {
  if (order.paymentStatus !== "PAID") return null;
  return (
    eventAt(
      order.events,
      (ev) =>
        ev.status === "PAID" ||
        /to[‘']?landi|to[‘']?lov|paid|click/i.test(ev.title) ||
        /to[‘']?landi|paid|click/i.test(ev.note || "")
    ) || eventAt(order.events, (ev) => ev.status === "NEW")
  );
}

function statusAt(order: TrackingOrderLike, statuses: string[]): Date | null {
  return eventAt(order.events, (e) => statuses.includes(e.status));
}

/** Mijoz uchun aniq status qadamlari (event + fulfillment). */
export function buildCustomerTimeline(order: TrackingOrderLike): TimelineStep[] {
  const cur = normalizeStatus(order.status);
  const rank = STATUS_RANK[cur] ?? 0;
  const isPaid = order.paymentStatus === "PAID" || cur === "PAID" || rank >= STATUS_RANK.PAID;
  const isCancelled = order.status === "CANCELLED";
  const isCod = order.paymentMethod === "COD";
  const flow = flowForDelivery(order.deliveryType);

  if (isCancelled) {
    return [
      {
        id: "received",
        title: "Buyurtma qabul qilindi",
        state: "done",
        at: eventAt(order.events, (e) => e.status === "NEW"),
      },
      {
        id: "cancelled",
        title: "Bekor qilindi",
        state: "current",
        at: eventAt(order.events, (e) => e.status === "CANCELLED"),
      },
    ];
  }

  const defs = flow.map((step) => {
    const r = STATUS_RANK[step.status] ?? 0;
    let done = false;
    if (step.status === "NEW") done = true;
    else if (step.status === "PAID") done = isPaid && rank > STATUS_RANK.PAID;
    else if (cur === "DONE") done = r <= STATUS_RANK.DONE;
    else done = rank > r;

    let at: Date | null = null;
    if (step.status === "NEW") at = statusAt(order, ["NEW"]);
    else if (step.status === "PAID") at = paidAt(order);
    else if (step.status === "PICKING") at = statusAt(order, ["PICKING"]);
    else if (step.status === "PACKED") at = statusAt(order, ["PACKED"]);
    else if (step.status === "SHIPPED")
      at = statusAt(order, ["SHIPPED", "WITH_COURIER", "ON_THE_WAY"]);
    else if (step.status === "READY_PICKUP") at = statusAt(order, ["READY_PICKUP"]);
    else if (step.status === "DELIVERED") at = statusAt(order, ["DELIVERED", "DONE"]);
    else if (step.status === "DONE") at = statusAt(order, ["DONE"]);

    const hint =
      step.status === "PAID" && isCod && order.paymentStatus !== "PAID" && rank < STATUS_RANK.DELIVERED
        ? "Yetkazib berganda / olib ketishda (COD)"
        : step.status === "READY_PICKUP"
          ? notifyHint(order)
          : step.status === "SHIPPED" && !order.courierTracking
            ? "Trek-kod kiritilgach kuzatishingiz mumkin"
            : undefined;

    return {
      id: step.status.toLowerCase(),
      title: step.customerTitle,
      hint,
      done,
      at,
      status: step.status,
      rank: r,
    };
  });

  let currentSet = false;
  return defs.map((d) => {
    const codDeferPaid =
      d.status === "PAID" && isCod && order.paymentStatus !== "PAID" && rank >= STATUS_RANK.PICKING;

    let state: TimelineStepState;
    if (d.done) {
      state = "done";
    } else if (codDeferPaid) {
      state = "upcoming";
    } else if (!currentSet) {
      state = "current";
      currentSet = true;
    } else {
      state = "upcoming";
    }
    return { id: d.id, title: d.title, hint: d.hint, state, at: d.at };
  });
}

function notifyHint(order: TrackingOrderLike): string | undefined {
  if (order.notifyChannel === "NONE") return "Tayyor bo‘lganda do‘kondan xabar olasiz";
  if (order.notifyChannel === "TELEGRAM") {
    return order.telegramUsername
      ? `Tayyor bo‘lganda Telegram (@${order.telegramUsername.replace(/^@/, "")})`
      : "Tayyor bo‘lganda Telegram orqali xabar";
  }
  if (order.notifyChannel === "BOTH") {
    return "Tayyor bo‘lganda SMS va Telegram xabar";
  }
  return "Tayyor bo‘lganda SMS xabar";
}

/** «Hozirgi joy» — yolg‘on GPS emas, status asosida. */
export function currentLocationLabel(order: TrackingOrderLike): string {
  const wh = order.warehouse;
  const whLabel = wh ? `${wh.name} · ${wh.city}` : "Toshkent ombori";
  const courierName =
    order.courier?.nameUz ||
    order.courierLabel ||
    resolveCourierMeta(order)?.name ||
    "kuryer";
  const s = normalizeStatus(order.status);

  if (order.status === "CANCELLED") return "Buyurtma bekor qilindi";
  if (s === "DONE" || s === "DELIVERED") {
    return order.deliveryType === "PICKUP"
      ? `Olib ketildi · ${whLabel}`
      : `Yetkazib berildi · ${order.city}`;
  }
  if (s === "SHIPPED") {
    const mode =
      order.handoffMode === "PVZ" && order.courierBranchLabel
        ? ` · punkt: ${order.courierBranchLabel}`
        : "";
    return `Kuryerda: ${courierName}${order.courierTracking ? ` · trek ${order.courierTracking}` : ""}${mode}`;
  }
  if (s === "READY_PICKUP") {
    return `Olib ketishga tayyor · ${whLabel}`;
  }
  if (s === "PACKED") {
    return order.deliveryType === "PICKUP"
      ? `Qadoqlandi · tayyorlash · ${whLabel}`
      : `Qadoqlandi · jo‘natish kutilyapti · ${whLabel}`;
  }
  if (s === "PICKING") return `Yig‘ilmoqda · ${whLabel}`;
  if (s === "PAID" || order.paymentStatus === "PAID") return `To‘lov tasdiqlandi · ${whLabel}`;
  return `Qabul qilindi · ${whLabel}`;
}

export function resolveCourierMeta(order: TrackingOrderLike) {
  const key =
    order.courier?.code ||
    order.courierCode ||
    order.courierCompanyId ||
    "";
  if (!key) return null;
  const company = getUzCourierByCode(key) || getUzCourierById(key);
  if (!company && !order.courier) return null;
  return {
    code: company?.code || order.courier?.code || key,
    name: company?.name || order.courier?.nameUz || order.courierLabel || key,
    website: company?.website || order.courier?.website || null,
    phone: company?.phone || null,
  };
}

/**
 * Rasmiy kuzatuv sahifasi (best-effort).
 * Live GPS API yo‘q — trekod bilan kuryer saytiga yo‘naltiramiz.
 */
export function buildCourierTrackingUrl(
  courierCode: string | null | undefined,
  trackingCode?: string | null
): string | null {
  if (!courierCode) return null;
  const company = getUzCourierByCode(courierCode) || getUzCourierById(courierCode);
  const site = company?.website;
  const track = (trackingCode || "").trim();
  const code = (company?.code || courierCode).toUpperCase();

  if (track) {
    if (code === "BTS") {
      return `https://bts.uz/uz/tracking?number=${encodeURIComponent(track)}`;
    }
    if (code === "FARGO") {
      return `https://fargo.uz/?tracking=${encodeURIComponent(track)}`;
    }
    if (code === "UZPOST" || code === "POCHTA") {
      return `https://uz.post/track?id=${encodeURIComponent(track)}`;
    }
    if (code === "DPD") {
      return `https://dpd.uz/tracking?code=${encodeURIComponent(track)}`;
    }
  }

  return site ?? null;
}

export function deliveryTypeLabel(deliveryType: string): string {
  if (deliveryType === "PICKUP") return "O‘zi olib ketish";
  if (deliveryType === "COURIER_CHOICE") return "Tanlangan kuryer";
  return "Do‘kon yetkazishi";
}

export function handoffLabel(mode?: string | null): string | null {
  if (mode === "PVZ") return "Punktdan olish";
  if (mode === "HOME") return "Uyga yetkazish";
  if (mode === "WAREHOUSE") return "Ombordan olish";
  return null;
}

export { nextCustomerStep, formatPromisedByLabel };
