"use client";

import { useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import { Camera, Star } from "lucide-react";

export type PublicReview = {
  id: string;
  rating: number;
  text: string;
  photoUrls: string[];
  customerName: string;
  shopReply?: string | null;
  createdAt: string | Date;
};

type Props = {
  productId: string;
  productName: string;
  initialReviews: PublicReview[];
  initialAvg: number | null;
  initialCount: number;
  compact?: boolean;
};

function Stars({
  value,
  onChange,
  size = "md",
}: {
  value: number;
  onChange?: (n: number) => void;
  size?: "sm" | "md";
}) {
  const cls = size === "sm" ? "h-3.5 w-3.5" : "h-6 w-6";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={onChange ? "cursor-pointer" : "cursor-default"}
          aria-label={`${n} yulduz`}
        >
          <Star
            className={`${cls} ${n <= value ? "fill-amber-400 text-amber-400" : "text-lf-border"}`}
          />
        </button>
      ))}
    </div>
  );
}

function maskName(name: string) {
  const t = name.trim();
  if (t.length <= 2) return `${t[0] || "*"}*`;
  return `${t.slice(0, 1)}${"*".repeat(Math.min(3, t.length - 1))}${t.slice(-1)}`;
}

export function ProductReviews({
  productId,
  productName,
  initialReviews,
  initialAvg,
  initialCount,
  compact,
}: Props) {
  const [reviews, setReviews] = useState(initialReviews);
  const [avg, setAvg] = useState(initialAvg);
  const [count, setCount] = useState(initialCount);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const avgLabel = useMemo(() => (avg != null ? avg.toFixed(1) : "—"), [avg]);

  async function uploadPhoto(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/reviews/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Rasm yuklanmadi");
    return data.url as string;
  }

  async function onPickPhotos(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setMsg(null);
    try {
      const next: string[] = [...photos];
      for (const file of Array.from(files).slice(0, 3 - photos.length)) {
        if (!file.type.startsWith("image/")) continue;
        next.push(await uploadPhoto(file));
      }
      setPhotos(next.slice(0, 3));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Rasm xatosi");
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          rating,
          text,
          customerName: name,
          customerPhone: phone || undefined,
          orderNumber: orderNumber || undefined,
          photoUrls: photos,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Yuborilmadi");
      setMsg(
        data.status === "APPROVED"
          ? "Sharh nashr qilindi — rahmat!"
          : "Sharh qabul qilindi. Moderatsiyadan keyin chiqadi."
      );
      setOpen(false);
      setText("");
      setPhotos([]);
      if (data.review && data.status === "APPROVED") {
        setReviews((r) => [data.review, ...r]);
        setCount((c) => c + 1);
        setAvg((a) => {
          if (a == null) return rating;
          return Math.round(((a * count + rating) / (count + 1)) * 10) / 10;
        });
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Xato");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={`mt-3 space-y-3 rounded-3xl border border-lf-border bg-white p-4 shadow-sm ${
        compact ? "" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold">Baholar va sharhlar</h2>
          <div className="mt-1 flex items-center gap-2 text-sm text-lf-muted">
            <Stars value={Math.round(avg || 0)} size="sm" />
            <span className="font-semibold text-lf-text">{avgLabel}</span>
            <span>· {count} sharh</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 rounded-xl bg-lf-red px-3 py-2 text-xs font-bold text-white"
        >
          Baholash
        </button>
      </div>

      {msg && <p className="text-xs font-medium text-lf-red">{msg}</p>}

      {open && (
        <form onSubmit={submit} className="space-y-3 rounded-2xl bg-lf-bg p-3">
          <p className="text-xs text-lf-muted">«{productName}» uchun baho qoldiring</p>
          <Stars value={rating} onChange={setRating} />
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ismingiz"
            className="w-full rounded-xl border border-lf-border bg-white px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Izoh (ixtiyoriy)"
            rows={3}
            className="w-full rounded-xl border border-lf-border bg-white px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="Buyurtma №"
              className="rounded-xl border border-lf-border bg-white px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Telefon"
              className="rounded-xl border border-lf-border bg-white px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2"
            />
          </div>
          <p className="text-[11px] text-lf-muted">
            Buyurtma № + telefon mos kelsa — sharh tezroq tasdiqlanadi.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-lf-border bg-white px-3 py-2 text-xs font-semibold">
              <Camera className="h-3.5 w-3.5" /> Foto ({photos.length}/3)
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => onPickPhotos(e.target.files)}
              />
            </label>
            {photos.map((url) => (
              <span key={url} className="relative h-10 w-10 overflow-hidden rounded-lg">
                <Image src={url} alt="" fill className="object-cover" sizes="40px" />
              </span>
            ))}
          </div>
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="w-full rounded-xl bg-lf-red py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "Yuborilmoqda…" : "Sharhni yuborish"}
          </button>
        </form>
      )}

      <ul className="space-y-3">
        {reviews.length === 0 && (
          <li className="text-sm text-lf-muted">Hali sharh yo‘q — birinchi bo‘ling!</li>
        )}
        {reviews.map((r) => (
          <li key={r.id} className="border-t border-lf-border pt-3 first:border-0 first:pt-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">{maskName(r.customerName)}</span>
              <Stars value={r.rating} size="sm" />
            </div>
            {r.text && <p className="mt-1 text-sm leading-relaxed text-lf-muted">{r.text}</p>}
            {r.photoUrls?.length > 0 && (
              <div className="mt-2 flex gap-1.5 overflow-x-auto">
                {r.photoUrls.map((url) => (
                  <span key={url} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                    <Image src={url} alt="" fill className="object-cover" sizes="64px" />
                  </span>
                ))}
              </div>
            )}
            {r.shopReply && (
              <div className="mt-2 rounded-xl bg-lf-pink/80 px-3 py-2 text-xs text-lf-text">
                <span className="font-semibold text-lf-red">LUXFABRIC: </span>
                {r.shopReply}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
