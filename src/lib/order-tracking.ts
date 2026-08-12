import { getUzCourierByCode, getUzCourierById } from "@/lib/uz-couriers";

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

const STATUS_RANK: Record<string, number> = {
  NEW: 0,
  PICKING: 2,
  PACKED: 3,
  WITH_COURIER: 4,
  ON_THE_WAY: 4,
  DELIVERED: 5,
  CANCELLED: -1,
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
        /to[‘']?landi|to[‘']?lov|paid|click/i.test(ev.title) ||
        /to[‘']?landi|paid|click/i.test(ev.note || "")
    ) || eventAt(order.events, (ev) => ev.status === "NEW")
  );
}

/** Mijoz uchun aniq status qadamlari (yetkazish turiga qarab). */
export function buildCustomerTimeline(order: TrackingOrderLike): TimelineStep[] {
  const isPickup = order.deliveryType === "PICKUP";
  const rank = STATUS_RANK[order.status] ?? 0;
  const isPaid = order.paymentStatus === "PAID";
  const isCancelled = order.status === "CANCELLED";
  const isCod = order.paymentMethod === "COD";

  const defs: Array<{ id: string; title: string; hint?: string; done: boolean; at?: Date | null }> =
    isPickup
      ? [
          {
            id: "received",
            title: "Buyurtma qabul qilindi",
            done: true,
            at: eventAt(order.events, (e) => e.status === "NEW") || null,
          },
          {
            id: "paid",
            title: "To‘lov tasdiqlandi",
            hint: isCod && !isPaid ? "Yetkazishda / olib ketishda (COD)" : undefined,
            done: isPaid,
            at: paidAt(order),
          },
          {
            id: "picking",
            title: "Omborda yig‘ilmoqda",
            done: rank >= 2,
            at: eventAt(order.events, (e) => e.status === "PICKING" || e.status === "PACKED"),
          },
          {
            id: "ready",
            title: "Olib ketishga tayyor",
            hint: notifyHint(order),
            done: rank >= 3,
            at: eventAt(order.events, (e) => e.status === "PACKED" || e.status === "DELIVERED"),
          },
          {
            id: "done",
            title: "Yakunlandi",
            done: rank >= 5,
            at: eventAt(order.events, (e) => e.status === "DELIVERED"),
          },
        ]
      : [
          {
            id: "received",
            title: "Buyurtma qabul qilindi",
            done: true,
            at: eventAt(order.events, (e) => e.status === "NEW") || null,
          },
          {
            id: "paid",
            title: "To‘lov tasdiqlandi",
            hint: isCod && !isPaid ? "Yetkazib berganda (COD)" : undefined,
            done: isPaid,
            at: paidAt(order),
          },
          {
            id: "picking",
            title: "Omborda yig‘ilmoqda",
            done: rank >= 2,
            at: eventAt(order.events, (e) => e.status === "PICKING" || e.status === "PACKED"),
          },
          {
            id: "transit",
            title: "Yo‘lda / Kuryerga topshirildi",
            done: rank >= 4,
            at: eventAt(
              order.events,
              (e) => e.status === "WITH_COURIER" || e.status === "ON_THE_WAY"
            ),
          },
          {
            id: "delivered",
            title: "Yetkazib berildi",
            done: rank >= 5,
            at: eventAt(order.events, (e) => e.status === "DELIVERED"),
          },
          {
            id: "done",
            title: "Yakunlandi",
            done: rank >= 5,
            at: eventAt(order.events, (e) => e.status === "DELIVERED"),
          },
        ];

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

  let currentSet = false;
  return defs.map((d) => {
    let state: TimelineStepState;
    // COD: to‘lov oxirida — ombor ishi boshlanganda paid qadamini «current» qilib qoldirmaymiz
    const codDeferPaid = d.id === "paid" && isCod && !isPaid && rank >= 2;
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

  if (order.status === "CANCELLED") return "Buyurtma bekor qilindi";
  if (order.status === "DELIVERED") {
    return order.deliveryType === "PICKUP"
      ? `Olib ketildi · ${whLabel}`
      : `Yetkazib berildi · ${order.city}`;
  }
  if (order.status === "ON_THE_WAY" || order.status === "WITH_COURIER") {
    return `Kuryerda: ${courierName}${order.courierTracking ? ` · trek ${order.courierTracking}` : ""}`;
  }
  if (order.status === "PACKED") {
    return order.deliveryType === "PICKUP"
      ? `Olib ketishga tayyor · ${whLabel}`
      : `Qadoqlandi · jo‘natish kutilyapti · ${whLabel}`;
  }
  if (order.status === "PICKING") return `Yig‘ilmoqda · ${whLabel}`;
  if (order.paymentStatus === "PAID") return `To‘lov tasdiqlandi · ${whLabel}`;
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
