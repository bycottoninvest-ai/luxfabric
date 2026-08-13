"use client";

import { useEffect, useState } from "react";
import { formatSom } from "@/lib/utils";

type StockLine = {
  stockId: string;
  warehouseId: string;
  variantId: string;
  label: string;
  quantity: number;
  lineValue: number;
};

type RegionCard = {
  id: string;
  code: string;
  nameUz: string;
  regionStock: number;
  regionValue: number;
  warehouses: {
    id: string;
    name: string;
    city: string;
    phone: string | null;
    isCentral: boolean;
    totalStock: number;
    totalValue: number;
    lines: StockLine[];
  }[];
};

function withTotals(r: RegionCard): RegionCard {
  const warehouses = r.warehouses.map((w) => ({
    ...w,
    totalStock: w.lines.reduce((s, x) => s + x.quantity, 0),
    totalValue: w.lines.reduce((s, x) => s + x.lineValue, 0),
  }));
  return {
    ...r,
    warehouses,
    regionStock: warehouses.reduce((s, w) => s + w.totalStock, 0),
    regionValue: warehouses.reduce((s, w) => s + w.totalValue, 0),
  };
}

export function WarehouseManager({ regions }: { regions: RegionCard[] }) {
  const [data, setData] = useState(regions);
  const [openId, setOpenId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  /** qty 0 bo‘lganda ham birlik narx */
  const [unitPrices, setUnitPrices] = useState<Record<string, number>>({});

  // clear-stock / router.refresh() dan keyin server props bilan sinxron
  useEffect(() => {
    setData(regions);
    const map: Record<string, number> = {};
    for (const r of regions) {
      for (const w of r.warehouses) {
        for (const line of w.lines) {
          if (line.quantity > 0) {
            map[`${w.id}:${line.variantId}`] = line.lineValue / line.quantity;
          }
        }
      }
    }
    setUnitPrices((prev) => ({ ...prev, ...map }));
  }, [regions]);

  async function updateStock(item: StockLine, quantity: number) {
    const key = `${item.warehouseId}:${item.variantId}`;
    const unit =
      unitPrices[key] ??
      (item.quantity > 0 ? item.lineValue / item.quantity : 0);

    setSaving(item.variantId + item.warehouseId);
    const res = await fetch("/api/admin/warehouses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        warehouseId: item.warehouseId,
        variantId: item.variantId,
        quantity,
      }),
    });
    setSaving(null);
    if (!res.ok) {
      alert("Saqlashda xatolik");
      return;
    }
    if (unit > 0) {
      setUnitPrices((p) => ({ ...p, [key]: unit }));
    }
    setData((prev) =>
      prev.map((r) =>
        withTotals({
          ...r,
          warehouses: r.warehouses.map((w) =>
            w.id !== item.warehouseId
              ? w
              : {
                  ...w,
                  lines: w.lines.map((s) =>
                    s.variantId === item.variantId
                      ? { ...s, quantity, lineValue: quantity * unit }
                      : s
                  ),
                }
          ),
        })
      )
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {data.map((r) => {
        const w = r.warehouses[0];
        const open = openId === r.id;
        const showLines = (w?.lines ?? []).filter((s) => s.quantity > 0);

        return (
          <div
            key={r.id}
            className={`rounded-xl border p-2.5 ${
              w?.isCentral ? "border-lf-red/40 bg-lf-red/10" : "border-white/10 bg-lf-card"
            }`}
          >
            <button
              type="button"
              onClick={() => setOpenId(open ? null : r.id)}
              className="w-full text-left"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="truncate text-[11px] font-semibold leading-tight">{r.nameUz}</span>
                <span className="text-[10px] text-white/35">{r.code}</span>
              </div>
              <div className="mt-1.5 text-sm font-bold text-lf-red leading-none">
                {formatSom(r.regionValue)}
              </div>
              <div className="mt-0.5 text-[10px] text-lf-muted">
                {r.regionStock.toLocaleString("uz-UZ")} dona
              </div>
            </button>

            {open && w && (
              <div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto border-t border-white/10 pt-2">
                {w.phone && <div className="text-[10px] text-lf-muted">{w.phone}</div>}
                {showLines.length === 0 ? (
                  <div className="text-[10px] text-emerald-400">
                    Qoldiq yo‘q · jami {r.regionStock.toLocaleString("uz-UZ")} dona
                  </div>
                ) : (
                  showLines.map((s) => (
                    <div key={s.variantId} className="rounded-lg bg-black/30 p-1.5">
                      <div className="truncate text-[10px] text-amber-100">{s.label}</div>
                      <div className="mt-0.5 text-[9px] text-white/40">
                        {s.quantity.toLocaleString("uz-UZ")} dona · {formatSom(s.lineValue)}
                      </div>
                      <div className="mt-1 flex gap-1">
                        <input
                          type="number"
                          min={0}
                          key={`${s.warehouseId}-${s.variantId}-${s.quantity}`}
                          defaultValue={s.quantity}
                          className="w-14 rounded border border-white/10 bg-black/40 px-1 py-0.5 text-[11px]"
                          id={`qty-${s.warehouseId}-${s.variantId}`}
                        />
                        <button
                          type="button"
                          disabled={saving === s.variantId + s.warehouseId}
                          className="rounded bg-white/10 px-1.5 text-[10px]"
                          onClick={() => {
                            const el = document.getElementById(
                              `qty-${s.warehouseId}-${s.variantId}`
                            ) as HTMLInputElement | null;
                            updateStock(s, Number(el?.value || 0));
                          }}
                        >
                          OK
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
