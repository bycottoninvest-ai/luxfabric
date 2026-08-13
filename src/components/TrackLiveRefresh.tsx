"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getDeviceOrderToken } from "@/lib/device-order-storage";
import type { PublicTrackOrder } from "@/lib/order-access";

/** Status o‘zgarganda mijoz trackingni yangilash (polling). */
export function TrackLiveRefresh({
  orderNumber,
  intervalMs = 20000,
  onOrder,
}: {
  orderNumber?: string;
  intervalMs?: number;
  onOrder?: (order: PublicTrackOrder) => void;
}) {
  const router = useRouter();

  useEffect(() => {
    const id = window.setInterval(() => {
      if (orderNumber && onOrder) {
        const token = getDeviceOrderToken(orderNumber);
        if (token) {
          void fetch("/api/track/lookup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderNumber, deviceToken: token }),
          })
            .then((res) => res.json().then((data) => ({ res, data })))
            .then(({ res, data }) => {
              if (res.ok && data.order) onOrder(data.order);
            })
            .catch(() => undefined);
          return;
        }
      }
      router.refresh();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [orderNumber, intervalMs, onOrder, router]);

  return null;
}
