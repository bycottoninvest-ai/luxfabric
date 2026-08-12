"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  MessageCircle,
  Music2,
  PanelLeft,
  Pencil,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import { formatSom } from "@/lib/utils";
import { uploadAdminMedia } from "@/lib/client-upload";
import { productBuyUrl } from "@/lib/ig-caption";

const PUBLIC_ORIGIN = "https://www.luxfabricshop.uz";

type Product = { id: string; name: string; slug: string; price: number };
type MusicTrack = {
  id: string;
  title: string;
  artist: string;
  fileUrl: string;
  _count?: { reels: number };
};
type Reel = {
  id: string;
  title: string;
  caption: string;
  videoUrl: string;
  coverUrl: string | null;
  buyButtonLabel: string;
  showBuyButton: boolean;
  isPublished: boolean;
  audioEmbedded?: boolean;
  metaMediaId?: string | null;
  metaPublishedAt?: string | Date | null;
  musicId: string | null;
  productId: string | null;
  music: MusicTrack | null;
  product: { id: string; name: string; slug: string; price: number } | null;
  muxNote?: string | null;
};
type IgComment = {
  id: string;
  commentId: string;
  username: string;
  text: string;
  postedAt?: string | Date | null;
  createdAt?: string | Date;
  ourReplyText?: string | null;
  repliedAt?: string | Date | null;
};
type DetailTab = "edit" | "comments";

function formatCommentTime(value?: string | Date | null) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("uz-UZ", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

async function uploadFile(file: File, kind: "video" | "audio" | "image") {
  return uploadAdminMedia(file, kind);
}

function normalizeMusicText(s: string) {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Mahsulot nomiga yaqin trek; bo‘lmasa eng yangisi (ro‘yxat newest-first). */
function pickMusicId(tracks: MusicTrack[], productName?: string): string | null {
  if (!tracks.length) return null;
  if (productName) {
    const name = normalizeMusicText(productName);
    const words = name.split(/\s+/).filter((w) => w.length >= 3);
    const match = tracks.find((t) => {
      const title = normalizeMusicText(t.title);
      const artist = normalizeMusicText(t.artist);
      if (name && (title.includes(name) || name.includes(title))) return true;
      return words.some((w) => title.includes(w) || artist.includes(w));
    });
    if (match) return match.id;
  }
  return tracks[0]?.id ?? null;
}

export function ReelsManager({
  initialReels,
  initialMusic,
  products,
}: {
  initialReels: Reel[];
  initialMusic: MusicTrack[];
  products: Product[];
}) {
  const router = useRouter();
  const [reels, setReels] = useState(initialReels);
  const [music, setMusic] = useState(initialMusic);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [chatgpt, setChatgpt] = useState<{ configured: boolean; model: string | null } | null>(null);
  const [publishOk, setPublishOk] = useState<{
    reelTitle: string;
    buyUrl?: string;
    firstCommentOk?: boolean;
    firstCommentError?: string;
    message: string;
  } | null>(null);

  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [musicId, setMusicId] = useState("");
  const [productId, setProductId] = useState("");
  const [buyLabel, setBuyLabel] = useState("Sotib olish");
  const [showBuy, setShowBuy] = useState(true);
  const [published, setPublished] = useState(true);

  const [musicTitle, setMusicTitle] = useState("");
  const [musicArtist, setMusicArtist] = useState("LUXFABRIC");
  const [musicUrl, setMusicUrl] = useState("");

  /** Yon panel — mavjud Reelni tahrirlash + izohlar */
  const [editing, setEditing] = useState<Reel | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("edit");
  const [editTitle, setEditTitle] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [editMusicId, setEditMusicId] = useState("");
  const [editProductId, setEditProductId] = useState("");
  const [editBuyLabel, setEditBuyLabel] = useState("Sotib olish");
  const [editShowBuy, setEditShowBuy] = useState(true);
  const [editPublished, setEditPublished] = useState(true);
  const [editCoverUrl, setEditCoverUrl] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [editMsg, setEditMsg] = useState("");

  /** Chap arxiv paneli — barcha saqlangan/joylangan Reels */
  const [archiveOpen, setArchiveOpen] = useState(true);
  const [comments, setComments] = useState<IgComment[]>([]);
  const [commentsMsg, setCommentsMsg] = useState("");
  const [commentsBusy, setCommentsBusy] = useState(false);
  const [replyBusyId, setReplyBusyId] = useState<string | null>(null);

  const productOptions = useMemo(() => products, [products]);
  const musicTracks = useMemo(() => music, [music]);

  useEffect(() => {
    setMusic(initialMusic);
  }, [initialMusic]);

  useEffect(() => {
    setReels(initialReels);
  }, [initialReels]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/ai/caption")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.ok) return;
        setChatgpt({
          configured: Boolean(data.configured),
          model: data.model ? String(data.model) : null,
        });
      })
      .catch(() => {
        if (!cancelled) setChatgpt({ configured: false, model: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function copyText(text: string, okMsg: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMsg(okMsg);
    } catch {
      setMsg(text);
    }
  }

  function shareBase() {
    return PUBLIC_ORIGIN;
  }

  /** Mahsulot/AI matn uchun treklarni avtomatik tanlaydi. */
  function autoSelectMusic(forProductId?: string, opts?: { silent?: boolean }): string | null {
    const id = forProductId || productId;
    const product = id ? productOptions.find((x) => x.id === id) : undefined;
    const picked = pickMusicId(musicTracks, product?.name);
    if (!picked) {
      if (!opts?.silent) {
        setMsg(
          "❗ Musiqa kutubxonasi bo‘sh. Avval «Musiqa kutubxonasi»ga MP3 yuklang — keyin Reelga avtomatik qo‘shiladi."
        );
      }
      return null;
    }
    setMusicId(picked);
    if (!opts?.silent) {
      const track = musicTracks.find((m) => m.id === picked);
      if (track) setMsg(`Musiqa tanlandi ✓ · ${track.title}`);
    }
    return picked;
  }

  async function generateCaption(forProductId?: string) {
    const id = forProductId || productId;
    if (!id) {
      setMsg("❗ Avval pastdagi «Mahsulot» dan modelni tanlang — keyin matn yoziladi");
      return;
    }
    setAiBusy(true);
    setMsg("");
    const musicPicked = autoSelectMusic(id, { silent: true });
    try {
      const res = await fetch("/api/admin/ai/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI xatosi");
      if (data.title) setTitle(data.title);
      if (data.caption) setCaption(data.caption);
      if (typeof data.configured === "boolean") {
        setChatgpt({
          configured: data.configured,
          model: data.model ? String(data.model) : null,
        });
      }
      // API suggestedMusicId bo‘lsa — faqat hali tanlanmagan bo‘lsa
      if (data.suggestedMusicId && typeof data.suggestedMusicId === "string") {
        const exists = musicTracks.some((m) => m.id === data.suggestedMusicId);
        if (exists) setMusicId(data.suggestedMusicId);
      }
      if (!musicTracks.length) {
        setMsg(
          "❗ Musiqa kutubxonasi bo‘sh. Avval «Musiqa kutubxonasi»ga MP3 yuklang — keyin Reelga avtomatik qo‘shiladi. Matn esa tayyor."
        );
      } else {
        const track = musicTracks.find((m) => m.id === (musicPicked || musicId));
        const musicNote = track ? ` · musiqa: ${track.title}` : " · musiqa tanlandi";
        setMsg(
          data.source === "openai"
            ? `ChatGPT matn yozdi ✓${data.model ? ` (${data.model})` : ""}${musicNote}`
            : `Matn yozildi ✓ (shablon). To‘liq ChatGPT uchun .env ga OPENAI_API_KEY qo‘ying va npm run dev ni qayta ishga tushiring${musicNote}`
        );
      }
    } catch (e) {
      // Lokal zaxira — API ishlamasa ham yozadi
      const p = productOptions.find((x) => x.id === id);
      if (p) {
        setTitle(`${p.name} · yangi`);
        setCaption(
          `${p.name} — ${formatSom(p.price)}.\n\n👇 Sotib olish\n\n(Havola Instagramga joylashda avtomatik qo‘shiladi)`
        );
        setMsg("Matn yozildi ✓ (lokal). Server xatosi: " + (e instanceof Error ? e.message : ""));
      } else {
        setMsg(e instanceof Error ? e.message : "AI xatosi");
      }
    } finally {
      setAiBusy(false);
    }
  }

  async function onUploadVideo(file: File | null) {
    if (!file) return;
    setBusy(true);
    setMsg("");
    try {
      const url = await uploadFile(file, "video");
      setVideoUrl(url);
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
      setMsg("Video yuklandi ✓");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Video xatosi");
    } finally {
      setBusy(false);
    }
  }

  async function addMusicToLibrary(fileUrl: string, title: string, artist: string) {
    const res = await fetch("/api/admin/instagram/music", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim().slice(0, 80) || "Track",
        artist: artist.trim() || "LUXFABRIC",
        fileUrl,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Kutubxonaga yozilmadi");
    setMusic((m) => [data, ...m]);
    setMusicId(data.id);
    setMusicTitle("");
    setMusicUrl("");
    return data as MusicTrack;
  }

  /** MP3 tanlanganda darhol kutubxonaga yoziladi va Reel uchun tanlanadi (2-bosqich kerak emas). */
  async function onUploadMusic(file: File | null) {
    if (!file) return;
    setBusy(true);
    setMsg("");
    try {
      const url = await uploadFile(file, "audio");
      const title = (musicTitle.trim() || file.name.replace(/\.[^.]+$/, "")).slice(0, 80);
      const artist = musicArtist.trim() || "LUXFABRIC";
      setMusicUrl(url);
      setMusicTitle(title);
      const track = await addMusicToLibrary(url, title, artist);
      setMsg(`Musiqa kutubxonaga qo‘shildi ✓ (${track.title}) — yangi Reelga avtomatik tanlandi`);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Musiqa xatosi");
    } finally {
      setBusy(false);
    }
  }

  async function saveMusic() {
    if (!musicUrl || !musicTitle.trim()) {
      setMsg("Avval «Kompyuterdan musiqa» bilan MP3 tanlang (yoki nomni to‘ldiring)");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const track = await addMusicToLibrary(musicUrl, musicTitle, musicArtist);
      setMsg(`Musiqa kutubxonaga qo‘shildi ✓ (${track.title})`);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  }

  async function createReel() {
    if (!videoUrl || !title.trim()) {
      setMsg("Reel sarlavhasi va video kerak");
      return;
    }
    if (showBuy && !productId) {
      setMsg("«Sotib olish» uchun mahsulot tanlang yoki tugmani o‘chiring");
      return;
    }
    let resolvedMusicId = musicId;
    if (!resolvedMusicId && musicTracks.length) {
      resolvedMusicId = pickMusicId(musicTracks, productOptions.find((p) => p.id === productId)?.name) || "";
      if (resolvedMusicId) setMusicId(resolvedMusicId);
    }
    setBusy(true);
    setMsg(
      resolvedMusicId
        ? "Video + musiqa birlashtirilmoqda… (bir necha soniya)"
        : "Reel saqlanmoqda…"
    );
    try {
      const res = await fetch("/api/admin/instagram/reels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          caption,
          videoUrl,
          musicId: resolvedMusicId || null,
          productId: showBuy ? productId || null : null,
          buyButtonLabel: buyLabel || "Sotib olish",
          showBuyButton: showBuy,
          isPublished: published,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      setReels((r) => [data, ...r]);
      setTitle("");
      setCaption("");
      setVideoUrl("");
      setMusicId("");
      const mux = typeof data.muxNote === "string" ? ` · ${data.muxNote}` : "";
      setMsg(`Reel yaratildi ✓ — /instagram da chiqadi${mux}`);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  }

  async function remuxReel(reel: Reel) {
    if (!reel.musicId) {
      setMsg("Bu Reelda musiqa yo‘q");
      return;
    }
    setBusy(true);
    setMsg("Musiqa qayta birlashtirilmoqda…");
    try {
      const res = await fetch("/api/admin/instagram/reels", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reel.id, remux: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      setReels((list) => list.map((r) => (r.id === reel.id ? data : r)));
      setMsg("Musiqa videoga birlashtirildi ✓");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Birlashtirish xatosi");
    } finally {
      setBusy(false);
    }
  }

  async function publishReelToMeta(reel: Reel) {
    setBusy(true);
    setPublishOk(null);
    setMsg("Instagramga yuklanmoqda… (Meta video tayyorlaydi, 30–90 soniya + izoh)");
    try {
      const res = await fetch("/api/admin/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "reel", id: reel.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Publish xatosi");
      setReels((list) =>
        list.map((r) =>
          r.id === reel.id
            ? { ...r, metaMediaId: data.mediaId, metaPublishedAt: new Date().toISOString() }
            : r
        )
      );
      const buyUrl =
        (typeof data.buyUrl === "string" && data.buyUrl) ||
        (reel.product ? productBuyUrl(PUBLIC_ORIGIN, reel.product.slug) : undefined);
      setPublishOk({
        reelTitle: reel.title,
        buyUrl,
        firstCommentOk: Boolean(data.firstComment?.ok),
        firstCommentError: data.firstComment?.error,
        message: data.message || "Reel Instagramga joylandi ✓",
      });
      setMsg(data.message || "Reel Instagramga joylandi ✓");
      router.refresh();
    } catch (e) {
      setPublishOk(null);
      setMsg(e instanceof Error ? `❗ ${e.message}` : "❗ Publish xatosi");
    } finally {
      setBusy(false);
    }
  }

  async function loadComments(reelId: string, opts?: { silent?: boolean }) {
    if (!opts?.silent) {
      setCommentsBusy(true);
      setCommentsMsg("");
    }
    try {
      const res = await fetch(`/api/admin/instagram/comments?reelId=${encodeURIComponent(reelId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Izohlar xatosi");
      setComments(Array.isArray(data.comments) ? data.comments : []);
      if (!data.published) {
        setCommentsMsg(data.message || "Hali IGga joylanmagan — izohlar yo‘q");
      } else if (!opts?.silent) {
        setCommentsMsg(
          data.comments?.length
            ? `${data.comments.length} izoh`
            : "Izohlar bo‘sh — «Izohlarni yangilash» yoki webhook kutilsin"
        );
      }
    } catch (e) {
      setComments([]);
      setCommentsMsg(e instanceof Error ? `❗ ${e.message}` : "❗ Izohlar xatosi");
    } finally {
      if (!opts?.silent) setCommentsBusy(false);
    }
  }

  async function syncComments() {
    if (!editing) return;
    setCommentsBusy(true);
    setCommentsMsg("Graph dan yuklanmoqda…");
    try {
      const res = await fetch("/api/admin/instagram/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync", reelId: editing.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync xatosi");
      setComments(Array.isArray(data.comments) ? data.comments : []);
      setCommentsMsg(data.message || "Yangilandi ✓");
    } catch (e) {
      setCommentsMsg(e instanceof Error ? `❗ ${e.message}` : "❗ Sync xatosi");
    } finally {
      setCommentsBusy(false);
    }
  }

  async function aiReplyComment(commentId: string) {
    if (!editing) return;
    setReplyBusyId(commentId);
    setCommentsMsg("");
    try {
      const res = await fetch("/api/admin/instagram/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply",
          reelId: editing.id,
          commentId,
          useAi: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Javob xatosi");
      if (data.comment) {
        setComments((list) =>
          list.map((c) => (c.commentId === commentId ? { ...c, ...data.comment } : c))
        );
      }
      setCommentsMsg(
        data.source === "openai"
          ? "AI javob Instagramga yuborildi ✓ (ChatGPT)"
          : "Javob yuborildi ✓ (shablon — OPENAI_API_KEY ixtiyoriy)"
      );
    } catch (e) {
      setCommentsMsg(e instanceof Error ? `❗ ${e.message}` : "❗ Javob xatosi");
    } finally {
      setReplyBusyId(null);
    }
  }

  function openEdit(reel: Reel, tab: DetailTab = "edit") {
    setEditing(reel);
    setDetailTab(tab);
    setEditTitle(reel.title);
    setEditCaption(reel.caption || "");
    setEditMusicId(reel.musicId || "");
    setEditProductId(reel.productId || "");
    setEditBuyLabel(reel.buyButtonLabel || "Sotib olish");
    setEditShowBuy(reel.showBuyButton);
    setEditPublished(reel.isPublished);
    setEditCoverUrl(reel.coverUrl || "");
    setEditMsg("");
    setComments([]);
    setCommentsMsg("");
    void loadComments(reel.id);
  }

  function closeEdit() {
    if (editBusy || commentsBusy || replyBusyId) return;
    setEditing(null);
    setEditMsg("");
    setComments([]);
    setCommentsMsg("");
    setDetailTab("edit");
  }

  async function onEditCover(file: File | null) {
    if (!file) return;
    setEditBusy(true);
    setEditMsg("");
    try {
      const url = await uploadFile(file, "image");
      setEditCoverUrl(url);
      setEditMsg("Muqova yuklandi ✓");
    } catch (e) {
      setEditMsg(e instanceof Error ? `❗ ${e.message}` : "❗ Muqova xatosi");
    } finally {
      setEditBusy(false);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    if (!editTitle.trim()) {
      setEditMsg("❗ Sarlavha kerak");
      return;
    }
    if (editShowBuy && !editProductId) {
      setEditMsg("❗ «Sotib olish» uchun mahsulot tanlang yoki tugmani o‘chiring");
      return;
    }
    const musicChanged = (editMusicId || null) !== (editing.musicId || null);
    setEditBusy(true);
    setEditMsg(musicChanged ? "Saqlanmoqda + musiqa birlashtirilmoqda…" : "Saqlanmoqda…");
    try {
      const res = await fetch("/api/admin/instagram/reels", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.id,
          title: editTitle.trim(),
          caption: editCaption,
          musicId: editMusicId || null,
          productId: editShowBuy ? editProductId || null : null,
          buyButtonLabel: editBuyLabel || "Sotib olish",
          showBuyButton: editShowBuy,
          isPublished: editPublished,
          coverUrl: editCoverUrl || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Saqlash xatosi");
      setReels((list) => list.map((r) => (r.id === editing.id ? data : r)));
      const mux = typeof data.muxNote === "string" ? ` · ${data.muxNote}` : "";
      setMsg(`Reel yangilandi ✓${mux}`);
      setEditing(null);
      setEditMsg("");
      router.refresh();
    } catch (e) {
      setEditMsg(e instanceof Error ? `❗ ${e.message}` : "❗ Saqlash xatosi");
    } finally {
      setEditBusy(false);
    }
  }

  async function togglePublish(reel: Reel) {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/instagram/reels", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reel.id, isPublished: !reel.isPublished }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      setReels((list) => list.map((r) => (r.id === reel.id ? data : r)));
      setMsg(data.isPublished ? "Reel ko‘rsatiladi ✓" : "Reel yashirildi ✓");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? `❗ ${e.message}` : "❗ Xatolik");
    } finally {
      setBusy(false);
    }
  }

  async function removeReel(reel: Reel) {
    const ok = confirm(
      `«${reel.title}» Reelni butunlay o‘chirasizmi?\n\nBu amalni qaytarib bo‘lmaydi. Faqat saytdan yashirish uchun «Yashirish»ni bosing.`
    );
    if (!ok) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/instagram/reels?id=${encodeURIComponent(reel.id)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "O‘chirish xatosi");
      setReels((list) => list.filter((r) => r.id !== reel.id));
      if (editing?.id === reel.id) {
        setEditing(null);
        setComments([]);
      }
      setMsg("Reel o‘chirildi ✓");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? `❗ ${e.message}` : "❗ O‘chirish xatosi");
    } finally {
      setBusy(false);
    }
  }

  async function removeMusic(id: string) {
    if (!confirm("Musiani o‘chirasizmi?")) return;
    const res = await fetch(`/api/admin/instagram/music?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setMusic((list) => list.filter((m) => m.id !== id));
      if (musicId === id) setMusicId("");
    }
  }

  return (
    <div className="flex gap-4">
      {/* Chap arxiv — barcha Reels doim saqlangan */}
      <aside
        className={`${
          archiveOpen ? "flex" : "hidden lg:flex"
        } w-full max-w-[220px] shrink-0 flex-col rounded-2xl border border-white/10 bg-white/5 lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)]`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.1em] text-white/50">
              Reels arxiv
            </div>
            <div className="text-[11px] text-white/40">{reels.length} ta</div>
          </div>
          <button
            type="button"
            className="rounded-lg bg-white/10 p-1.5 lg:hidden"
            onClick={() => setArchiveOpen(false)}
            aria-label="Arxivni yopish"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto p-2">
          {reels.length === 0 && (
            <p className="px-2 py-4 text-[11px] text-white/40">Hali Reel yo‘q</p>
          )}
          {reels.map((r) => {
            const active = editing?.id === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => openEdit(r, "comments")}
                className={`flex w-full gap-2 rounded-xl px-2 py-2 text-left transition ${
                  active
                    ? "bg-lf-red/20 ring-1 ring-lf-red/50"
                    : "hover:bg-white/8"
                }`}
              >
                <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-black">
                  {r.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.coverUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <video
                      src={r.videoUrl}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-white">{r.title}</div>
                  <div className="truncate text-[10px] text-white/45">
                    {r.product?.name || "Mahsulotsiz"}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-1 text-[9px]">
                    <span
                      className={
                        r.isPublished ? "text-emerald-400/90" : "text-amber-300/80"
                      }
                    >
                      {r.isPublished ? "Nashr" : "Qoralama"}
                    </span>
                    {r.metaMediaId && <span className="text-pink-300/90">· IG ✓</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setArchiveOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold lg:hidden"
        >
          <PanelLeft className="h-3.5 w-3.5" />
          Reels arxiv ({reels.length})
        </button>
        <p className="text-[11px] text-white/45">
          Chapdagi arxivdan Reelni oching — tahrir + Instagram izohlari. AI javob Meta/DM da
          yoqiladi.
        </p>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Music2 className="h-4 w-4 text-lf-red" />
          <h2 className="font-semibold">Musiqa kutubxonasi</h2>
        </div>
        <p className="text-xs text-white/50">
          MP3/M4A tanlang — bir zumda kutubxonaga tushadi va Reel uchun tanlanadi. Nom/ijrochini oldindan yozishingiz mumkin.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-[0.12em] text-white/45">Nomi</span>
            <input
              value={musicTitle}
              onChange={(e) => setMusicTitle(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2"
              placeholder="Track nomi"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-[0.12em] text-white/45">Ijrochi</span>
            <input
              value={musicArtist}
              onChange={(e) => setMusicArtist(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/20 bg-black/30 px-4 py-2.5 text-sm">
            <Upload className="h-4 w-4" />
            Kompyuterdan musiqa
            <input
              type="file"
              accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg"
              className="hidden"
              onChange={(e) => onUploadMusic(e.target.files?.[0] || null)}
            />
          </label>
          {musicUrl && (
            <span className="text-xs text-amber-300/90 truncate max-w-[220px]">
              Fayl tayyor, kutubxonaga yozilmoqda… {musicUrl}
            </span>
          )}
          {musicUrl && (
            <button
              type="button"
              disabled={busy}
              onClick={saveMusic}
              className="rounded-xl bg-lf-red px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Kutubxonaga qo‘shish
            </button>
          )}
        </div>
        <div className="space-y-2">
          {music.length === 0 && (
            <p className="text-xs text-amber-300/80">
              Hali musiqa yo‘q — «Kompyuterdan musiqa» bilan MP3 tanlang (avtomatik qo‘shiladi).
            </p>
          )}
          {music.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 px-3 py-2 text-sm">
              <div>
                <div className="font-medium">{m.title}</div>
                <div className="text-xs text-white/45">{m.artist}</div>
                <audio controls src={m.fileUrl} className="mt-1 h-8 max-w-full" />
              </div>
              <button type="button" onClick={() => removeMusic(m.id)} className="rounded-lg bg-white/10 p-2">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-lf-red" />
          <h2 className="font-semibold">Yangi Reel</h2>
        </div>
        <p className="text-xs text-white/50">
          1) Video yuklang → 2) Mahsulot tanlang — matn va musiqa avtomatik. Saqlashda musiqa videoga birlashtiriladi.
        </p>
        {chatgpt && (
          <p
            className={`text-[11px] ${
              chatgpt.configured ? "text-emerald-400/90" : "text-white/55"
            }`}
          >
            {chatgpt.configured
              ? `ChatGPT ulangan${chatgpt.model ? ` · ${chatgpt.model}` : ""} — AI matn tayyor`
              : "Shablon matn ishlaydi (kalit shart emas). To‘liq ChatGPT uchun .env ga OPENAI_API_KEY qo‘ying va npm run dev ni qayta ishga tushiring."}
          </p>
        )}
        {msg && (
          <p className={`text-sm ${msg.startsWith("❗") ? "text-rose-400" : "text-emerald-400"}`}>
            {msg}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-lf-red/40 bg-lf-red/10 px-4 py-2.5 text-sm font-semibold text-lf-red">
            <Upload className="h-4 w-4" />
            Kompyuterdan video
            <input
              type="file"
              accept="video/*,.mp4,.webm,.mov"
              className="hidden"
              onChange={(e) => onUploadVideo(e.target.files?.[0] || null)}
            />
          </label>
          {videoUrl && <span className="text-xs text-emerald-400 truncate max-w-[240px]">{videoUrl}</span>}
        </div>
        {videoUrl && (
          <video src={videoUrl} controls className="max-h-56 w-full rounded-xl bg-black object-contain" />
        )}

        <div className="rounded-xl border border-lf-red/30 bg-lf-red/10 p-3 space-y-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-lf-red">
              1. Avval mahsulotni tanlang (Sotib olish → /i/slug)
            </span>
            <select
              value={productId}
              onChange={(e) => {
                const id = e.target.value;
                setProductId(id);
                setShowBuy(true);
                if (id) void generateCaption(id);
              }}
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
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={aiBusy}
              onClick={() => generateCaption()}
              className="flex-1 rounded-xl bg-lf-red px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {aiBusy ? "Yozilmoqda..." : "2. AI matn yozish"}
            </button>
            <button
              type="button"
              disabled={!musicTracks.length}
              onClick={() => autoSelectMusic()}
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm font-medium disabled:opacity-40"
              title={
                musicTracks.length
                  ? "Mahsulot nomiga yaqin yoki eng yangi trekni tanlash"
                  : "Avval musiqa kutubxonasiga MP3 yuklang"
              }
            >
              Musiqani avto tanlash
            </button>
          </div>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-[0.12em] text-white/45">Sarlavha</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2"
            placeholder="Mahsulot tanlanganda o‘zi yoziladi"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-[0.12em] text-white/45">Caption</span>
          <textarea
            rows={3}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2"
            placeholder="Mahsulot tanlanganda o‘zi yoziladi"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-[0.12em] text-white/45">Musiqa</span>
          <select
            value={musicId}
            onChange={(e) => setMusicId(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2"
          >
            <option value="">
              {musicTracks.length ? "Avtomatik (saqlashda tanlanadi)" : "Musiqa yo‘q — kutubxonaga yuklang"}
            </option>
            {musicTracks.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title} — {m.artist}
              </option>
            ))}
          </select>
          {!musicTracks.length && (
            <p className="text-[11px] text-amber-300/80">
              Reel uchun musiqa kerak: yuqoridagi «Musiqa kutubxonasi»ga MP3 yuklang.
            </p>
          )}
        </label>

        <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showBuy} onChange={(e) => setShowBuy(e.target.checked)} />
            «Sotib olish» (sayt /instagram qizil tugma + caption + birinchi izoh)
          </label>
          {showBuy && (
            <div className="space-y-2">
              <p className="text-[11px] leading-relaxed text-white/50">
                Instagram ilovasida qizil overlay tugma Meta tomonidan yopiq. Admin orqali joylasangiz:
                captionda CTA + avtomatik birinchi izoh (havola). Telefondan qo‘lda joylasangiz — kod
                ishlamaydi.
              </p>
              {!productId && (
                <p className="text-[11px] text-amber-300/90">
                  Mahsulot tanlanmagan — yuqoridan modelni tanlang.
                </p>
              )}
              <label className="block space-y-1.5">
                <span className="text-xs uppercase tracking-[0.12em] text-white/45">Tugma / izoh matni</span>
                <input
                  value={buyLabel}
                  onChange={(e) => setBuyLabel(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2"
                  placeholder="Sotib olish"
                />
              </label>
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
          Darhol nashr qilish (/instagram da ko‘rinsin)
        </label>

        <button
          type="button"
          disabled={busy}
          onClick={createReel}
          className="rounded-xl bg-lf-red px-5 py-3 text-sm font-semibold disabled:opacity-60"
        >
          {busy ? "Birlashtirilmoqda / saqlanmoqda..." : "Reelni saqlash (video + musiqa)"}
        </button>
      </section>

      {publishOk && (
        <section className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-semibold text-emerald-200">Instagramga joylandi ✓</h2>
              <p className="mt-1 text-sm text-white/85">{publishOk.reelTitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setPublishOk(null)}
              className="rounded-lg bg-white/10 px-2 py-1 text-[11px] text-white/70"
            >
              Yopish
            </button>
          </div>
          <p className="rounded-xl bg-black/30 px-3 py-2 text-sm font-medium text-white">
            Caption + birinchi izohda Sotib olish linki chiqadi
          </p>
          <ul className="space-y-1 text-xs text-white/70">
            <li>
              Birinchi izoh:{" "}
              {publishOk.firstCommentOk ? (
                <span className="text-emerald-300">✓ yozildi — IGda «Izohlar»ni oching</span>
              ) : publishOk.firstCommentError ? (
                <span className="text-amber-300">❗ {publishOk.firstCommentError}</span>
              ) : (
                <span className="text-white/45">mahsulot bog‘lanmagan</span>
              )}
            </li>
            <li className="text-white/55">{publishOk.message}</li>
          </ul>
          {publishOk.buyUrl && (
            <div className="space-y-1.5">
              <div className="text-xs text-white/45">Mahsulot URL (nusxa → Story / DM / bio)</div>
              <div className="flex flex-wrap items-center gap-2">
                <code className="max-w-full flex-1 break-all rounded-lg bg-black/40 px-2.5 py-2 text-[11px] text-emerald-100">
                  {publishOk.buyUrl}
                </code>
                <button
                  type="button"
                  onClick={() => copyText(publishOk.buyUrl!, "Mahsulot URL nusxalandi ✓")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-lf-red px-3 py-2 text-xs font-semibold"
                >
                  <Copy className="h-3.5 w-3.5" /> Nusxa
                </button>
              </div>
            </div>
          )}
          <p className="text-[11px] text-white/45">
            Mijoz oqimi: link → o‘lcham → Sotib olish. IG appda qizil overlay yo‘q — bu Meta cheklovi.
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
        <h2 className="font-semibold">Reels ro‘yxati ({reels.length})</h2>
        {reels.length === 0 && <p className="text-xs text-white/40">Hali Reel yo‘q — yuqoridan yarating.</p>}
        {reels.map((r) => (
          <div key={r.id} className="rounded-xl border border-white/5 p-3 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-medium">{r.title}</div>
                <div className="text-xs text-white/45">
                  {r.isPublished ? "Nashr qilingan" : "Qoralama"}
                  {r.music ? ` · ${r.music.title}` : ""}
                  {r.audioEmbedded ? " · musiqa videoda ✓" : r.music ? " · musiqa alohida" : ""}
                  {r.metaMediaId ? " · IG ✓" : ""}
                  {r.product ? ` · ${r.product.name}` : ""}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || editBusy}
                  onClick={() => openEdit(r, "edit")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/15 disabled:opacity-50"
                  title="Caption, mahsulot, musiqa va tugmani tahrirlash"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Tahrirlash
                </button>
                <button
                  type="button"
                  disabled={busy || editBusy}
                  onClick={() => openEdit(r, "comments")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-pink-500/30 bg-pink-500/15 px-3 py-1.5 text-xs font-semibold text-pink-100 hover:bg-pink-500/25 disabled:opacity-50"
                  title="Instagram izohlari"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Izohlar
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => publishReelToMeta(r)}
                  className="rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                  title="Haqiqiy Instagram akkauntga joylash (Meta Graph)"
                >
                  {r.metaMediaId ? "IGga qayta joylash" : "IGga joylash"}
                </button>
                {r.music && !r.audioEmbedded && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => remuxReel(r)}
                    className="rounded-lg bg-lf-red/90 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                  >
                    Musiqani birlashtirish
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => togglePublish(r)}
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-xs disabled:opacity-50"
                >
                  {r.isPublished ? "Yashirish" : "Ko‘rsatish"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => removeReel(r)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/25 disabled:opacity-50"
                  title="Butunlay o‘chirish"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  O‘chirish
                </button>
              </div>
            </div>
            <video src={r.videoUrl} controls className="max-h-40 w-full rounded-lg bg-black object-contain" />
            {r.product && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    copyText(
                      productBuyUrl(shareBase(), r.product!.slug),
                      "Story havolasi nusxalandi — Instagram Story ga qo‘ying"
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
                      `${shareBase()}/instagram?reel=${r.id}`,
                      "Reels havolasi nusxalandi — mijoz shu modelni birinchi ko‘radi"
                    )
                  }
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-[11px]"
                >
                  Reels havolasi nusxa
                </button>
                <span className="self-center text-[10px] text-white/40">
                  {r.buyButtonLabel} → {r.product.name}
                </span>
              </div>
            )}
            {!r.product && (
              <p className="text-[11px] text-amber-300/80">
                Mahsulot bog‘langanda Story/Reels havolasi chiqadi — xaridor shu modelni birinchi ko‘radi.
              </p>
            )}
          </div>
        ))}
      </section>

      {msg && (
        <p className={`text-sm ${msg.startsWith("❗") ? "text-rose-400" : "text-emerald-400"}`}>
          {msg}
        </p>
      )}

      {/* Yon panel — Reel tahrirlash + izohlar */}
      {editing && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Yopish"
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={closeEdit}
          />
          <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#12141a] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <h3 className="font-semibold">Reel</h3>
                <p className="max-w-[260px] truncate text-[11px] text-white/45">{editing.title}</p>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                disabled={editBusy || Boolean(replyBusyId)}
                className="rounded-lg bg-white/10 p-2 disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-1 border-b border-white/10 px-3 py-2">
              <button
                type="button"
                onClick={() => setDetailTab("edit")}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${
                  detailTab === "edit" ? "bg-lf-red/25 text-white" : "text-white/55 hover:bg-white/5"
                }`}
              >
                Tahrir
              </button>
              <button
                type="button"
                onClick={() => {
                  setDetailTab("comments");
                  void loadComments(editing.id);
                }}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${
                  detailTab === "comments"
                    ? "bg-pink-500/25 text-white"
                    : "text-white/55 hover:bg-white/5"
                }`}
              >
                Izohlar
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              <video
                src={editing.videoUrl}
                controls
                className="max-h-44 w-full rounded-xl bg-black object-contain"
              />

              {detailTab === "edit" && (
                <>
                  <label className="block space-y-1.5">
                    <span className="text-xs uppercase tracking-[0.12em] text-white/45">Sarlavha</span>
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2"
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs uppercase tracking-[0.12em] text-white/45">Caption</span>
                    <textarea
                      rows={4}
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2"
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs uppercase tracking-[0.12em] text-white/45">Mahsulot</span>
                    <select
                      value={editProductId}
                      onChange={(e) => {
                        setEditProductId(e.target.value);
                        if (e.target.value) setEditShowBuy(true);
                      }}
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
                    <span className="text-xs uppercase tracking-[0.12em] text-white/45">Musiqa</span>
                    <select
                      value={editMusicId}
                      onChange={(e) => setEditMusicId(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2"
                    >
                      <option value="">Musiqasiz</option>
                      {musicTracks.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.title} — {m.artist}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-white/40">
                      Musiqa o‘zgarsa saqlashda videoga qayta birlashtiriladi.
                    </p>
                  </label>

                  <div className="space-y-3 rounded-xl border border-white/10 bg-black/30 p-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editShowBuy}
                        onChange={(e) => setEditShowBuy(e.target.checked)}
                      />
                      «Sotib olish» tugmasi
                    </label>
                    {editShowBuy && (
                      <label className="block space-y-1.5">
                        <span className="text-xs uppercase tracking-[0.12em] text-white/45">
                          Tugma matni
                        </span>
                        <input
                          value={editBuyLabel}
                          onChange={(e) => setEditBuyLabel(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2"
                          placeholder="Sotib olish"
                        />
                      </label>
                    )}
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editPublished}
                      onChange={(e) => setEditPublished(e.target.checked)}
                    />
                    Nashr qilingan (/instagram da ko‘rinsin)
                  </label>

                  <div className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.12em] text-white/45">Muqova</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/5 px-3 py-2 text-xs">
                        <Upload className="h-3.5 w-3.5" />
                        Rasm yuklash
                        <input
                          type="file"
                          accept="image/*,.jpg,.jpeg,.png,.webp"
                          className="hidden"
                          onChange={(e) => onEditCover(e.target.files?.[0] || null)}
                        />
                      </label>
                      {editCoverUrl && (
                        <button
                          type="button"
                          onClick={() => setEditCoverUrl("")}
                          className="rounded-lg bg-white/10 px-2 py-1.5 text-[11px]"
                        >
                          Muqovani olib tashlash
                        </button>
                      )}
                    </div>
                    {editCoverUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={editCoverUrl}
                        alt="Muqova"
                        className="max-h-32 rounded-lg object-cover"
                      />
                    )}
                  </div>

                  {editMsg && (
                    <p
                      className={`text-sm ${
                        editMsg.startsWith("❗") ? "text-rose-400" : "text-emerald-400"
                      }`}
                    >
                      {editMsg}
                    </p>
                  )}
                </>
              )}

              {detailTab === "comments" && (
                <div className="space-y-3">
                  {!editing.metaMediaId ? (
                    <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-100">
                      Hali IGga joylanmagan — izohlar yo‘q
                    </p>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={commentsBusy}
                          onClick={() => void syncComments()}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold disabled:opacity-50"
                        >
                          <RefreshCw
                            className={`h-3.5 w-3.5 ${commentsBusy ? "animate-spin" : ""}`}
                          />
                          Izohlarni yangilash
                        </button>
                        <span className="text-[10px] text-white/40">
                          Graph API · media {editing.metaMediaId.slice(0, 8)}…
                        </span>
                      </div>

                      {commentsBusy && comments.length === 0 && (
                        <p className="text-xs text-white/45">Yuklanmoqda…</p>
                      )}

                      {comments.length === 0 && !commentsBusy && (
                        <p className="text-xs text-white/45">
                          Izoh yo‘q. Yangilang yoki Meta webhook <code className="text-white/70">comments</code>{" "}
                          fieldini tekshiring.
                        </p>
                      )}

                      <ul className="space-y-2">
                        {comments.map((c) => (
                          <li
                            key={c.id || c.commentId}
                            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-white">
                                  @{c.username || "user"}
                                </div>
                                <div className="text-[10px] text-white/40">
                                  {formatCommentTime(c.postedAt || c.createdAt)}
                                </div>
                              </div>
                              {!c.ourReplyText && (
                                <button
                                  type="button"
                                  disabled={Boolean(replyBusyId)}
                                  onClick={() => void aiReplyComment(c.commentId)}
                                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-lf-red/90 px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-50"
                                >
                                  <Sparkles className="h-3 w-3" />
                                  {replyBusyId === c.commentId ? "…" : "AI javob"}
                                </button>
                              )}
                            </div>
                            <p className="text-sm text-white/90 whitespace-pre-wrap">{c.text}</p>
                            {c.ourReplyText && (
                              <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-2">
                                <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300/90">
                                  Bizning javob
                                </div>
                                <p className="mt-1 text-xs text-emerald-50/95 whitespace-pre-wrap">
                                  {c.ourReplyText}
                                </p>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {commentsMsg && (
                    <p
                      className={`text-sm ${
                        commentsMsg.startsWith("❗") ? "text-rose-400" : "text-emerald-400"
                      }`}
                    >
                      {commentsMsg}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 border-t border-white/10 px-4 py-3">
              <button
                type="button"
                disabled={editBusy || Boolean(replyBusyId)}
                onClick={closeEdit}
                className="flex-1 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium disabled:opacity-40"
              >
                Yopish
              </button>
              {detailTab === "edit" && (
                <button
                  type="button"
                  disabled={editBusy}
                  onClick={saveEdit}
                  className="flex-1 rounded-xl bg-lf-red px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
                >
                  {editBusy ? "Saqlanmoqda…" : "Saqlash"}
                </button>
              )}
              {detailTab === "comments" && editing.metaMediaId && (
                <button
                  type="button"
                  disabled={commentsBusy}
                  onClick={() => void syncComments()}
                  className="flex-1 rounded-xl bg-pink-600 px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
                >
                  {commentsBusy ? "Yangilanmoqda…" : "Yangilash"}
                </button>
              )}
            </div>
          </aside>
        </div>
      )}
      </div>
    </div>
  );
}
