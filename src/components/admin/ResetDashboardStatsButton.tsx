"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ResetDashboardStatsButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onReset() {
    const ok = window.confirm(
      "Barcha buyurtmalar, mijozlar va tushum 0 bo‘ladi. Davom?\n\nMahsulotlar katalogi o‘chirilmaydi — faqat savdo raqamlari."
    );
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch("/api/admin/dashboard/reset-stats", {
        method: "POST",
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        deletedOrders?: number;
        remainingOrders?: number;
      };
      if (!res.ok) {
        throw new Error(data.error || `Xatolik (${res.status})`);
      }
      window.alert(
        `Dashboard tozalandi.\nO‘chirilgan buyurtmalar: ${data.deletedOrders ?? 0}`
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
      onClick={onReset}
      className="rounded-xl border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-white/30 hover:text-white disabled:opacity-50"
    >
      {busy ? "Tozalanmoqda…" : "Savdoni 0 qilish"}
    </button>
  );
}
