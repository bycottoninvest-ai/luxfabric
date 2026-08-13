"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ClearStockButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClear() {
    const ok = window.confirm(
      "Barcha ombor qoldiqlari 0 bo‘ladi. Davom?\n\nMahsulotlar va buyurtmalar o‘chirilmaydi — faqat sonlar nolga tushadi."
    );
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch("/api/admin/warehouse/clear-stock", {
        method: "POST",
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        updatedRows?: number;
        previousQtySum?: number;
      };
      if (!res.ok) {
        throw new Error(data.error || `Xatolik (${res.status})`);
      }
      window.alert(
        `Qoldiq tozalandi.\n` +
          `Oldingi jami: ${(data.previousQtySum ?? 0).toLocaleString("uz-UZ")} dona\n` +
          `Yangilangan qatorlar: ${data.updatedRows ?? 0}`
      );
      router.refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Tozalash xatosi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClear}
      className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-50"
    >
      {busy ? "Tozalanmoqda…" : "Tovar sonlarini tozalash"}
    </button>
  );
}
