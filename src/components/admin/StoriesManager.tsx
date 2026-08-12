"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, Trash2, Upload, Video } from "lucide-react";
import { formatSom } from "@/lib/utils";
import { uploadAdminMedia } from "@/lib/client-upload";

type Product = { id: string; name: string; slug: string; price: number };
type Story = {
  id: string;
  title: string;
  caption: string;
  mediaUrl: string;
  mediaType: string;
  linkLabel: string;
  isPublished: boolean;
  productId: string | null;
  product: { id: string; name: string; slug: string; price: number } | null;
  metaMediaId?: string | null;
  metaPublishedAt?: string | Date | null;
};

async function uploadStoryMedia(file: File, kind: "image" | "video") {
  return uploadAdminMedia(file, kind, "stories");
}

function shareBase() {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export function StoriesManager({
  initialStories,
  products,
}: {
  initialStories: Story[];
  products: Product[];
}) {
  const router = useRouter();
  const [stories, setStories] = useState(initialStories);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [productId, setProductId] = useState("");
  const [linkLabel, setLinkLabel] = useState("Sotib olish");
  const [published, setPublished] = useState(true);

  const productOptions = useMemo(() => products, [products]);

  useEffect(() => {
    setStories(initialStories);
  }, [initialStories]);

  function applyProduct(id: string) {
    setProductId(id);
    const p = productOptions.find((x) => x.id === id);
    if (!p) return;
    if (!title.trim()) setTitle(p.name);
    if (!caption.trim()) {
      setCaption(
        `${p.name} — ${formatSom(p.price)}.\n\n👇 Sotib olish\n\n(Meta Storyda link sticker qo‘lda; sayt previewda tugma ishlaydi)`
      );
    }
  }

  async function onUpload(file: File | null) {
    if (!file) return;
    const isVideo = file.type.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(file.name);
    setBusy(true);
    setMsg("");
    try {
      const url = await uploadStoryMedia(file, isVideo ? "video" : "image");
      setMediaUrl(url);
      setMediaType(isVideo ? "video" : "image");
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
      setMsg(isVideo ? "Story video yuklandi ✓" : "Story rasm yuklandi ✓");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Yuklash xatosi");
    } finally {
      setBusy(false);
    }
  }

  async function createStory() {
    if (!mediaUrl || !title.trim()) {
      setMsg("Sarlavha va rasm/video kerak");
      return;
    }
    if (!productId) {
      setMsg("Story uchun mahsulot tanlang — havola shu modelga ochiladi");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/instagram/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          caption,
          mediaUrl,
          mediaType,
          productId,
          linkLabel: linkLabel || "Sotib olish",
          isPublished: published,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      setStories((s) => [data, ...s]);
      setTitle("");
      setCaption("");
      setMediaUrl("");
      setProductId("");
      setMsg("Story saqlandi ✓ — pastdan havolani nusxalang va Instagram Storyga qo‘ying");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  }

  async function togglePublish(story: Story) {
    const res = await fetch("/api/admin/instagram/stories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: story.id, isPublished: !story.isPublished }),
    });
    const data = await res.json();
    if (res.ok) setStories((list) => list.map((s) => (s.id === story.id ? data : s)));
  }

  async function removeStory(id: string) {
    if (!confirm("Storyni o‘chirasizmi?")) return;
    const res = await fetch(`/api/admin/instagram/stories?id=${id}`, { method: "DELETE" });
    if (res.ok) setStories((list) => list.filter((s) => s.id !== id));
  }

  async function publishStoryToMeta(story: Story) {
    setBusy(true);
    setMsg("Instagram Storyga yuklanmoqda…");
    try {
      const res = await fetch("/api/admin/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "story", id: story.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Publish xatosi");
      setStories((list) =>
        list.map((s) =>
          s.id === story.id
            ? { ...s, metaMediaId: data.mediaId, metaPublishedAt: new Date().toISOString() }
            : s
        )
      );
      setMsg(
        `${data.message || "Story joylandi ✓"}${data.tip ? ` · ${data.tip}` : ""}`
      );
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? `❗ ${e.message}` : "❗ Publish xatosi");
    } finally {
      setBusy(false);
    }
  }

  async function copyText(text: string, ok: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMsg(ok);
    } catch {
      setMsg("Nusxa olinmadi — qo‘lda tanlang: " + text);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-lf-red" />
          <h2 className="font-semibold">Yangi Story (hikoya)</h2>
        </div>
        <p className="text-xs text-white/50">
          Rasm yoki qisqa video yuklang → mahsulot tanlang → saqlang. Keyin «Story havolasi»ni Instagram
          Story sticker / bio link sifatida qo‘ying. Mijoz ochganda to‘g‘ridan mahsulotga tushadi.
        </p>

        {msg && (
          <p className={`text-sm ${msg.startsWith("❗") || msg.includes("kerak") ? "text-rose-400" : "text-emerald-400"}`}>
            {msg}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-lf-red/40 bg-lf-red/10 px-4 py-2.5 text-sm font-semibold text-lf-red">
            <Upload className="h-4 w-4" />
            Rasm yoki video
            <input
              type="file"
              accept="image/*,video/*,.mp4,.webm,.mov,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => onUpload(e.target.files?.[0] || null)}
            />
          </label>
          {mediaUrl && (
            <span className="text-xs text-emerald-400 truncate max-w-[240px]">
              {mediaType === "video" ? "Video" : "Rasm"}: {mediaUrl}
            </span>
          )}
        </div>

        {mediaUrl && mediaType === "image" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl} alt="" className="max-h-56 w-auto rounded-xl object-contain bg-black" />
        )}
        {mediaUrl && mediaType === "video" && (
          <video src={mediaUrl} controls className="max-h-56 w-full rounded-xl bg-black object-contain" />
        )}

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-lf-red">
            Mahsulot (havola uchun)
          </span>
          <select
            value={productId}
            onChange={(e) => applyProduct(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2"
          >
            <option value="">— Model tanlang —</option>
            {productOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {formatSom(p.price)}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-[0.12em] text-white/45">Sarlavha</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2"
            placeholder="Story nomi"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-[0.12em] text-white/45">Matn / caption</span>
          <textarea
            rows={2}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2"
            placeholder="Story ostidagi matn (ixtiyoriy)"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-[0.12em] text-white/45">Havola tugmasi</span>
          <input
            value={linkLabel}
            onChange={(e) => setLinkLabel(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2"
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
          Faol (havola ishlasin)
        </label>

        <button
          type="button"
          disabled={busy}
          onClick={createStory}
          className="rounded-xl bg-lf-red px-5 py-3 text-sm font-semibold disabled:opacity-60"
        >
          {busy ? "Saqlanmoqda..." : "Storyni saqlash"}
        </button>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
        <h2 className="font-semibold">Stories ro‘yxati ({stories.length})</h2>
        {stories.length === 0 && (
          <p className="text-xs text-white/40">Hali Story yo‘q — yuqoridan yarating.</p>
        )}
        {stories.map((s) => (
          <div key={s.id} className="rounded-xl border border-white/5 p-3 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-medium flex items-center gap-2">
                  {s.mediaType === "video" ? <Video className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
                  {s.title}
                </div>
                <div className="text-xs text-white/45">
                  {s.isPublished ? "Faol" : "Yashirin"}
                  {s.metaMediaId ? " · IG ✓" : ""}
                  {s.product ? ` · ${s.product.name}` : ""}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => publishStoryToMeta(s)}
                  className="rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                >
                  {s.metaMediaId ? "IGga qayta joylash" : "Instagramga joylash"}
                </button>
                <button
                  type="button"
                  onClick={() => togglePublish(s)}
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-xs"
                >
                  {s.isPublished ? "Yashirish" : "Faollashtirish"}
                </button>
                <button type="button" onClick={() => removeStory(s.id)} className="rounded-lg bg-white/10 p-2">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {s.mediaType === "video" ? (
              <video src={s.mediaUrl} controls className="max-h-40 w-full rounded-lg bg-black object-contain" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.mediaUrl} alt="" className="max-h-40 w-auto rounded-lg object-contain bg-black" />
            )}

            {s.product && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    copyText(
                      `${shareBase()}/i/${s.product!.slug}`,
                      "Story havolasi nusxalandi — Instagram Storyga qo‘ying"
                    )
                  }
                  className="rounded-lg bg-lf-red/90 px-3 py-1.5 text-[11px] font-semibold"
                >
                  Story havolasi nusxa
                </button>
                <button
                  type="button"
                  onClick={() =>
                    copyText(
                      `${shareBase()}/instagram/story/${s.id}`,
                      "Preview havolasi nusxalandi"
                    )
                  }
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-[11px]"
                >
                  Preview havolasi
                </button>
                <span className="self-center text-[10px] text-white/40">
                  {s.linkLabel} → {s.product.name}
                </span>
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
