"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ORDER_FLOW, ORDER_STATUS } from "@/lib/utils";

export function OrderStatusActions({ orderId, current }: { orderId: string; current: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function setStatus(status: string) {
    setLoading(true);
    await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-1">
      {ORDER_FLOW.map((f) => {
        const label = ORDER_STATUS[f.status]?.label || f.title;
        return (
          <button
            key={f.status}
            type="button"
            disabled={loading || current === f.status}
            onClick={() => setStatus(f.status)}
            title={f.title}
            className={`rounded px-1.5 py-0.5 text-[10px] leading-tight ${
              current === f.status ? "bg-lf-red text-white" : "bg-white/5 text-lf-muted hover:bg-white/10"
            } disabled:opacity-40`}
          >
            {label}
          </button>
        );
      })}
      <button
        type="button"
        disabled={loading}
        onClick={() => setStatus("CANCELLED")}
        className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] text-rose-300"
      >
        Bekor
      </button>
    </div>
  );
}
