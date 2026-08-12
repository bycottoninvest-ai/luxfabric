"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ORDER_STATUS } from "@/lib/utils";
import { nextAdminActions, requiresTrackingForTransition } from "@/lib/fulfillment";

export function OrderStatusActions({
  orderId,
  current,
  deliveryType,
  paymentStatus,
  courierTracking,
}: {
  orderId: string;
  current: string;
  deliveryType: string;
  paymentStatus: string;
  courierTracking?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [trackDraft, setTrackDraft] = useState(courierTracking || "");
  const [needTrack, setNeedTrack] = useState(false);

  const actions = nextAdminActions(current, deliveryType, paymentStatus);

  async function setStatus(status: string) {
    setError("");
    if (requiresTrackingForTransition(status, deliveryType)) {
      const track = (trackDraft || courierTracking || "").trim();
      if (!track) {
        setNeedTrack(true);
        setError("SHIPPED uchun trek-kod kiriting");
        return;
      }
    }

    setLoading(true);
    const body: { status: string; courierTracking?: string } = { status };
    if (requiresTrackingForTransition(status, deliveryType)) {
      body.courierTracking = (trackDraft || courierTracking || "").trim();
    }

    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Xatolik");
      if (requiresTrackingForTransition(status, deliveryType)) setNeedTrack(true);
      return;
    }
    setNeedTrack(false);
    router.refresh();
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1">
        {actions.map((f) => {
          const label = ORDER_STATUS[f.status]?.label || f.title;
          const needsTrack = requiresTrackingForTransition(f.status, deliveryType);
          return (
            <button
              key={f.status}
              type="button"
              disabled={loading || current === f.status}
              onClick={() => setStatus(f.status)}
              title={needsTrack ? `${f.title} (trek majburiy)` : f.title}
              className={`rounded px-1.5 py-0.5 text-[10px] leading-tight ${
                current === f.status
                  ? "bg-lf-red text-white"
                  : needsTrack
                    ? "bg-indigo-500/30 text-indigo-100 hover:bg-indigo-500/45"
                    : "bg-white/5 text-lf-muted hover:bg-white/10"
              } disabled:opacity-40`}
            >
              → {label}
            </button>
          );
        })}
        <button
          type="button"
          disabled={loading || current === "CANCELLED" || current === "DONE"}
          onClick={() => setStatus("CANCELLED")}
          className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] text-rose-300 disabled:opacity-40"
        >
          Bekor
        </button>
      </div>
      {(needTrack || requiresTrackingForTransition("SHIPPED", deliveryType)) &&
        deliveryType !== "PICKUP" && (
          <div className="flex flex-wrap items-center gap-1">
            <input
              type="text"
              value={trackDraft}
              onChange={(e) => setTrackDraft(e.target.value)}
              placeholder="Trek-kod (SHIPPED uchun)"
              className="w-36 rounded border border-indigo-400/40 bg-black/40 px-1.5 py-0.5 text-[10px] text-white placeholder:text-white/35"
            />
          </div>
        )}
      {error && <p className="text-[10px] text-rose-300">{error}</p>}
    </div>
  );
}
