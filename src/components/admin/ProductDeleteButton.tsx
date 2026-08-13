"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";

type Props = {
  productId: string;
  productName: string;
  hasMetaCatalogId: boolean;
};

export function ProductDeleteButton({ productId, productName, hasMetaCatalogId }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    const ok = window.confirm(
      `«${productName}» — O‘chirish? Instagramdan ham o‘chadi\n\n` +
        (hasMetaCatalogId
          ? "LUXFABRIC + Meta katalog (best-effort). Buyurtma bo‘lsa arxivlanadi.\n"
          : "Instagram katalog ID yo‘q — faqat tizimdan o‘chadi.\n") +
        "Bu amalni qaytarib bo‘lmaydi."
    );
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch("/api/admin/products/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ id: productId }),
      });
      const raw = await res.text();
      let data: {
        error?: string;
        ok?: boolean;
        ig?: { note?: string; skipped?: boolean; ok?: boolean; error?: string };
      } = {};
      try {
        data = raw ? (JSON.parse(raw) as typeof data) : {};
      } catch {
        throw new Error(
          res.ok
            ? "Server javobi JSON emas"
            : `O‘chirish xatosi (${res.status}): ${raw.slice(0, 180) || res.statusText}`
        );
      }
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : `O‘chirish xatosi (${res.status})`
        );
      }

      const igNote = data.ig?.note || data.ig?.error;
      if (igNote && (data.ig?.skipped || data.ig?.ok === false)) {
        window.alert(`O‘chirildi.\n\nInstagram: ${igNote}`);
      }
      router.refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "O‘chirish xatosi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={onDelete}
      title="O‘chirish"
      className="rounded-lg border border-white/10 bg-white/5 p-2 text-rose-300 hover:bg-rose-500/15 hover:text-rose-200 disabled:opacity-50"
    >
      <Trash2 className={`h-4 w-4 ${busy ? "animate-pulse" : ""}`} />
      <span className="sr-only">{busy ? "O‘chirilmoqda…" : "O‘chirish"}</span>
    </button>
  );
}
