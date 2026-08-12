/**
 * Delivery promise engine — Cainiao/Zalando uslubida:
 * region + method + courier + cutoff → aniq promisedBy (overpromise yo‘q).
 */
import {
  SHIP_CUTOFF_HOUR,
  addBusinessDays,
  endOfTashkentDay,
  formatTashkentDate,
  resolveShipDay,
  shipByDeadline,
  tashkentDateAt,
} from "@/lib/tashkent-time";

export type HandoffMode = "HOME" | "PVZ" | "WAREHOUSE";

export type PromiseInput = {
  regionCode: string;
  deliveryType: "SHOP_DELIVERY" | "COURIER_CHOICE" | "PICKUP";
  courierKey?: string | null;
  handoffMode?: HandoffMode | null;
  now?: Date;
};

export type DeliveryPromise = {
  /** Mijozga «shu kungacha kutiladi» */
  promisedBy: Date;
  /** Ombor jo‘natish deadline (cutoff) */
  shipBy: Date;
  /** Snapshot matn (checkout/track) */
  label: string;
  /** Qisqa band: same-day | 1d | 1-2d | 2-3d | 2-5d | pickup */
  slaBand: string;
  /** Transit ish kunlari (jo‘natishdan keyin, max) */
  transitBusinessDays: number;
  regionZone: "TASHKENT" | "NEAR" | "FAR";
};

const FAR_REGIONS = new Set(["XOR", "SUR", "QQR"]);

function normalizeCourier(key?: string | null): string {
  return (key || "").trim().toUpperCase();
}

export function regionZone(regionCode: string): DeliveryPromise["regionZone"] {
  const r = (regionCode || "TAS").toUpperCase();
  if (r === "TAS") return "TASHKENT";
  if (FAR_REGIONS.has(r)) return "FAR";
  return "NEAR";
}

/**
 * Jo‘natishdan keyin max transit ish kunlari (kuryer SLA).
 * promisedBy = shipDay + transit (kun oxiri).
 */
export function transitDaysFor(input: PromiseInput): { days: number; slaBand: string } {
  const zone = regionZone(input.regionCode);
  const courier = normalizeCourier(input.courierKey);
  const handoff = input.handoffMode || (input.deliveryType === "PICKUP" ? "WAREHOUSE" : "HOME");

  if (input.deliveryType === "PICKUP" || handoff === "WAREHOUSE") {
    return { days: 0, slaBand: "pickup" };
  }

  if (courier === "YANDEX" || courier === "YANDEX_DELIVERY") {
    if (zone === "TASHKENT") return { days: 0, slaBand: "same-day" };
    return { days: 2, slaBand: "1-3d" };
  }

  if (courier === "UZPOST" || courier === "EMS" || courier === "POCHTA") {
    if (zone === "FAR") return { days: 5, slaBand: "3-5d" };
    return { days: 5, slaBand: "2-5d" };
  }

  // BTS / Fargo / DPD / Tezbor / shop default
  if (zone === "TASHKENT") {
    return { days: handoff === "PVZ" ? 1 : 1, slaBand: "1d" };
  }
  if (zone === "FAR") {
    return { days: 3, slaBand: "2-3d" };
  }
  return { days: 2, slaBand: "1-2d" };
}

export function computeDeliveryPromise(input: PromiseInput): DeliveryPromise {
  const now = input.now || new Date();
  const shipDay = resolveShipDay(now);
  const shipBy = shipByDeadline(now);
  const { days, slaBand } = transitDaysFor(input);
  const promiseDay = addBusinessDays(shipDay, days);
  const promisedBy = endOfTashkentDay(promiseDay);
  const zone = regionZone(input.regionCode);
  const courier = normalizeCourier(input.courierKey);

  const shipLabel = formatTashkentDate(tashkentDateAt(shipDay.year, shipDay.month, shipDay.day, 12));
  const byLabel = formatTashkentDate(promisedBy);

  let label: string;
  if (input.deliveryType === "PICKUP") {
    label =
      zone === "TASHKENT"
        ? `Olib ketish: ${shipLabel} gacha tayyor bo‘lishi mumkin (cutoff ${SHIP_CUTOFF_HOUR}:00)`
        : `Olib ketish: Toshkent omboridan · kelishuv bo‘yicha (taxminan ${byLabel})`;
  } else if (slaBand === "same-day" && (courier === "YANDEX" || courier === "YANDEX_DELIVERY")) {
    label = `Kutiladi: bugun / ${byLabel} · 1–4 soat (Yandex, cutoff ${SHIP_CUTOFF_HOUR}:00)`;
  } else if (slaBand === "1d") {
    label = `Kutiladi: ${byLabel} gacha (1 ish kuni · jo‘natish ${shipLabel})`;
  } else if (slaBand === "1-2d") {
    label = `Kutiladi: ${byLabel} gacha (1–2 ish kuni · jo‘natish ${shipLabel})`;
  } else if (slaBand === "2-3d") {
    label = `Kutiladi: ${byLabel} gacha (2–3 ish kuni · Xorazm/Surxon/QQR)`;
  } else if (slaBand === "2-5d" || slaBand === "3-5d") {
    label = `Kutiladi: ${byLabel} gacha (pochta · sekinroq)`;
  } else {
    label = `Kutiladi: ${byLabel} gacha`;
  }

  return {
    promisedBy,
    shipBy,
    label,
    slaBand,
    transitBusinessDays: days,
    regionZone: zone,
  };
}

/** Checkout ETA — promise label bilan mos. */
export function promiseCheckoutHint(input: PromiseInput): string {
  return computeDeliveryPromise(input).label;
}
