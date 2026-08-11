"use client";

import { useState } from "react";
import { formatSom } from "@/lib/utils";

type LowStock = {
  stockId: string;
  warehouseId: string;
  variantId: string;
  label: string;
  quantity: number;
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
    lowStock: LowStock[];
  }[];
};

export function WarehouseManager({ regions }: { regions: RegionCard[] }) {
  const [data, setData] = useState(regions);
  const [openId, setOpenId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  async function updateStock(item: LowStock, quantity: number) {
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
    setData((prev) =>
      prev.map((r) => ({
        ...r,
        warehouses: r.warehouses.map((w) =>
          w.id !== item.warehouseId
            ? w
            : {
                ...w,
                lowStock: w.lowStock.map((s) =>
                  s.variantId === item.variantId ? { ...s, quantity } : s
                ),
              }
        ),
      }))
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {data.map((r) => {
        const w = r.warehouses[0];
        const open = openId === r.id;
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
              <div className="mt-2 space-y-1.5 border-t border-white/10 pt-2">
                {w.phone && <div className="text-[10px] text-lf-muted">{w.phone}</div>}
                {w.lowStock.length === 0 ? (
                  <div className="text-[10px] text-emerald-400">Past qoldiq yo‘q</div>
                ) : (
                  w.lowStock.slice(0, 3).map((s) => (
                    <div key={s.variantId} className="rounded-lg bg-black/30 p-1.5">
                      <div className="truncate text-[10px] text-amber-100">{s.label}</div>
                      <div className="mt-1 flex gap-1">
                        <input
                          type="number"
                          min={0}
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
