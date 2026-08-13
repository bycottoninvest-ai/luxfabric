"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PackageSearch, Search } from "lucide-react";
import type { PublicTrackOrder } from "@/lib/order-access";
import {
  listDeviceTokenPairs,
  readDeviceOrderTokens,
  saveDeviceOrderToken,
} from "@/lib/device-order-storage";
import { formatSom, isValidUzPhone, maskUzPhone } from "@/lib/utils";

/** checkout page dagi `lf_checkout_customer` bilan bir xil */
const CHECKOUT_CUSTOMER_KEY = "lf_checkout_customer";

export function MyOrdersPanel() {
  const [phone, setPhone] = useState("+998");
  const [orderNumber, setOrderNumber] = useState("");
  const [orders, setOrders] = useState<PublicTrackOrder[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [hint, setHint] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHECKOUT_CUSTOMER_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { phone?: string };
        if (saved.phone) setPhone(maskUzPhone(saved.phone));
      }
    } catch {
      /* ignore */
    }

    const pairs = listDeviceTokenPairs();
    if (!pairs.length) {
      setLoading(false);
      setHint("Shu telefonda buyurtma bergan bo‘lsangiz — avtomatik chiqadi. Aks holda telefon + LF-… kiriting.");
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/track/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceTokens: pairs }),
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data.orders)) {
          setOrders(data.orders);
          if (data.orders.length === 0) {
            setHint("Qurilmada saqlangan tokenlar eskirgan. Telefon + buyurtma raqamini kiriting.");
          }
        }
      } catch {
        setHint("Ro‘yxatni yuklab bo‘lmadi. Telefon + LF-… bilan qidirishingiz mumkin.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!isValidUzPhone(phone)) {
      setError("Telefon +998XXXXXXXXX formatida bo‘lishi kerak");
      return;
    }
    const no = orderNumber.trim().toUpperCase();
    if (!no) {
      setError("Boshqa qurilmada buyurtma raqami (LF-…) majburiy");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/track/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, orderNumber: no }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Topilmadi");
        return;
      }
      if (data.order) {
        if (typeof data.deviceOrderToken === "string") {
          saveDeviceOrderToken(data.order.orderNumber, data.deviceOrderToken);
        }
        setOrders((prev) => {
          const rest = prev.filter((o) => o.orderNumber !== data.order.orderNumber);
          return [data.order, ...rest];
        });
        window.location.href = `/track/${data.order.orderNumber}`;
        return;
      }
    } catch {
      setError("Tarmoq xatosi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-lf-pink text-lf-red">
          <PackageSearch className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Buyurtmam qayerda?</h1>
          <p className="mt-1 text-sm text-lf-muted">
            Faqat o‘zingiz bergan buyurtmani ko‘rasiz — telefon tasdiqlanadi.
          </p>
        </div>
      </div>

      <form
        onSubmit={submit}
        className="mt-4 space-y-3 rounded-3xl border border-lf-border bg-white p-4 shadow-sm"
      >
        <div>
          <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-lf-muted">
            Telefon (+998)
          </label>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(maskUzPhone(e.target.value))}
            className="mt-1.5 w-full rounded-2xl border border-lf-border px-3 py-3 text-sm outline-none focus:border-lf-red"
            placeholder="+998XXXXXXXXX"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-lf-muted">
            Buyurtma raqami (ixtiyoriy shu qurilmada)
          </label>
          <input
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
            className="mt-1.5 w-full rounded-2xl border border-lf-border px-3 py-3 font-mono text-sm outline-none focus:border-lf-red"
            placeholder="LF-123456"
          />
          <p className="mt-1 text-[11px] text-lf-muted">
            Boshqa telefon/qurilmadan — LF-… majburiy. Shu qurilmada berilgan buyurtmalar pastda.
          </p>
        </div>
        {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-lf-red py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          <Search className="h-4 w-4" />
          Kuzatish
        </button>
      </form>

      <div className="mt-5">
        <h2 className="text-sm font-bold">Mening buyurtmalarim</h2>
        {hint && !orders.length && (
          <p className="mt-1 text-xs text-lf-muted">{hint}</p>
        )}
        {loading && !orders.length ? (
          <p className="mt-3 text-sm text-lf-muted">Yuklanmoqda…</p>
        ) : orders.length === 0 ? (
          <p className="mt-3 text-sm text-lf-muted">Hali ko‘rsatiladigan buyurtma yo‘q.</p>
        ) : (
          <div className="mt-3 space-y-2.5">
            {orders.map((order) => (
              <Link
                key={order.orderNumber}
                href={`/track/${order.orderNumber}`}
                className="block rounded-2xl border border-lf-border bg-white p-4 shadow-sm transition hover:border-lf-red/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold">{order.orderNumber}</div>
                    <div className="mt-1 text-xs text-lf-muted">
                      {order.items[0]?.name}
                      {order.items.length > 1 ? ` +${order.items.length - 1}` : ""}
                    </div>
                    {order.promisedLabel && (
                      <div className="mt-1 text-[11px] font-medium text-emerald-700">
                        Va’da: {order.promisedLabel}
                      </div>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold text-white ${order.statusColor}`}
                  >
                    {order.statusLabel}
                  </span>
                </div>
                <div className="mt-3 flex justify-between text-sm">
                  <span className="text-lf-muted">
                    {new Date(order.createdAt).toLocaleString("uz-UZ")}
                  </span>
                  <span className="font-bold">{formatSom(order.total)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
        {Object.keys(readDeviceOrderTokens()).length > 0 && orders.length > 0 && (
          <p className="mt-3 text-[11px] text-lf-muted">
            Ro‘yxat shu qurilmadagi xavfsiz token orqali ochildi.
          </p>
        )}
      </div>
    </div>
  );
}
