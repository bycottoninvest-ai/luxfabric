/**
 * Carrier matrix — Yevropa postcode/region matritsasi + Xitoy PVZ-first.
 * Region bo‘yicha tavsiya (overpromise yo‘q).
 */
import { UZ_COURIER_COMPANIES, type UzCourierCompany } from "@/lib/uz-couriers";
import { regionZone } from "@/lib/delivery-promise";
import { SHIP_CUTOFF_HOUR, getTashkentParts, isWeekendTashkent } from "@/lib/tashkent-time";

export type CarrierRec = {
  company: UzCourierCompany;
  score: number;
  recommended: boolean;
  reason: string;
  /** PVZ-first tavsiya */
  preferPvz: boolean;
};

function withinSameDayWindow(now = new Date()): boolean {
  const p = getTashkentParts(now);
  if (isWeekendTashkent(p.weekday)) return false;
  return p.hour < SHIP_CUTOFF_HOUR;
}

/**
 * Viloyat bo‘yicha kuryerlar tartibi + «Tavsiya etiladi».
 */
export function rankCarriersForRegion(regionCode: string, now = new Date()): CarrierRec[] {
  const zone = regionZone(regionCode);
  const sameDay = withinSameDayWindow(now);

  const scores: Record<string, { score: number; reason: string; preferPvz: boolean }> = {
    bts: { score: 50, reason: "Milliy ekspress · PVZ tarmog‘i", preferPvz: true },
    fargo: { score: 48, reason: "E-com last-mile · punkt/locker", preferPvz: true },
    yandex: { score: 20, reason: "Asosan Toshkent ekspress", preferPvz: false },
    tezbor: { score: 30, reason: "Qo‘shimcha last-mile", preferPvz: true },
    dpd: { score: 28, reason: "Zaxira / biznes", preferPvz: true },
    uzpost: { score: 15, reason: "Arzonroq, sekinroq", preferPvz: true },
    ems: { score: 12, reason: "Maxsus / xalqaro", preferPvz: true },
  };

  if (zone === "TASHKENT") {
    scores.yandex = {
      score: sameDay ? 100 : 85,
      reason: sameDay
        ? `Same-day (cutoff ${SHIP_CUTOFF_HOUR}:00 ichida)`
        : "Toshkent ekspress (ertangi ish kuni)",
      preferPvz: false,
    };
    scores.bts = { score: 70, reason: "1 ish kuni · ofis/PVZ", preferPvz: true };
    scores.fargo = { score: 68, reason: "PVZ/locker qulay", preferPvz: true };
  } else if (zone === "FAR") {
    scores.bts = {
      score: 100,
      reason: "2–3 ish kuni · PVZ tavsiya (Xorazm/Surxon/QQR)",
      preferPvz: true,
    };
    scores.fargo = { score: 90, reason: "PVZ/locker · viloyat", preferPvz: true };
    scores.yandex = { score: 5, reason: "Qamrov cheklangan", preferPvz: false };
    scores.uzpost = { score: 40, reason: "Arzon · sekinroq", preferPvz: true };
  } else {
    // NEAR viloyatlar
    scores.bts = { score: 100, reason: "1–2 ish kuni · PVZ-first", preferPvz: true };
    scores.fargo = { score: 95, reason: "PVZ/locker · viloyat", preferPvz: true };
    scores.yandex = { score: 25, reason: "Cheklangan qamrov", preferPvz: false };
  }

  const ranked = UZ_COURIER_COMPANIES.map((company) => {
    const meta = scores[company.id] || {
      score: 10,
      reason: company.shortDesc,
      preferPvz: true,
    };
    return {
      company,
      score: meta.score,
      recommended: false,
      reason: meta.reason,
      preferPvz: meta.preferPvz,
    };
  }).sort((a, b) => b.score - a.score || a.company.sortOrder - b.company.sortOrder);

  if (ranked[0]) ranked[0].recommended = true;
  return ranked;
}

export function recommendedCourierId(regionCode: string, now = new Date()): string {
  return rankCarriersForRegion(regionCode, now)[0]?.company.id || "bts";
}

/** Shop-ships default kuryer kodi (ombor tanlaydi). */
export function shopDefaultCourierCode(regionCode: string): string {
  const zone = regionZone(regionCode);
  if (zone === "TASHKENT" && withinSameDayWindow()) return "YANDEX";
  return "BTS";
}

export function defaultHandoffForRegion(
  regionCode: string,
  courierId?: string | null
): "HOME" | "PVZ" {
  const id = (courierId || "").toLowerCase();
  if (id === "yandex") return "HOME";
  const zone = regionZone(regionCode);
  if (zone === "TASHKENT" && id === "yandex") return "HOME";
  // Viloyat + fashion: PVZ ishonchliroq (Uzum/Cainiao pattern)
  if (zone !== "TASHKENT") return "PVZ";
  // Toshkentda ham PVZ default (uyga ixtiyoriy)
  if (id === "bts" || id === "fargo" || id === "uzpost" || id === "dpd") return "PVZ";
  return "HOME";
}
