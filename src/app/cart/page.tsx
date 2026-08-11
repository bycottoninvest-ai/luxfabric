"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { StoreShell } from "@/components/StoreShell";
import { useCart } from "@/lib/cart";
import { formatSom } from "@/lib/utils";

export default function CartPage() {
  const { items, setQty, removeItem, total } = useCart();
  const sum = total();

  return (
    <StoreShell>
      <h1 className="text-xl font-bold">Savat</h1>
      {items.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-lf-border bg-white p-8 text-center">
          <p className="text-lf-muted">Savat bo‘sh</p>
          <Link href="/catalog" className="mt-4 inline-block font-semibold text-lf-red">
            Katalogga o‘tish
          </Link>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {items.map((item) => (
            <div key={item.variantId} className="flex gap-3 rounded-2xl border border-lf-border bg-white p-3 shadow-sm">
              <div className="relative h-24 w-20 overflow-hidden rounded-xl bg-lf-bg">
                <Image src={item.image} alt={item.name} fill className="object-cover" sizes="80px" />
              </div>
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">{item.name}</div>
                    <div className="mt-1 text-xs text-lf-muted">
                      {item.color} · {item.size}
                    </div>
                  </div>
                  <button type="button" onClick={() => removeItem(item.variantId)} className="text-lf-muted">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-auto flex items-center justify-between">
                  <div className="inline-flex items-center rounded-full border border-lf-border bg-lf-bg">
                    <button type="button" className="p-2" onClick={() => setQty(item.variantId, item.quantity - 1)}>
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-6 text-center text-sm font-semibold">{item.quantity}</span>
                    <button type="button" className="p-2" onClick={() => setQty(item.variantId, item.quantity + 1)}>
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="text-sm font-bold">{formatSom(item.price * item.quantity)}</div>
                </div>
              </div>
            </div>
          ))}

          <div className="rounded-2xl border border-lf-border bg-white p-4 shadow-sm">
            <div className="flex justify-between text-sm text-lf-muted">
              <span>Mahsulotlar</span>
              <span>{formatSom(sum)}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm text-lf-muted">
              <span>Yetkazib berish</span>
              <span>{formatSom(15000)}</span>
            </div>
            <div className="mt-3 flex justify-between border-t border-lf-border pt-3 text-base font-bold">
              <span>Jami</span>
              <span>{formatSom(sum + 15000)}</span>
            </div>
            <Link
              href="/checkout"
              className="mt-4 flex w-full items-center justify-center rounded-2xl bg-lf-red py-3.5 text-sm font-bold text-white"
            >
              Rasmiylashtirish
            </Link>
          </div>
        </div>
      )}
    </StoreShell>
  );
}
