"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";

export type WhRow = { name: string; city: string; isCentral: boolean; qty: number };

export type SizeStockLine = {
  variantId: string;
  color: string;
  size: string;
  /** omborId → miqdor */
  byWarehouse: Record<string, number>;
};

export type WarehouseOpt = {
  id: string;
  name: string;
  city: string;
  isCentral: boolean;
};

export function StockByWarehouse({
  total,
  rows,
  sizes,
  warehouses,
}: {
  total: number;
  rows: WhRow[];
  sizes: SizeStockLine[];
  warehouses: WarehouseOpt[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const centralId = warehouses.find((w) => w.isCentral)?.id || warehouses[0]?.id || "";
  const [warehouseId, setWarehouseId] = useState(centralId);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const whId = warehouseId || centralId;

  const orderedSizes = useMemo(() => {
    const order = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"];
    return [...sizes].sort((a, b) => {
      const ai = order.indexOf(a.size);
      const bi = order.indexOf(b.size);
      if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      return a.color.localeCompare(b.color, "uz");
    });
  }, [sizes]);

  function qtyFor(line: SizeStockLine) {
    if (!whId) return 0;
    return line.byWarehouse[whId] ?? 0;
  }

  function draftValue(line: SizeStockLine) {
    const key = `${whId}:${line.variantId}`;
    if (drafts[key] !== undefined) return drafts[key];
    return String(qtyFor(line));
  }

  async function saveLine(line: SizeStockLine) {
    if (!whId) {
      setMsg("Ombor topilmadi");
      return;
    }
    const key = `${whId}:${line.variantId}`;
    const quantity = Math.max(0, Math.floor(Number(drafts[key] ?? qtyFor(line)) || 0));
    setSaving(line.variantId);
    setMsg("");
    try {
      const res = await fetch("/api/admin/warehouses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId: whId,
          variantId: line.variantId,
          quantity,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Saqlash xatosi");
      setDrafts((d) => ({ ...d, [key]: String(quantity) }));
      setMsg(`${line.color}/${line.size}: ${quantity}`);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-white">Jami: {total}</span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
          aria-label={open ? "Yopish" : "O‘lchamlar / omborlar"}
          title="O‘lcham bo‘yicha qoldiq"
        >
          {open ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        </button>
      </div>

      {open && (
        <div className="mt-2 max-w-sm space-y-2 rounded-xl border border-white/10 bg-black/30 p-2">
          {rows.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {rows.map((w) => (
                <span
                  key={`${w.name}-${w.city}`}
                  className={`rounded-lg px-2 py-0.5 text-[10px] ${
                    w.isCentral ? "bg-lf-red/20 text-lf-red" : "bg-white/5 text-white/70"
                  }`}
                >
                  {w.city}: <b className="text-white">{w.qty}</b>
                </span>
              ))}
            </div>
          )}

          {warehouses.length > 0 && (
            <label className="block space-y-0.5">
              <span className="text-[10px] uppercase tracking-wider text-white/40">Ombor</span>
              <select
                value={whId}
                onChange={(e) => {
                  setWarehouseId(e.target.value);
                  setDrafts({});
                  setMsg("");
                }}
                className="w-full rounded-lg border border-white/10 bg-[#0c0c0c] px-2 py-1.5 text-[11px]"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.city}
                    {w.isCentral ? " (markaz)" : ""} — {w.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {orderedSizes.length === 0 ? (
            <p className="text-[11px] text-white/50">Variant yo‘q</p>
          ) : (
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-white/40">
                O‘lcham · son
              </div>
              {orderedSizes.map((line) => {
                const key = `${whId}:${line.variantId}`;
                const label =
                  orderedSizes.some((x) => x.color !== line.color)
                    ? `${line.color} / ${line.size}`
                    : line.size;
                return (
                  <div key={line.variantId} className="flex items-center gap-1.5">
                    <span className="w-20 shrink-0 truncate text-[11px] text-white/80" title={label}>
                      {label}
                    </span>
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={draftValue(line)}
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [key]: e.target.value }))
                      }
                      className="w-16 rounded-md border border-white/10 bg-black/40 px-1.5 py-1 text-[11px] tabular-nums"
                    />
                    <button
                      type="button"
                      disabled={saving === line.variantId || !whId}
                      onClick={() => void saveLine(line)}
                      className="rounded-md bg-white/10 px-2 py-1 text-[10px] font-medium hover:bg-white/15 disabled:opacity-50"
                    >
                      {saving === line.variantId ? "…" : "Saqlash"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {msg && <p className="text-[10px] text-emerald-400/90">{msg}</p>}
        </div>
      )}
    </div>
  );
}
