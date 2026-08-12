"use client";

import { upload } from "@vercel/blob/client";

function makeName(ext: string) {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}.${ext}`;
}

/**
 * Admin media yuklash:
 * - Blob token bo‘lsa → to‘g‘ridan Blob (katta video OK)
 * - bo‘lmasa → eski /api/admin/upload-media (lokal disk)
 */
export async function uploadAdminMedia(
  file: File,
  kind: "image" | "video" | "audio",
  folder?: "stories" | "products" | "reels" | "music"
): Promise<string> {
  const ext =
    file.name.split(".").pop()?.toLowerCase() ||
    (kind === "video" ? "mp4" : kind === "audio" ? "mp3" : "jpg");

  const resolvedFolder =
    folder ||
    (kind === "image" ? "products" : kind === "video" ? "reels" : "music");

  const pathname = `${resolvedFolder}/${makeName(ext)}`;

  try {
    const blob = await upload(pathname, file, {
      access: "public",
      handleUploadUrl: "/api/admin/blob",
    });
    return blob.url;
  } catch {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);
    if (folder) fd.append("folder", folder);
    const res = await fetch("/api/admin/upload-media", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Yuklash xatosi");
    return data.url as string;
  }
}
