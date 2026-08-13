"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Check, ExternalLink, MapPin, Package, Store } from "lucide-react";
import type { PublicTrackOrder } from "@/lib/order-access";
import { formatSom } from "@/lib/utils";
import { TrackLiveRefresh } from "@/components/TrackLiveRefresh";

export function TrackOrderView({ order: initial }: { order: PublicTrackOrder }) {
  const [order, setOrder] = useState(initial);
  useEffect(() => setOrder(initial), [initial]);
  const onOrder = useCallback((next: PublicTrackOrder) => setOrder(next), []);
  const isPickup = order.deliveryType === "PICKUP";
  const terminal = ["DELIVERED", "DONE", "CANCELLED"].includes(order.status);

  return (
    <>
      <TrackLiveRefresh orderNumber={order.orderNumber} onOrder={onOrder} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lf-muted">Kuzatish</p>
          <h1 className="mt-1 text-xl font-bold">{order.orderNumber}</h1>
          <p className="mt-0.5 text-[11px] text-lf-muted">Tel: {order.customerPhoneMasked}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold text-white ${order.statusColor}`}>
          {order.statusLabel}
        </span>
      </div>

      <div className="mt-4 rounded-3xl border border-lf-border bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-lf-pink text-lf-red">
            {isPickup ? <Store className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-lf-muted">
              Hozirgi bosqich
            </div>
            <div className="mt-0.5 text-sm font-semibold text-lf-text">{order.location}</div>
            <div className="mt-1 text-xs text-lf-muted">
              {order.deliveryLabel}
              {order.handoffLabel ? ` · ${order.handoffLabel}` : ""}
              {isPickup ? "" : ` · ${order.city}${order.address ? `, ${order.address}` : ""}`}
            </div>
            {!terminal && order.promisedLabel && (
              <div className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
                Kutiladi: {order.promisedLabel} gacha
                {order.promiseLabel ? (
                  <span className="mt-0.5 block font-normal text-emerald-800/80">
                    {order.promiseLabel}
                  </span>
                ) : null}
              </div>
            )}
            {!terminal && order.nextStep && (
              <div className="mt-2 text-xs text-lf-muted">
                <span className="font-semibold text-lf-text">Keyingi qadam:</span>{" "}
                {order.nextStep.title}
                {order.nextStep.hint ? ` — ${order.nextStep.hint}` : ""}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-1">
          {order.timeline.map((step) => (
            <div
              key={step.id}
              className={`h-1.5 flex-1 rounded-full ${
                step.state === "done"
                  ? "bg-emerald-500"
                  : step.state === "current"
                    ? "bg-lf-red"
                    : "bg-lf-border"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 rounded-3xl border border-lf-border bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-sm font-bold">Holatlar</h2>
        <ol className="space-y-0">
          {order.timeline.map((step, idx) => {
            const isLast = idx === order.timeline.length - 1;
            return (
              <li key={step.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                      step.state === "done"
                        ? "bg-emerald-500 text-white"
                        : step.state === "current"
                          ? "bg-lf-red text-white ring-4 ring-lf-red/15"
                          : "bg-lf-border text-lf-muted"
                    }`}
                  >
                    {step.state === "done" ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : idx + 1}
                  </span>
                  {!isLast && (
                    <span
                      className={`my-1 w-px flex-1 min-h-[1.25rem] ${
                        step.state === "done" ? "bg-emerald-400" : "bg-lf-border"
                      }`}
                    />
                  )}
                </div>
                <div className={`pb-4 ${step.state === "upcoming" ? "opacity-45" : ""}`}>
                  <div
                    className={`text-sm font-semibold ${
                      step.state === "current" ? "text-lf-red" : "text-lf-text"
                    }`}
                  >
                    {step.title}
                  </div>
                  {step.hint && <div className="mt-0.5 text-xs text-lf-muted">{step.hint}</div>}
                  {step.at && (
                    <div className="mt-1 text-[11px] text-lf-muted">
                      {new Date(step.at).toLocaleString("uz-UZ")}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {isPickup && order.warehouse && (
        <div className="mt-3 rounded-3xl border border-lf-border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Store className="h-4 w-4 text-lf-red" />
            Olib ketish manzili
          </div>
          <div className="mt-2 text-sm font-semibold">{order.warehouse.name}</div>
          <div className="mt-1 text-xs text-lf-muted">
            {order.warehouse.city}, {order.warehouse.address}
          </div>
          {order.warehouse.phone && (
            <div className="mt-1 text-xs text-lf-muted">Tel: {order.warehouse.phone}</div>
          )}
        </div>
      )}

      {!isPickup && (order.courier.name || order.courier.tracking || order.handoffMode === "PVZ") && (
        <div className="mt-3 rounded-3xl border border-lf-border bg-white p-4 shadow-sm">
          <div className="text-sm font-bold">Kuryer</div>
          <div className="mt-1 text-sm font-semibold">
            {order.courier.name || "Kuryer (do‘kon tanlaydi)"}
          </div>
          {order.handoffLabel && <div className="mt-1 text-xs text-lf-muted">{order.handoffLabel}</div>}
          {order.courier.branchLabel && (
            <div className="mt-1 text-xs text-lf-muted">Punkt: {order.courier.branchLabel}</div>
          )}
          {order.courier.tracking ? (
            <div className="mt-2 text-xs text-lf-muted">
              Trek-kod:{" "}
              <span className="font-mono font-semibold text-lf-text">{order.courier.tracking}</span>
            </div>
          ) : (
            <div className="mt-2 text-xs text-lf-muted">
              Trek-kod hali kiritilmagan — kuryerga topshirilganda paydo bo‘ladi.
            </div>
          )}
          {order.courier.trackUrl && (
            <a
              href={order.courier.trackUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-lf-red px-3 py-2 text-xs font-semibold text-white"
            >
              Kuryer saytida kuzatish
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )}

      <div className="mt-3 space-y-2 rounded-3xl border border-lf-border bg-white p-4 text-sm shadow-sm">
        <div className="flex items-center gap-2 font-bold">
          <Package className="h-4 w-4 text-lf-red" /> Buyurtma tafsiloti
        </div>
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between text-lf-muted">
            <span>
              {item.name} · {item.color}/{item.size} ×{item.quantity}
            </span>
            <span>{formatSom(item.lineTotal)}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-lf-border pt-2 font-bold text-lf-text">
          <span>Jami</span>
          <span>{formatSom(order.total)}</span>
        </div>
      </div>

      {order.events.length > 1 && (
        <details className="mt-3 rounded-3xl border border-lf-border bg-white p-4 shadow-sm">
          <summary className="cursor-pointer text-sm font-bold">Batafsil tarix</summary>
          <ol className="mt-3 space-y-3">
            {[...order.events].reverse().map((ev) => (
              <li key={ev.id} className="text-sm">
                <div className="font-semibold">{ev.title}</div>
                {ev.note && <div className="text-xs text-lf-muted">{ev.note}</div>}
                <div className="mt-0.5 text-[11px] text-lf-muted">
                  {new Date(ev.createdAt).toLocaleString("uz-UZ")}
                </div>
              </li>
            ))}
          </ol>
        </details>
      )}

      <Link href="/orders" className="mt-4 block text-center text-sm font-semibold text-lf-red">
        Buyurtmalarimga qaytish
      </Link>
    </>
  );
}
