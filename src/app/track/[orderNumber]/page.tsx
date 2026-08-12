import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ExternalLink, MapPin, Package, Store } from "lucide-react";
import { StoreShell } from "@/components/StoreShell";
import { TrackLiveRefresh } from "@/components/TrackLiveRefresh";
import { prisma } from "@/lib/prisma";
import {
  buildCourierTrackingUrl,
  buildCustomerTimeline,
  currentLocationLabel,
  deliveryTypeLabel,
  formatPromisedByLabel,
  handoffLabel,
  nextCustomerStep,
  resolveCourierMeta,
} from "@/lib/order-tracking";
import { normalizeStatus } from "@/lib/fulfillment";
import { ORDER_STATUS, formatSom } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TrackPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      events: { orderBy: { createdAt: "asc" } },
      warehouse: true,
      courier: true,
      items: { include: { product: true, variant: true } },
    },
  });
  if (!order) notFound();

  const statusKey = normalizeStatus(order.status);
  const st = ORDER_STATUS[statusKey] || ORDER_STATUS.NEW;
  const timeline = buildCustomerTimeline(order);
  const location = currentLocationLabel(order);
  const courierMeta = resolveCourierMeta(order);
  const trackUrl = buildCourierTrackingUrl(
    courierMeta?.code || order.courierCode || order.courierCompanyId,
    order.courierTracking
  );
  const isPickup = order.deliveryType === "PICKUP";
  const promisedLabel = formatPromisedByLabel(order.promisedBy);
  const next = nextCustomerStep(order.status, order.deliveryType, order.paymentStatus);
  const handoff = handoffLabel(order.handoffMode);
  const terminal = ["DELIVERED", "DONE", "CANCELLED"].includes(statusKey);

  return (
    <StoreShell>
      <TrackLiveRefresh />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lf-muted">Tracking</p>
          <h1 className="mt-1 text-xl font-bold">{order.orderNumber}</h1>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold text-white ${st.color}`}>
          {st.label}
        </span>
      </div>

      {/* Va’da + hozirgi bosqich */}
      <div className="mt-4 rounded-3xl border border-lf-border bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-lf-pink text-lf-red">
            {isPickup ? <Store className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-lf-muted">
              Hozirgi bosqich
            </div>
            <div className="mt-0.5 text-sm font-semibold text-lf-text">{location}</div>
            <div className="mt-1 text-xs text-lf-muted">
              {deliveryTypeLabel(order.deliveryType)}
              {handoff ? ` · ${handoff}` : ""}
              {isPickup ? "" : ` · ${order.city}${order.address ? `, ${order.address}` : ""}`}
            </div>
            {!terminal && promisedLabel && (
              <div className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
                Kutiladi: {promisedLabel} gacha
                {order.promiseLabel ? (
                  <span className="mt-0.5 block font-normal text-emerald-800/80">
                    {order.promiseLabel}
                  </span>
                ) : null}
              </div>
            )}
            {!terminal && next && (
              <div className="mt-2 text-xs text-lf-muted">
                <span className="font-semibold text-lf-text">Keyingi qadam:</span> {next.title}
                {next.hint ? ` — ${next.hint}` : ""}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-1">
          {timeline.map((step) => (
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
          {timeline.map((step, idx) => {
            const isLast = idx === timeline.length - 1;
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

      {!isPickup && (courierMeta || order.courierTracking || order.handoffMode === "PVZ") && (
        <div className="mt-3 rounded-3xl border border-lf-border bg-white p-4 shadow-sm">
          <div className="text-sm font-bold">Kuryer</div>
          <div className="mt-1 text-sm font-semibold">
            {courierMeta?.name || order.courierLabel || "Kuryer (do‘kon tanlaydi)"}
          </div>
          {handoff && <div className="mt-1 text-xs text-lf-muted">{handoff}</div>}
          {order.courierBranchLabel && (
            <div className="mt-1 text-xs text-lf-muted">Punkt: {order.courierBranchLabel}</div>
          )}
          {order.courierTracking ? (
            <div className="mt-2 text-xs text-lf-muted">
              Trek-kod:{" "}
              <span className="font-mono font-semibold text-lf-text">{order.courierTracking}</span>
            </div>
          ) : (
            <div className="mt-2 text-xs text-lf-muted">
              Trek-kod hali kiritilmagan — kuryerga topshirilganda paydo bo‘ladi.
            </div>
          )}
          {trackUrl && (
            <a
              href={trackUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-lf-red px-3 py-2 text-xs font-semibold text-white"
            >
              Kuryer saytida kuzatish
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <p className="mt-2 text-[11px] text-lf-muted">
            Jonli GPS yo‘q — holatlar + rasmiy trek-kod (kuryer sayti).
          </p>
        </div>
      )}

      <div className="mt-3 space-y-2 rounded-3xl border border-lf-border bg-white p-4 text-sm shadow-sm">
        <div className="flex items-center gap-2 font-bold">
          <Package className="h-4 w-4 text-lf-red" /> Buyurtma tafsiloti
        </div>
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between text-lf-muted">
            <span>
              {item.product.name} · {item.variant.color}/{item.variant.size} ×{item.quantity}
            </span>
            <span>{formatSom(item.price * item.quantity)}</span>
          </div>
        ))}
        {order.warehouse && !isPickup && (
          <div className="pt-2 text-xs text-lf-muted">Ombor: {order.warehouse.name}</div>
        )}
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
    </StoreShell>
  );
}
