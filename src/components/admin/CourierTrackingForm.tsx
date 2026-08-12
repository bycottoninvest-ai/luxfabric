"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CourierTrackingForm({
  orderId,
  initialCode = "",
}: {
  orderId: string;
  initialCode?: string | null;
}) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode || "");
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);

  async function save() {
    setLoading(true);
    setOk(false);
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courierTracking: code.trim() || null }),
    });
    setLoading(false);
    if (!res.ok) return;
    setOk(true);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Trek-kod"
        className="w-28 rounded border border-white/15 bg-black/30 px-1.5 py-0.5 text-[10px] text-white placeholder:text-white/35"
      />
      <button
        type="button"
        disabled={loading}
        onClick={save}
        className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/80 hover:bg-white/15 disabled:opacity-40"
      >
        {loading ? "…" : ok ? "✓" : "Trek"}
      </button>
    </div>
  );
}
