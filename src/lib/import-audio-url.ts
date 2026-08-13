import { makeUploadName, storeUpload } from "@/lib/storage";

const MAX_BYTES = 20 * 1024 * 1024;
const AUDIO_EXTS = ["mp3", "m4a", "aac"] as const;

/** Sahifa / streaming platformalar — scrape/download qilinmaydi. */
const BLOCKED_HOST_SUFFIXES = [
  "youtube.com",
  "youtu.be",
  "instagram.com",
  "cdninstagram.com",
  "facebook.com",
  "fb.watch",
  "spotify.com",
  "scdn.co",
  "tiktok.com",
  "music.apple.com",
  "itunes.apple.com",
  "soundcloud.com",
  "bandcamp.com",
  "vk.com",
  "yandex.ru",
  "music.yandex",
];

export type ImportAudioResult =
  | { ok: true; fileUrl: string; title: string; contentType: string; bytes: number }
  | { ok: false; error: string; status?: number };

function hostBlocked(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^www\./, "");
  return BLOCKED_HOST_SUFFIXES.some((s) => h === s || h.endsWith(`.${s}`));
}

function extFromPath(pathname: string): (typeof AUDIO_EXTS)[number] | null {
  const m = pathname.toLowerCase().match(/\.([a-z0-9]+)(?:\?|$)/);
  const ext = m?.[1];
  if (ext && (AUDIO_EXTS as readonly string[]).includes(ext)) {
    return ext as (typeof AUDIO_EXTS)[number];
  }
  return null;
}

function extFromContentType(ct: string): (typeof AUDIO_EXTS)[number] | null {
  const c = ct.toLowerCase().split(";")[0]?.trim() || "";
  if (c === "audio/mpeg" || c === "audio/mp3") return "mp3";
  if (c === "audio/mp4" || c === "audio/x-m4a" || c === "audio/m4a") return "m4a";
  if (c === "audio/aac" || c === "audio/x-aac") return "aac";
  return null;
}

function titleFromUrl(url: URL): string {
  const base = decodeURIComponent(url.pathname.split("/").pop() || "track");
  return base.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim().slice(0, 80) || "Track";
}

/**
 * Faqat to‘g‘ridan-to‘g‘ri audio URL: .mp3/.m4a/.aac yoki Content-Type audio/*.
 * HTML sahifa, YouTube, Instagram, Spotify va h.k. rad etiladi.
 */
export async function importDirectAudioUrl(
  rawUrl: string,
  preferredTitle?: string
): Promise<ImportAudioResult> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return { ok: false, error: "Noto‘g‘ri URL", status: 400 };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "Faqat http(s) URL qabul qilinadi", status: 400 };
  }

  if (hostBlocked(url.hostname)) {
    const h = url.hostname.toLowerCase().replace(/^www\./, "");
    const isIg =
      h === "instagram.com" ||
      h.endsWith(".instagram.com") ||
      h === "cdninstagram.com" ||
      h.endsWith(".cdninstagram.com");
    return {
      ok: false,
      error: isIg
        ? "Instagram havolasidan musiqa olinmaydi — kompyuter fayli yoki to‘g‘ri audio URL"
        : "Bu saytdan musiqa o‘g‘irlash mumkin emas (YouTube / Spotify va h.k.). Faqat to‘g‘ridan-to‘g‘ri .mp3/.m4a/.aac havola yoki kompyuter fayli.",
      status: 400,
    };
  }

  const pathExt = extFromPath(url.pathname);
  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: "GET",
      redirect: "follow",
      headers: { Accept: "audio/*,application/octet-stream;q=0.9,*/*;q=0.1" },
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    return {
      ok: false,
      error: "URL dan yuklab bo‘lmadi (tarmoq / timeout). To‘g‘ridan-to‘g‘ri audio link ekanligini tekshiring.",
      status: 400,
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      error: `Manba javob bermadi (${res.status}). To‘g‘ridan-to‘g‘ri ochiladigan audio URL kerak.`,
      status: 400,
    };
  }

  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  if (contentType.includes("text/html") || contentType.includes("application/xhtml")) {
    return {
      ok: false,
      error:
        "Bu HTML sahifa — scrape qilinmaydi. Saytdan ommaviy musiqa o‘g‘irlash mumkin emas; faqat to‘g‘ridan-to‘g‘ri audio link (masalan Pixabay CDN) yoki kompyuter fayli.",
      status: 400,
    };
  }

  const ctExt = contentType.startsWith("audio/") ? extFromContentType(contentType) : null;
  const isAudioCt = contentType.startsWith("audio/");
  if (!pathExt && !isAudioCt) {
    return {
      ok: false,
      error:
        "Faqat to‘g‘ridan-to‘g‘ri audio qabul qilinadi: URL oxiri .mp3/.m4a/.aac yoki Content-Type audio/* bo‘lsin.",
      status: 400,
    };
  }

  const lenHeader = res.headers.get("content-length");
  if (lenHeader && Number(lenHeader) > MAX_BYTES) {
    return { ok: false, error: "Audio 20MB dan oshmasin", status: 400 };
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength === 0) {
    return { ok: false, error: "Bo‘sh fayl", status: 400 };
  }
  if (buf.byteLength > MAX_BYTES) {
    return { ok: false, error: "Audio 20MB dan oshmasin", status: 400 };
  }

  // Oddiy HTML sniff (ba’zi CDN lar noto‘g‘ri Content-Type beradi)
  const head = buf.subarray(0, 64).toString("utf8").trimStart().toLowerCase();
  if (head.startsWith("<!doctype") || head.startsWith("<html")) {
    return {
      ok: false,
      error: "Javob HTML chiqdi — sahifa scrape qilinmaydi. To‘g‘ridan-to‘g‘ri audio URL kerak.",
      status: 400,
    };
  }

  const ext = pathExt || ctExt || "mp3";
  const mime =
    contentType.startsWith("audio/") && contentType.split(";")[0]
      ? contentType.split(";")[0]!.trim()
      : ext === "m4a"
        ? "audio/mp4"
        : ext === "aac"
          ? "audio/aac"
          : "audio/mpeg";

  const filename = makeUploadName(ext);
  const fileUrl = await storeUpload({
    folder: "audio",
    filename,
    data: buf,
    contentType: mime,
  });

  const title =
    (preferredTitle?.trim().slice(0, 80) || titleFromUrl(url)).slice(0, 80) || "Track";

  return {
    ok: true,
    fileUrl,
    title,
    contentType: mime,
    bytes: buf.byteLength,
  };
}
