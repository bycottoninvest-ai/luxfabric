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

/** Trend/RF static beds — DB dan o‘chirish mumkin, diskdagi fayl himoyalangan. */
export function isProtectedMusicUrl(fileUrl: string): boolean {
  if (!fileUrl) return false;
  return (
    fileUrl.includes("/music/trends/") ||
    fileUrl.startsWith("/music/") ||
    /\/music\/[^/]+\.(mp3|m4a|aac|wav)(\?|$)/i.test(fileUrl)
  );
}

/**
 * Yuklangan musiqa/media faylini o‘chirish (best-effort).
 * `/music/trends/*` va boshqa static `/music/*` — o‘chirilmaydi.
 */
export async function removeStoredUpload(fileUrl: string): Promise<void> {
  if (!fileUrl || isProtectedMusicUrl(fileUrl)) return;

  if (
    fileUrl.includes("blob.vercel-storage.com") ||
    fileUrl.includes("public.blob.vercel-storage.com")
  ) {
    if (hasBlobStorage()) {
      await del(fileUrl);
    }
    return;
  }

  if (fileUrl.startsWith("/uploads/")) {
    const full = path.join(process.cwd(), "public", fileUrl.replace(/^\//, ""));
    const uploadsRoot = path.join(process.cwd(), "public", "uploads");
    if (!full.startsWith(uploadsRoot)) return;
    await unlink(full).catch(() => undefined);
  }
}
