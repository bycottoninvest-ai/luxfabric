import { del, put } from "@vercel/blob";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

export function hasBlobStorage(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** Serverda fayl saqlash: Blob (prod) yoki public/uploads (lokal). */
export async function storeUpload(opts: {
  folder: string;
  filename: string;
  data: Buffer | Blob | File;
  contentType?: string;
}): Promise<string> {
  const pathname = `${opts.folder}/${opts.filename}`;

  if (hasBlobStorage()) {
    const blob = await put(pathname, opts.data, {
      access: "public",
      addRandomSuffix: false,
      contentType: opts.contentType,
    });
    return blob.url;
  }

  const dir = path.join(process.cwd(), "public", "uploads", opts.folder);
  await mkdir(dir, { recursive: true });
  const buffer =
    Buffer.isBuffer(opts.data)
      ? opts.data
      : Buffer.from(await (opts.data as Blob).arrayBuffer());
  await writeFile(path.join(dir, opts.filename), buffer);
  return `/uploads/${opts.folder}/${opts.filename}`;
}

export function makeUploadName(ext: string): string {
  return `${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
}

function isBlobUrl(fileUrl: string): boolean {
  return (
    fileUrl.includes("blob.vercel-storage.com") ||
    fileUrl.includes("public.blob.vercel-storage.com")
  );
}

/**
 * Faqat sayt static beds: `public/music/*` (masalan /music/trends/...).
 * Blob yoki /uploads/... dagi yuklangan treklar HIMOYALANMAYDI — o‘chiriladi.
 * Eski bug: Blob `…/music/xxx.mp3` regex orqali “protected” deb qolib, o‘chmas edi.
 */
export function isProtectedMusicUrl(fileUrl: string): boolean {
  if (!fileUrl) return false;
  if (isBlobUrl(fileUrl)) return false;
  if (fileUrl.startsWith("/uploads/")) return false;
  try {
    if (/^https?:\/\//i.test(fileUrl)) {
      const u = new URL(fileUrl);
      // Faqat o‘z domenimizdagi /music/* static
      if (!u.pathname.startsWith("/music/")) return false;
      return true;
    }
  } catch {
    /* ignore */
  }
  return fileUrl.startsWith("/music/");
}

/**
 * Yuklangan musiqa/media faylini o‘chirish (best-effort).
 * Static `/music/*` beds — o‘chirilmaydi.
 */
export async function removeStoredUpload(fileUrl: string): Promise<void> {
  if (!fileUrl || isProtectedMusicUrl(fileUrl)) return;

  if (isBlobUrl(fileUrl)) {
    if (hasBlobStorage()) {
      await del(fileUrl);
    }
    return;
  }

  // Relativ /uploads/... yoki to‘liq URL ichidagi /uploads/...
  let rel = fileUrl;
  if (/^https?:\/\//i.test(fileUrl)) {
    try {
      rel = new URL(fileUrl).pathname;
    } catch {
      return;
    }
  }

  if (rel.startsWith("/uploads/")) {
    const full = path.join(process.cwd(), "public", rel.replace(/^\//, ""));
    const uploadsRoot = path.join(process.cwd(), "public", "uploads");
    if (!full.startsWith(uploadsRoot)) return;
    await unlink(full).catch(() => undefined);
  }
}
