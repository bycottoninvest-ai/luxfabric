"use client";

import { useEffect, useState } from "react";
import { Lock, Search } from "lucide-react";
import type { PublicTrackOrder } from "@/lib/order-access";
import { getDeviceOrderToken, saveDeviceOrderToken } from "@/lib/device-order-storage";
import { isValidUzPhone, maskUzPhone } from "@/lib/utils";
import { TrackOrderView } from "@/components/TrackOrderView";

type Props = {
  orderNumber: string;
  /** Admin uchun serverdan tayyor buyurtma */
  initialOrder?: PublicTrackOrder | null;
};

export function TrackOrderGate({ orderNumber, initialOrder = null }: Props) {
  const [order, setOrder] = useState<PublicTrackOrder | null>(initialOrder);
  const [phone, setPhone] = useState("+998");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!initialOrder);
  const [autoTried, setAutoTried] = useState(false);

  useEffect(() => {
    if (initialOrder || autoTried) return;
    setAutoTried(true);
    const token = getDeviceOrderToken(orderNumber);
    if (!token) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/track/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderNumber, deviceToken: token }),
        });
        const data = await res.json();
        if (res.ok && data.order) {
          setOrder(data.order);
        }
      } catch {
        /* forma ko‘rsatiladi */
      } finally {
        setLoading(false);
      }
    })();
  }, [orderNumber, initialOrder, autoTried]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!isValidUzPhone(phone)) {
      setError("Telefon +998XXXXXXXXX formatida bo‘lishi kerak");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/track/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, orderNumber }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Topilmadi");
        setOrder(null);
        return;
      }
      if (typeof data.deviceOrderToken === "string") {
        saveDeviceOrderToken(orderNumber, data.deviceOrderToken);
      }
      setOrder(data.order);
    } catch {
      setError("Tarmoq xatosi");
    } finally {
      setLoading(false);
    }
  }

  if (order) {
    return <TrackOrderView order={order} />;
  }

  if (loading) {
    return (
      <div className="mt-8 rounded-3xl border border-lf-border bg-white p-6 text-center text-sm text-lf-muted">
        Tekshirilmoqda…
      </div>
    );
  }

  return (
    <div className="mt-2">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-lf-pink text-lf-red">
          <Lock className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lf-muted">Kuzatish</p>
          <h1 className="mt-1 text-xl font-bold">{orderNumber}</h1>
          <p className="mt-1 text-sm text-lf-muted">
            Maxfiylik uchun buyurtma bergan telefon raqamini kiriting. Faqat LF-kod bilan boshqalar
            ko‘ra olmaydi.
          </p>
        </div>
      </div>

      <form
        onSubmit={submit}
        className="mt-5 space-y-3 rounded-3xl border border-lf-border bg-white p-4 shadow-sm"
      >
        <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-lf-muted">
          Telefon (+998)
        </label>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(maskUzPhone(e.target.value))}
          className="w-full rounded-2xl border border-lf-border px-3 py-3 text-sm outline-none focus:border-lf-red"
          placeholder="+998XXXXXXXXX"
        />
        {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-lf-red py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          <Search className="h-4 w-4" />
          Buyurtmani ochish
        </button>
      </form>
    </div>
  );
}
