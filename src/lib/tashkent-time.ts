/** Toshkent vaqti (UTC+5). DST yo‘q — O‘zbekiston. */

export const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
/** Ombor jo‘natish cutoff — ish kunlari 15:00 (Toshkent). */
export const SHIP_CUTOFF_HOUR = 15;

export type TashkentParts = {
  year: number;
  month: number; // 0–11
  day: number;
  hour: number;
  minute: number;
  /** 0=Yakshanba … 6=Shanba */
  weekday: number;
};

export function getTashkentParts(now = new Date()): TashkentParts {
  const t = new Date(now.getTime() + TASHKENT_OFFSET_MS);
  return {
    year: t.getUTCFullYear(),
    month: t.getUTCMonth(),
    day: t.getUTCDate(),
    hour: t.getUTCHours(),
    minute: t.getUTCMinutes(),
    weekday: t.getUTCDay(),
  };
}

/** Toshkent kalendar kuni → UTC Date (shu kunning local soati). */
export function tashkentDateAt(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0
): Date {
  return new Date(Date.UTC(year, month, day, hour, minute, 0) - TASHKENT_OFFSET_MS);
}

export function isWeekendTashkent(weekday: number): boolean {
  return weekday === 0 || weekday === 6;
}

/** Keyingi ish kuniga o‘tish (agar dam olish bo‘lsa). */
export function nextBusinessDayParts(parts: TashkentParts): TashkentParts {
  let { year, month, day, weekday } = parts;
  do {
    const d = new Date(Date.UTC(year, month, day + 1));
    year = d.getUTCFullYear();
    month = d.getUTCMonth();
    day = d.getUTCDate();
    weekday = d.getUTCDay();
  } while (isWeekendTashkent(weekday));
  return { year, month, day, hour: 0, minute: 0, weekday };
}

/** N ta ish kuni oldinga (0 = shu ish kuni, dam olish bo‘lsa keyingisi). */
export function addBusinessDays(parts: TashkentParts, days: number): TashkentParts {
  let cur = { ...parts, hour: 0, minute: 0 };
  if (isWeekendTashkent(cur.weekday)) {
    cur = nextBusinessDayParts(cur);
  }
  for (let i = 0; i < days; i++) {
    cur = nextBusinessDayParts(cur);
  }
  return cur;
}

/** Cutoff: shu ish kuni 15:00 gacha — bugun; keyin — keyingi ish kuni. */
export function resolveShipDay(now = new Date()): TashkentParts {
  const p = getTashkentParts(now);
  let day = { ...p, hour: 0, minute: 0 };
  if (isWeekendTashkent(day.weekday)) {
    return nextBusinessDayParts(day);
  }
  if (p.hour > SHIP_CUTOFF_HOUR || (p.hour === SHIP_CUTOFF_HOUR && p.minute > 0)) {
    return nextBusinessDayParts(day);
  }
  return day;
}

/** Jo‘natish deadline — ship kunida 15:00 Toshkent. */
export function shipByDeadline(now = new Date()): Date {
  const d = resolveShipDay(now);
  return tashkentDateAt(d.year, d.month, d.day, SHIP_CUTOFF_HOUR, 0);
}

/** Kun oxiri (23:59:59) Toshkent — mijoz «shu kungacha» va’dasi. */
export function endOfTashkentDay(parts: TashkentParts): Date {
  return tashkentDateAt(parts.year, parts.month, parts.day, 23, 59);
}

export function formatTashkentDate(date: Date): string {
  const p = getTashkentParts(date);
  const dd = String(p.day).padStart(2, "0");
  const mm = String(p.month + 1).padStart(2, "0");
  return `${dd}.${mm}.${p.year}`;
}

export function formatTashkentDateTime(date: Date): string {
  const p = getTashkentParts(date);
  const dd = String(p.day).padStart(2, "0");
  const mm = String(p.month + 1).padStart(2, "0");
  const hh = String(p.hour).padStart(2, "0");
  const mi = String(p.minute).padStart(2, "0");
  return `${dd}.${mm}.${p.year} ${hh}:${mi}`;
}

/** Cutoff eslatmasi (admin). */
export function cutoffReminder(now = new Date()): {
  beforeCutoff: boolean;
  label: string;
  shipDayLabel: string;
} {
  const p = getTashkentParts(now);
  const ship = resolveShipDay(now);
  const shipDayLabel = formatTashkentDate(tashkentDateAt(ship.year, ship.month, ship.day, 12));
  const weekend = isWeekendTashkent(p.weekday);
  const beforeCutoff =
    !weekend && (p.hour < SHIP_CUTOFF_HOUR || (p.hour === SHIP_CUTOFF_HOUR && p.minute === 0));

  if (weekend) {
    return {
      beforeCutoff: false,
      label: `Dam olish kuni · keyingi jo‘natish: ${shipDayLabel} (cutoff ${SHIP_CUTOFF_HOUR}:00)`,
      shipDayLabel,
    };
  }
  if (beforeCutoff) {
    return {
      beforeCutoff: true,
      label: `Cutoff ${SHIP_CUTOFF_HOUR}:00 gacha — bugun jo‘natish oynasi ochiq`,
      shipDayLabel,
    };
  }
  return {
    beforeCutoff: false,
    label: `Cutoff o‘tdi · bugungi oynada qolganlar ertaga · keyingi jo‘natish: ${shipDayLabel}`,
    shipDayLabel,
  };
}
