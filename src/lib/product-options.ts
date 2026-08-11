export type GenderKey = "WOMEN" | "MEN" | "KIDS";

export const GENDERS: { key: GenderKey; label: string; desc: string }[] = [
  { key: "WOMEN", label: "Ayollar", desc: "Ayollar kolleksiyasi" },
  { key: "MEN", label: "Erkaklar", desc: "Erkaklar kolleksiyasi" },
  { key: "KIDS", label: "Bolalar", desc: "Bolalar kolleksiyasi" },
];

/** To‘liq o‘lchamlar — jins bo‘yicha */
export const SIZES_BY_GENDER: Record<GenderKey, string[]> = {
  WOMEN: ["XS", "S", "M", "L", "XL", "XXL", "3XL"],
  MEN: ["S", "M", "L", "XL", "XXL", "3XL", "4XL"],
  KIDS: ["98", "104", "110", "116", "122", "128", "134", "140", "146", "152"],
};

export const GENDER_LABEL: Record<string, string> = {
  WOMEN: "Ayollar",
  MEN: "Erkaklar",
  KIDS: "Bolalar",
  UNISEX: "Unisex",
};

export function sizesForGender(gender: string): string[] {
  if (gender === "MEN" || gender === "WOMEN" || gender === "KIDS") {
    return SIZES_BY_GENDER[gender];
  }
  return SIZES_BY_GENDER.WOMEN;
}

/** Tayyor mato ranglari — nom + hex (kichik rang namunasiga) */
export const PRODUCT_COLORS: { color: string; colorHex: string }[] = [
  { color: "Qora", colorHex: "#111111" },
  { color: "Oq", colorHex: "#F5F5F5" },
  { color: "Kulrang", colorHex: "#9CA3AF" },
  { color: "To‘q kulrang", colorHex: "#4B5563" },
  { color: "Bej", colorHex: "#D4C4A8" },
  { color: "Qizil", colorHex: "#DC2626" },
  { color: "Bordo", colorHex: "#7F1D1D" },
  { color: "Pushti", colorHex: "#F9A8D4" },
  { color: "Moviy", colorHex: "#2563EB" },
  { color: "Ko‘k", colorHex: "#1E3A8A" },
  { color: "Ko‘k dengiz", colorHex: "#0E7490" },
  { color: "Yashil", colorHex: "#16A34A" },
  { color: "Zaytun", colorHex: "#556B2F" },
  { color: "Xaki", colorHex: "#8B7355" },
  { color: "Sariq", colorHex: "#EAB308" },
  { color: "To‘q sariq", colorHex: "#D97706" },
  { color: "Jigarrang", colorHex: "#78350F" },
  { color: "Binafsha", colorHex: "#7C3AED" },
  { color: "Lavanda", colorHex: "#C4B5FD" },
  { color: "Mint", colorHex: "#6EE7B7" },
];
