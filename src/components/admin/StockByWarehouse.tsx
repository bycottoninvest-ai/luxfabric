"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

type WhRow = { name: string; city: string; isCentral: boolean; qty: number };

export function StockByWarehouse({ total, rows }: { total: number; rows: WhRow[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-white">Jami: {total}</span>
        {rows.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
            aria-label={open ? "Yopish" : "Omborlarni ko‘rsatish"}
          >
            {open ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {open && (
        <div className="mt-2 flex max-w-md flex-wrap gap-1.5">
          {rows.map((w) => (
            <span
              key={`${w.name}-${w.city}`}
              className={`rounded-lg px-2 py-1 text-[11px] ${
                w.isCentral ? "bg-lf-red/20 text-lf-red" : "bg-white/5 text-white/70"
              }`}
              title={w.name}
            >
              {w.city}: <b className="text-white">{w.qty}</b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
