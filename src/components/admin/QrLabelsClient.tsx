"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function QrLabelsClient({ orderNumber }: { orderNumber?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function saveAndOpen() {
    if (!orderNumber) {
      window.print();
      return;
    }
    setBusy(true);
    try {
      await fetch("/api/admin/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber }),
      });
      window.print();
      // Chopdan keyin mobil kartochka ochiladi — QR yotib qolsa ham topiladi
      router.push(`/card/${orderNumber}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button
        type="button"
        disabled={busy}
        onClick={saveAndOpen}
        className="rounded-xl bg-lf-red px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
      >
        {busy ? "..." : orderNumber ? "Chop etish + Kartochka ochish" : "Chop etish / Print"}
      </button>
      {orderNumber && (
        <button
          type="button"
          onClick={() => router.push(`/card/${orderNumber}`)}
          className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold"
        >
          Kartochkani ochish
        </button>
      )}
    </div>
  );
}
