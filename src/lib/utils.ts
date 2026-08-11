import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSom(amount: number) {
  return `${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} so'm`;
}

export function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length === 12) return `+${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10)}`;
  return phone;
}

/** Faqat O‘zbekiston: +998 XX XXX XX XX (jami 12 raqam) */
export function maskUzPhone(raw: string) {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("998")) digits = digits.slice(3);
  else if (digits.startsWith("8") && digits.length > 9) digits = digits.slice(1);
  digits = digits.slice(0, 9);
  return `+998${digits}`;
}

export function isValidUzPhone(phone: string) {
  return /^\+998\d{9}$/.test(phone);
}

export const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  NEW: { label: "Yangi", color: "bg-sky-500" },
  PICKING: { label: "Yig‘ilmoqda", color: "bg-amber-500" },
  PACKED: { label: "Qadoqlangan", color: "bg-violet-500" },
  WITH_COURIER: { label: "Kuryerga berildi", color: "bg-indigo-500" },
  ON_THE_WAY: { label: "Yo‘lda", color: "bg-orange-500" },
  DELIVERED: { label: "Yetkazildi", color: "bg-emerald-500" },
  CANCELLED: { label: "Bekor qilindi", color: "bg-rose-500" },
};

export const ORDER_FLOW = [
  { status: "NEW", title: "Buyurtma qabul qilindi" },
  { status: "PICKING", title: "Omborda yig‘ilmoqda" },
  { status: "PACKED", title: "Qadoqlandi" },
  { status: "WITH_COURIER", title: "Kuryerga topshirildi" },
  { status: "ON_THE_WAY", title: "Yo‘lda" },
  { status: "DELIVERED", title: "Yetkazildi" },
] as const;

export function generateOrderNumber() {
  const n = Math.floor(100000 + Math.random() * 899999);
  return `LF-${n}`;
}
