"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Keyboard, PackageCheck, X } from "lucide-react";

type Mode = "ORDER" | "OUT" | "LOOKUP";

type Warehouse = { id: string; name: string; city: string; isCentral: boolean };
type OrderSession = {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  customerPhone?: string;
  city?: string;
  address?: string;
  deliveryLabel?: string;
  warehouseId: string | null;
  warehouseName: string | null;
  items: {
    id: string;
    quantity: number;
    pickedQty: number;
    remaining: number;
    productName: string;
    barcode: string;
    color: string;
    size: string;
    done: boolean;
  }[];
  progress: { picked: number; total: number };
};

type ScanRow = {
  id: string;
  action: string;
  note: string | null;
  createdAt: string;
  variant?: { product: { name: string }; color: string; size: string } | null;
  order?: { orderNumber: string } | null;
  warehouse?: { name: string } | null;
};

function isPhoneViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1023px)").matches;
}

const titles: Record<Mode, { title: string; hint: string }> = {
  OUT: {
    title: "Chiqim skaner",
    hint: "Upakovka QR ni skanerlang — ombor soni avtomatik kamayadi.",
  },
  ORDER: {
    title: "Buyurtma yig‘ish",
    hint: "Avval LF-... buyurtma QR, keyin mahsulot QR larini skanerlang.",
  },
  LOOKUP: {
    title: "Qidiruv",
    hint: "Barcode / QR ni tekshirish.",
  },
};

type OpenOrderRow = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  city: string;
  address: string;
  status: string;
  warehouseId: string | null;
  warehouse: { name: string; city: string } | null;
};

/** Faqat Chiqim / Buyurtma / Qidiruv — Kirim alohida sahifa */
export function QrScannerPanel({
  warehouses,
  initialRecent,
  openOrders = [],
  mode,
}: {
  warehouses: Warehouse[];
  initialRecent: ScanRow[];
  openOrders?: OpenOrderRow[];
  mode: Mode;
}) {
  const [warehouseId, setWarehouseId] = useState(
    warehouses.find((w) => w.isCentral)?.id || warehouses[0]?.id || ""
  );
  const [manual, setManual] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [layoutReady, setLayoutReady] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(true);
  const [order, setOrder] = useState<OrderSession | null>(null);
  const [destSaving, setDestSaving] = useState(false);
  const [recent, setRecent] = useState(initialRecent);
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5Ref = useRef<{ stop: () => Promise<void> } | null>(null);
  const lastCodeRef = useRef({ code: "", t: 0 });
  const modeRef = useRef(mode);
  const orderRef = useRef(order);
  const warehouseRef = useRef(warehouseId);
  const processCodeRef = useRef<(code: string) => Promise<void>>(async () => {});
  const startingRef = useRef(false);

  modeRef.current = mode;
  orderRef.current = order;
  warehouseRef.current = warehouseId;

  useEffect(() => {
    const phone = isPhoneViewport();
    // PC da ham chiqimda avto yoqilmasin — foydalanuvchi bosadi (kamera race kamayadi)
    setCameraOn(phone);
    setShowKeyboard(!phone);
    setLayoutReady(true);
  }, [mode]);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/scan");
    const data = await res.json();
    if (res.ok) setRecent(data.recent || []);
  }, []);

  const processCode = useCallback(
    async (code: string) => {
      const trimmed = code.trim();
      if (!trimmed || busy) return;
      const now = Date.now();
      if (trimmed === lastCodeRef.current.code && now - lastCodeRef.current.t < 1500) return;
      lastCodeRef.current = { code: trimmed, t: now };

      setBusy(true);
      setError("");
      setMsg("");
      try {
        const res = await fetch("/api/admin/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: trimmed,
            mode: modeRef.current,
            warehouseId: warehouseRef.current || null,
            orderId: orderRef.current?.id || null,
            quantity: 1,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Xatolik");

        setMsg(data.message || "OK");
        if (data.type === "ORDER_OPEN" && data.order) {
          setOrder(data.order);
          if (data.order.warehouseId) setWarehouseId(data.order.warehouseId);
        }
        if (data.type === "ORDER_PICK" && data.order) setOrder(data.order);
        if (data.type === "WAREHOUSE" && data.warehouse?.id) setWarehouseId(data.warehouse.id);
        await refresh();
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(40);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Xatolik");
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([40, 40, 40]);
      } finally {
        setBusy(false);
        setManual("");
      }
    },
    [busy, refresh]
  );

  processCodeRef.current = processCode;

  async function setOrderDestination(nextWarehouseId: string) {
    if (!order) return;
    setDestSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warehouseId: nextWarehouseId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Saqlash xatosi");
      const wh = warehouses.find((w) => w.id === nextWarehouseId);
      setOrder((prev) =>
        prev
          ? {
              ...prev,
              warehouseId: data.warehouseId ?? nextWarehouseId,
              warehouseName: data.warehouseName || (wh ? `${wh.name} · ${wh.city}` : null),
            }
          : prev
      );
      setWarehouseId(nextWarehouseId);
      setMsg(wh ? `Jo‘natish: ${wh.name} · ${wh.city}` : "Ombor yangilandi");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setDestSaving(false);
    }
  }

  useEffect(() => {
    if (!layoutReady || !cameraOn) return;
    let alive = true;
    const readerId = "lf-qr-reader-full";

    async function safeStop(scanner: { stop: () => Promise<void>; clear?: () => void } | null) {
      if (!scanner) return;
      try {
        await scanner.stop();
      } catch {
        /* not running — ignore */
      }
      try {
        scanner.clear?.();
      } catch {
        /* ignore */
      }
    }

    (async () => {
      if (startingRef.current) return;
      startingRef.current = true;
      try {
        await safeStop(html5Ref.current);
        html5Ref.current = null;

        const { Html5Qrcode } = await import("html5-qrcode");
        if (!scannerRef.current || !alive) return;

        scannerRef.current.innerHTML = `<div id="${readerId}" class="lf-qr-box"></div>`;
        const scanner = new Html5Qrcode(readerId);
        html5Ref.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 8,
            qrbox: (w, h) => {
              const side = Math.floor(Math.min(w, h) * 0.7);
              return { width: side, height: side };
            },
          },
          (text) => {
            if (alive) processCodeRef.current(text);
          },
          () => {}
        );
      } catch {
        if (alive) {
          setError("Kamera ochilmadi — ruxsat bering yoki qo‘lda barcode yozing");
          setCameraOn(false);
          setShowKeyboard(true);
        }
      } finally {
        startingRef.current = false;
      }
    })();

    return () => {
      alive = false;
      const s = html5Ref.current;
      html5Ref.current = null;
      void safeStop(s);
    };
  }, [layoutReady, cameraOn]);

  const meta = titles[mode];

  const warehouseSelect =
    mode === "OUT" ? (
      <select
        value={warehouseId}
        onChange={(e) => setWarehouseId(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-[#111] px-3 py-2.5 text-sm"
      >
        {warehouses.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name} — {w.city}
          </option>
        ))}
      </select>
    ) : null;

  const keyboardRow = showKeyboard ? (
    <div className="flex gap-2">
      <input
        ref={inputRef}
        value={manual}
        onChange={(e) => setManual(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            processCode(manual);
          }
        }}
        placeholder="Barcode / LF-... yozing yoki skaner gun bilan"
        className="flex-1 rounded-xl border border-white/15 bg-[#0c0c0c] px-3 py-2.5 text-sm outline-none focus:border-lf-red/50"
        autoFocus
      />
      <button
        type="button"
        disabled={busy || !manual.trim()}
        onClick={() => processCode(manual)}
        className="rounded-xl bg-lf-red px-4 text-sm font-semibold disabled:opacity-50"
      >
        OK
      </button>
    </div>
  ) : null;

  const alerts = (
    <>
      {msg && (
        <div className="rounded-xl bg-emerald-500/90 px-3 py-2 text-sm font-medium text-white">{msg}</div>
      )}
      {error && (
        <div className="rounded-xl bg-rose-500/90 px-3 py-2 text-sm font-medium text-white">{error}</div>
      )}
    </>
  );

  const orderPicker =
    mode === "ORDER" ? (
      <div className="rounded-2xl border border-lf-red/40 bg-lf-red/10 p-4 space-y-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-lf-red">1. Buyurtmani oching</div>
          <p className="mt-1 text-xs text-white/55">Ro‘yxatdan tanlang yoki LF kodini skanerlang / yozing.</p>
        </div>
        <select
          value={order?.id || ""}
          onChange={(e) => {
            const id = e.target.value;
            if (!id) {
              setOrder(null);
              return;
            }
            const row = openOrders.find((o) => o.id === id);
            if (row) processCode(row.orderNumber);
          }}
          className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2.5 text-sm"
        >
          <option value="">— Buyurtma tanlang —</option>
          {openOrders.map((o) => (
            <option key={o.id} value={o.id}>
              {o.orderNumber} · {o.customerName} · {o.city}
            </option>
          ))}
        </select>
        {openOrders.length === 0 && (
          <p className="text-xs text-amber-300/90">Hali yig‘iladigan buyurtma yo‘q</p>
        )}
      </div>
    ) : null;

  const orderCard = order ? (
    <div className="rounded-2xl border border-white/10 bg-[#121212] p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-white/50">
            <PackageCheck className="h-3.5 w-3.5 text-lf-red" />
            Faol buyurtma
          </div>
          <div className="mt-1 text-lg font-bold">{order.orderNumber}</div>
          <div className="text-sm text-white/60">
            {order.customerName}
            {order.customerPhone ? ` · ${order.customerPhone}` : ""}
          </div>
        </div>
        <button type="button" onClick={() => setOrder(null)} className="text-xs text-white/45 hover:text-white">
          Yopish
        </button>
      </div>

      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-2">
        <div className="text-[10px] uppercase tracking-[0.14em] text-emerald-300">2. Qayerga jo‘natiladi</div>
        <div className="text-base font-semibold text-white">{order.city || "Shahar yo‘q"}</div>
        <div className="text-sm text-white/70">{order.address || "Manzil yo‘q"}</div>
        {order.deliveryLabel && (
          <div className="text-[11px] text-white/50">Yetkazish: {order.deliveryLabel}</div>
        )}
        <label className="block space-y-1 pt-1">
          <span className="text-[10px] uppercase tracking-[0.12em] text-white/40">
            3. Qaysi ombordan jo‘natiladi
          </span>
          <select
            value={order.warehouseId || ""}
            disabled={destSaving}
            onChange={(e) => setOrderDestination(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-black/50 px-2.5 py-2.5 text-sm font-medium"
          >
            <option value="">— Ombor tanlang —</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} — {w.city}
                {w.isCentral ? " (markaz)" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="text-[10px] uppercase tracking-[0.14em] text-white/40">4. Mahsulot QR</div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-lf-red transition-all"
          style={{
            width: `${order.progress.total ? (100 * order.progress.picked) / order.progress.total : 0}%`,
          }}
        />
      </div>
      <div className="text-xs text-white/45">
        {order.progress.picked}/{order.progress.total} · mahsulot QR ni skanerlang
      </div>
      <div className="max-h-56 space-y-1.5 overflow-y-auto">
        {order.items.map((i) => (
          <div
            key={i.id}
            className={`rounded-lg px-2.5 py-1.5 text-xs ${
              i.done ? "bg-emerald-500/20 text-emerald-200" : "bg-white/5 text-white/70"
            }`}
          >
            {i.productName} {i.color}/{i.size} · {i.pickedQty}/{i.quantity}
          </div>
        ))}
      </div>
    </div>
  ) : mode === "ORDER" ? (
    <div className="rounded-2xl border border-dashed border-white/15 bg-[#101010] px-4 py-5 text-sm text-white/55">
      Yuqoridan buyurtma tanlang — shu yerda <span className="text-white">manzil va ombor</span> chiqadi.
    </div>
  ) : (
    <div className="rounded-2xl border border-dashed border-white/15 bg-[#101010] px-4 py-6 text-center text-sm text-white/55">
      {meta.hint}
    </div>
  );

  const recentList = (
    <div className="rounded-2xl border border-white/10 bg-[#121212] p-4">
      <h3 className="mb-3 text-sm font-semibold">Oxirgi skanlar</h3>
      <div className="max-h-48 space-y-1.5 overflow-y-auto">
        {recent.length === 0 && <p className="text-xs text-white/40">Hali skan yo‘q</p>}
        {recent.slice(0, 12).map((r) => (
          <div key={r.id} className="truncate rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] text-white/55">
            {r.action} · {r.note || r.order?.orderNumber || r.variant?.product.name || "—"}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="lg:grid lg:min-h-[calc(100vh-7rem)] lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:gap-6">
      <div className="relative min-h-[calc(100dvh-5.5rem)] overflow-hidden bg-black lg:min-h-0 lg:h-full lg:min-h-[560px] lg:rounded-2xl lg:border lg:border-white/10">
        <div className="absolute inset-0">
          {cameraOn ? (
            <div
              ref={scannerRef}
              className="h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#111] px-6 text-center">
              <Camera className="h-10 w-10 text-white/30" />
              <p className="text-sm text-white/50">Kamera o‘chiq</p>
              <p className="max-w-xs text-xs text-white/35">{meta.hint}</p>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setCameraOn(true);
                }}
                className="rounded-xl bg-lf-red px-4 py-2.5 text-sm font-semibold"
              >
                Kamerani yoqish
              </button>
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70 lg:from-black/30 lg:to-black/40" />
        </div>

        <div className="absolute inset-x-0 top-0 z-10 space-y-2 p-3 lg:hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="rounded-full bg-black/55 px-3 py-1 text-[11px] font-semibold backdrop-blur">
              {meta.title}
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setShowKeyboard((v) => !v)}
                className="rounded-full bg-black/55 p-2 backdrop-blur"
                aria-label="Klaviatura"
              >
                <Keyboard className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setCameraOn((v) => !v)}
                className="rounded-full bg-black/55 p-2 backdrop-blur"
                aria-label="Kamera"
              >
                {cameraOn ? <X className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {warehouseSelect}
          {mode === "ORDER" && (
            <select
              value={order?.id || ""}
              onChange={(e) => {
                const id = e.target.value;
                if (!id) {
                  setOrder(null);
                  return;
                }
                const row = openOrders.find((o) => o.id === id);
                if (row) processCode(row.orderNumber);
              }}
              className="w-full rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-xs backdrop-blur"
            >
              <option value="">Buyurtma tanlang</option>
              {openOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.orderNumber} · {o.city}
                </option>
              ))}
            </select>
          )}
          {keyboardRow}
          {alerts}
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10 space-y-2 p-3 pb-4 lg:hidden">
          <div className="rounded-2xl border border-white/10 bg-black/75 p-3 backdrop-blur">
            {mode === "ORDER" && order ? (
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold">{order.orderNumber}</div>
                    <div className="text-[11px] text-white/60">{order.customerName}</div>
                    <div className="mt-1 text-[11px] text-white/80">
                      → {order.city || "—"}
                      {order.address ? `, ${order.address}` : ""}
                    </div>
                  </div>
                  <button type="button" onClick={() => setOrder(null)} className="text-[11px] text-white/45">
                    Yopish
                  </button>
                </div>
                <select
                  value={order.warehouseId || ""}
                  disabled={destSaving}
                  onChange={(e) => setOrderDestination(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-black/60 px-2 py-1.5 text-[11px]"
                >
                  <option value="">Ombor (jo‘natish)</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} — {w.city}
                    </option>
                  ))}
                </select>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-lf-red transition-all"
                    style={{
                      width: `${
                        order.progress.total ? (100 * order.progress.picked) / order.progress.total : 0
                      }%`,
                    }}
                  />
                </div>
                <div className="text-[10px] text-white/45">
                  {order.progress.picked}/{order.progress.total}
                </div>
              </div>
            ) : (
              <p className="text-center text-xs text-white/70">{meta.hint}</p>
            )}
          </div>
        </div>

        <div className="absolute right-3 top-3 z-10 hidden gap-1.5 lg:flex">
          <button
            type="button"
            onClick={() => setCameraOn((v) => !v)}
            className="rounded-full bg-black/60 px-3 py-1.5 text-xs backdrop-blur"
          >
            {cameraOn ? "Kamerani o‘chirish" : "Kamerani yoqish"}
          </button>
        </div>
      </div>

      <aside className="mt-4 hidden flex-col gap-4 lg:mt-0 lg:flex">
        <div className="rounded-2xl border border-white/10 bg-[#121212] p-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">Alohida panel</div>
          <h2 className="mt-1 text-xl font-bold">{meta.title}</h2>
          <p className="mt-1 text-sm text-white/50">{meta.hint}</p>
          <div className="mt-4 space-y-3">
            {orderPicker}
            {warehouseSelect}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowKeyboard((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/5"
              >
                <Keyboard className="h-3.5 w-3.5" />
                {showKeyboard ? "Klaviaturani yashirish" : "Klaviatura"}
              </button>
            </div>
            {keyboardRow}
            {alerts}
          </div>
        </div>

        {orderCard}
        {recentList}
      </aside>
    </div>
  );
}
