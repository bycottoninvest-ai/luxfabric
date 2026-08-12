"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ExternalLink, Truck } from "lucide-react";

type Courier = {
  id: string;
  code: string;
  nameUz: string;
  name: string;
  phone: string | null;
  website: string | null;
  isActive: boolean;
  supportsCod: boolean;
  notes: string | null;
  ordersCount: number;
};

type ReadyOrder = {
  id: string;
  orderNumber: string;
  status: string;
  city: string;
  address: string;
  customerName: string;
  customerPhone: string;
  warehouseName: string;
  warehouseAddress: string;
  itemsLabel: string;
};

type Wh = {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string | null;
  region: string;
};

export function CouriersPanel({
  couriers,
  orders,
  warehouses,
}: {
  couriers: Courier[];
  orders: ReadyOrder[];
  warehouses: Wh[];
}) {
  const router = useRouter();
  const [list, setList] = useState(couriers);
  const [selectedCourier, setSelectedCourier] = useState(couriers.find((c) => c.isActive)?.id || "");
  const [trackingByOrder, setTrackingByOrder] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  async function toggleCourier(c: Courier) {
    const res = await fetch("/api/admin/couriers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id, isActive: !c.isActive }),
    });
    if (!res.ok) return;
    setList((prev) => prev.map((x) => (x.id === c.id ? { ...x, isActive: !c.isActive } : x)));
  }

  async function handover(orderId: string) {
    if (!selectedCourier) {
      setMsg("Avval kuryer tanlang");
      return;
    }
    setBusy(orderId);
    setMsg("");
    const tracking = (trackingByOrder[orderId] || "").trim();
    const res = await fetch(`/api/admin/orders/${orderId}/handover`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courierId: selectedCourier,
        ...(tracking ? { tracking } : {}),
      }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setMsg(data.error || "Xatolik");
      return;
    }
    setMsg(
      `${data.order.orderNumber} → ${data.order.courierLabel}. Trek: ${data.order.courierTracking}. Ombor: ${data.pickup.warehouse}`
    );
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/10 bg-lf-card p-4">
        <h2 className="mb-3 font-semibold">Ombor manzillari (kuryer olib ketadi)</h2>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {warehouses.slice(0, 6).map((w) => (
            <div key={w.id} className="rounded-xl border border-white/5 bg-black/20 p-3 text-sm">
              <div className="font-medium">{w.name}</div>
              <div className="text-xs text-lf-muted">
                {w.region} · {w.city}
              </div>
              <div className="mt-1 text-xs text-lf-muted">{w.address}</div>
              {w.phone && <div className="text-xs text-lf-muted">{w.phone}</div>}
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-lf-muted">Jami {warehouses.length} ta faol ombor — kuryer shu yerdan yukni oladi.</p>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Dostavka hamkorlari</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => (
            <div key={c.id} className="rounded-2xl border border-white/10 bg-lf-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-lf-muted">{c.code}</div>
                  <div className="font-semibold">{c.nameUz}</div>
                  <div className="text-xs text-lf-muted">{c.name}</div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleCourier(c)}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    c.isActive ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-lf-muted"
                  }`}
                >
                  {c.isActive ? "Faol" : "O‘chiq"}
                </button>
              </div>
              {c.notes && <p className="mt-2 text-xs text-lf-muted">{c.notes}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-lf-muted">
                {c.supportsCod && <span className="rounded bg-white/5 px-2 py-1">COD</span>}
                <span className="rounded bg-white/5 px-2 py-1">{c.ordersCount} buyurtma</span>
                {c.website && (
                  <a href={c.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-lf-red">
                    Sayt <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedCourier(c.id)}
                className={`mt-3 w-full rounded-xl px-3 py-2 text-xs font-semibold ${
                  selectedCourier === c.id ? "bg-lf-red text-white" : "border border-white/10"
                }`}
              >
                {selectedCourier === c.id ? "Tanlangan" : "Topshirish uchun tanlash"}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-lf-red" />
          <h2 className="font-semibold">Ombordan kuryerga topshirish</h2>
        </div>
        {msg && <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{msg}</p>}
        <div className="space-y-2">
          {orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 p-6 text-sm text-lf-muted">
              Hozircha topshirishga tayyor buyurtma yo‘q (NEW / PICKING / PACKED).
            </div>
          ) : (
            orders.map((o) => (
              <div key={o.id} className="rounded-2xl border border-white/10 bg-lf-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{o.orderNumber}</div>
                    <div className="text-sm text-lf-muted">
                      {o.customerName} · {o.customerPhone}
                    </div>
                    <div className="mt-1 text-xs text-lf-muted">
                      Mijoz: {o.city}, {o.address}
                    </div>
                    <div className="mt-1 text-xs text-lf-muted">
                      Ombor: {o.warehouseName} · {o.warehouseAddress}
                    </div>
                    <div className="mt-1 text-xs text-lf-muted">{o.itemsLabel}</div>
                    <div className="mt-1 text-[11px] text-amber-300">Status: {o.status}</div>
                    <input
                      type="text"
                      value={trackingByOrder[o.id] || ""}
                      onChange={(e) =>
                        setTrackingByOrder((prev) => ({ ...prev, [o.id]: e.target.value }))
                      }
                      placeholder="Kuryer trek-kodi (ixtiyoriy)"
                      className="mt-2 w-full max-w-xs rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs text-white placeholder:text-white/35"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={busy === o.id || !selectedCourier}
                    onClick={() => handover(o.id)}
                    className="rounded-xl bg-lf-red px-4 py-2 text-sm font-semibold disabled:opacity-50"
                  >
                    {busy === o.id ? "..." : "Kuryerga topshirish"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
