"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";

export type SavedCardItem = {
  orderNumber: string;
  customerName: string;
};

export function ClearSavedCardsPanel({ cards }: { cards: SavedCardItem[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function clearOne(orderNumber: string) {
    const ok = window.confirm(
      `${orderNumber} kartochkasini «Saqlangan» ro‘yxatidan olib tashlash?\n\nBuyurtma o‘chirilmaydi — faqat saqlangan belgi tozalanadi.`
    );
    if (!ok) return;

    setBusy(orderNumber);
    try {
      const res = await fetch("/api/admin/cards", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || `Xatolik (${res.status})`);
      router.refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "O‘chirish xatosi");
    } finally {
      setBusy(null);
    }
  }

  async function clearAll() {
    const ok = window.confirm(
      "Barcha saqlangan kartochkalarni tozalash?\n\nBuyurtmalar o‘chirilmaydi — faqat «Saqlangan kartochkalar» ro‘yxati bo‘shaydi."
    );
    if (!ok) return;

    setBusy("all");
    try {
      const res = await fetch("/api/admin/cards", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        cleared?: number;
      };
      if (!res.ok) throw new Error(data.error || `Xatolik (${res.status})`);
      window.alert(`Tozalandi: ${data.cleared ?? 0} ta kartochka belgisi.`);
      router.refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Tozalash xatosi");
    } finally {
      setBusy(null);
    }
  }

  if (cards.length === 0) return null;

  return (
    <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-emerald-300">Saqlangan kartochkalar</h2>
        <button
          type="button"
          disabled={busy !== null}
          onClick={clearAll}
          className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-50"
        >
          {busy === "all" ? "Tozalanmoqda…" : "Hammasini o‘chirish"}
        </button>
      </div>
      <p className="mb-3 text-[11px] text-white/45">
        Faqat saqlangan belgi tozalanadi — buyurtmalar va QR o‘z joyida qoladi.
      </p>
      <div className="flex flex-wrap gap-2">
        {cards.map((o) => (
          <div
            key={o.orderNumber}
            className="inline-flex items-center gap-1 rounded-xl border border-emerald-500/20 bg-black/30 pl-3 pr-1 py-1 text-xs"
          >
            <Link href={`/card/${o.orderNumber}`} className="hover:text-emerald-200">
              {o.customerName} · {o.orderNumber}
            </Link>
            <button
              type="button"
              title="Ro‘yxatdan olib tashlash"
              disabled={busy !== null}
              onClick={() => clearOne(o.orderNumber)}
              className="rounded-lg p-1.5 text-rose-300/80 transition hover:bg-rose-500/20 hover:text-rose-200 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
