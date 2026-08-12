/**
 * Realistik taxminiy yetkazish matnlari (O‘zbekiston).
 * Manba: docs/YETKAZISH-STRATEGIYA.md — yolg‘on «butun UZ 2 soat» yo‘q.
 * Sana hisobi: delivery-promise.ts (cutoff 15:00 Toshkent).
 */
import {
  computeDeliveryPromise,
  type HandoffMode,
  type PromiseInput,
} from "@/lib/delivery-promise";
import { formatTashkentDate } from "@/lib/tashkent-time";
import { shopDefaultCourierCode } from "@/lib/carrier-matrix";

export type DeliveryEtaInput = {
  regionCode: string;
  deliveryType: "SHOP_DELIVERY" | "COURIER_CHOICE" | "PICKUP";
  /** uz-couriers id yoki code (bts, YANDEX, …) */
  courierKey?: string | null;
  handoffMode?: HandoffMode | null;
};

function toPromiseInput(input: DeliveryEtaInput): PromiseInput {
  const courierKey =
    input.courierKey ||
    (input.deliveryType === "SHOP_DELIVERY"
      ? shopDefaultCourierCode(input.regionCode)
      : null);
  return {
    regionCode: input.regionCode,
    deliveryType: input.deliveryType,
    courierKey,
    handoffMode: input.handoffMode,
  };
}

/**
 * Checkout / tracking uchun ETA + promisedBy matni.
 */
export function estimateDeliveryLabel(input: DeliveryEtaInput): string {
  const promise = computeDeliveryPromise(toPromiseInput(input));
  return `Taxminiy: ${promise.label.replace(/^Kutiladi:\s*/i, "").replace(/^Olib ketish:\s*/i, "olib ketish — ")}`;
}

/** Tracking sahifasi uchun qisqaroq variant. */
export function estimateDeliveryShort(input: DeliveryEtaInput): string {
  const full = estimateDeliveryLabel(input);
  return full.replace(/^Taxminiy:\s*/i, "");
}

export function estimatePromisedBy(input: DeliveryEtaInput): Date {
  return computeDeliveryPromise(toPromiseInput(input)).promisedBy;
}

export function formatPromisedByLabel(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return null;
  return formatTashkentDate(d);
}
