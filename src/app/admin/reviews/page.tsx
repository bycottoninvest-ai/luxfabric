"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";

type ReviewRow = {
  id: string;
  rating: number;
  text: string;
  photoUrls: string[];
  customerName: string;
  customerPhone: string | null;
  status: string;
  shopReply: string | null;
  createdAt: string;
  product: { id: string; name: string; slug: string };
  order: { orderNumber: string } | null;
};

export default function AdminReviewsPage() {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [filter, setFilter] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const q = filter ? `?status=${encodeURIComponent(filter)}` : "";
      const res = await fetch(`/api/admin/reviews${q}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Yuklanmadi");
      setRows(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Xato");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(id: string, status: "APPROVED" | "REJECTED") {
    const res = await fetch("/api/admin/reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) void load();
  }

  return (
    <div className="space-y-4 p-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Sharhlar</h1>
        <div className="flex gap-1 rounded-xl bg-white/5 p-1 text-xs">
          {["PENDING", "APPROVED", "REJECTED", ""].map((s) => (
            <button
              key={s || "all"}
              type="button"
              onClick={() => setFilter(s)}
              className={`rounded-lg px-3 py-1.5 font-semibold ${
                filter === s ? "bg-lf-red text-white" : "text-white/70"
              }`}
            >
              {s || "Hammasi"}
            </button>
          ))}
        </div>
      </div>

      {err && <p className="text-sm text-red-300">{err}</p>}
      {loading && <p className="text-sm text-white/60">Yuklanmoqda…</p>}

      <ul className="space-y-3">
        {!loading && rows.length === 0 && (
          <li className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
            Sharh yo‘q
          </li>
        )}
        {rows.map((r) => (
          <li key={r.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <Link
                  href={`/i/${r.product.slug}`}
                  className="font-semibold text-white hover:underline"
                  target="_blank"
                >
                  {r.product.name}
                </Link>
                <div className="mt-1 flex items-center gap-1 text-amber-400">
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" />
                  ))}
                  <span className="ml-2 text-xs text-white/60">{r.customerName}</span>
                </div>
              </div>
              <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/70">
                {r.status}
              </span>
            </div>
            {r.text && <p className="mt-2 text-sm text-white/80">{r.text}</p>}
            {r.shopReply && (
              <p className="mt-2 text-xs text-lf-red/90">AI javob: {r.shopReply}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/50">
              {r.order?.orderNumber && <span>Buyurtma: {r.order.orderNumber}</span>}
              {r.customerPhone && <span>{r.customerPhone}</span>}
              <span>{new Date(r.createdAt).toLocaleString("uz-UZ")}</span>
              {r.photoUrls?.length > 0 && <span>{r.photoUrls.length} foto</span>}
            </div>
            {r.status === "PENDING" && (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setStatus(r.id, "APPROVED")}
                  className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold"
                >
                  Tasdiqlash
                </button>
                <button
                  type="button"
                  onClick={() => setStatus(r.id, "REJECTED")}
                  className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold"
                >
                  Rad etish
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
