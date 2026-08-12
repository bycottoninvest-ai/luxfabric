/**
 * Realistik taxminiy yetkazish matnlari (O‘zbekiston).
 * Manba: docs/YETKAZISH-STRATEGIYA.md — yolg‘on «butun UZ 2 soat» yo‘q.
 */

export type DeliveryEtaInput = {
  regionCode: string;
  deliveryType: "SHOP_DELIVERY" | "COURIER_CHOICE" | "PICKUP";
  /** uz-couriers id yoki code (bts, YANDEX, …) */
  courierKey?: string | null;
};

/** Uzoq zona: BTS ham odatda 2 kun (Xorazm, Surxon, Qoraqalpog‘iston). */
const FAR_REGIONS = new Set(["XOR", "SUR", "QQR"]);

function normalizeCourier(key?: string | null): string {
  return (key || "").trim().toUpperCase();
}

/**
 * Checkout / tracking uchun qisqa ETA.
 * Cutoff: ish kunlari 15:00 — matnda eslatiladi.
 */
export function estimateDeliveryLabel(input: DeliveryEtaInput): string {
  const { regionCode, deliveryType } = input;
  const region = (regionCode || "TAS").toUpperCase();
  const courier = normalizeCourier(input.courierKey);
  const far = FAR_REGIONS.has(region);
  const tashkent = region === "TAS";

  if (deliveryType === "PICKUP") {
    return tashkent
      ? "Taxminiy: bugun yoki ertaga ombordan olishingiz mumkin (tayyor bo‘lgach)"
      : "Taxminiy: Toshkent omboridan olib ketish — kelishuv bo‘yicha";
  }

  if (courier === "YANDEX" || courier === "YANDEX_DELIVERY") {
    if (tashkent) {
      return "Taxminiy: bugun, 1–4 soat (cutoff 15:00; keyin — ertangi ish kuni)";
    }
    return "Taxminiy: 1–3 ish kuni (Yandex qamrovi cheklangan bo‘lishi mumkin)";
  }

  if (courier === "UZPOST" || courier === "EMS") {
    return far
      ? "Taxminiy: 3–5 ish kuni (pochta)"
      : "Taxminiy: 2–5 ish kuni (pochta)";
  }

  // BTS / Fargo / DPD / Tezbor / shop-ships default
  if (tashkent) {
    return "Taxminiy: 1 ish kuni (cutoff 15:00 — shu kun jo‘natiladi)";
  }
  if (far) {
    return "Taxminiy: 2–3 ish kuni (Xorazm/Surxon/QQR — cutoff 15:00)";
  }
  return "Taxminiy: 1–2 ish kuni (cutoff 15:00)";
}

/** Tracking sahifasi uchun qisqaroq variant. */
export function estimateDeliveryShort(input: DeliveryEtaInput): string {
  const full = estimateDeliveryLabel(input);
  return full.replace(/^Taxminiy:\s*/i, "");
}
