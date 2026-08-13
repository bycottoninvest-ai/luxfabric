import { NextResponse } from "next/server";
import { makeUploadName, storeUpload } from "@/lib/storage";

const LIMITS = {
  image: 8 * 1024 * 1024,
  video: 80 * 1024 * 1024,
  audio: 20 * 1024 * 1024,
} as const;

const EXTS = {
  image: ["jpg", "jpeg", "png", "webp", "gif"],
  video: ["mp4", "webm", "mov"],
  audio: ["mp3", "m4a", "aac", "wav", "ogg"],
} as const;

/** Umumiy media upload: image | video | audio (Blob yoki lokal). */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const kindRaw = String(form.get("kind") || "image").toLowerCase();
    const kind = (["image", "video", "audio"].includes(kindRaw) ? kindRaw : "image") as
      | "image"
      | "video"
      | "audio";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fayl topilmadi" }, { status: 400 });
    }

    const typeOk =
      (kind === "image" && file.type.startsWith("image/")) ||
      (kind === "video" && (file.type.startsWith("video/") || file.name.match(/\.(mp4|webm|mov)$/i))) ||
      (kind === "audio" && (file.type.startsWith("audio/") || file.name.match(/\.(mp3|m4a|aac|wav|ogg)$/i)));

    if (!typeOk) {
      return NextResponse.json({ error: `Faqat ${kind} fayl yuklash mumkin` }, { status: 400 });
    }
    if (file.size > LIMITS[kind]) {
      return NextResponse.json(
        { error: `${kind} hajmi ${Math.round(LIMITS[kind] / 1024 / 1024)}MB dan oshmasin` },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || (kind === "video" ? "mp4" : kind === "audio" ? "mp3" : "jpg");
    const safeExt = (EXTS[kind] as readonly string[]).includes(ext)
      ? ext
      : kind === "video"
        ? "mp4"
        : kind === "audio"
          ? "mp3"
          : "jpg";

    const folderParam = String(form.get("folder") || "").toLowerCase();
    const folder =
      folderParam === "stories"
        ? "stories"
        : kind === "image"
          ? "products"
          : kind === "video"
            ? "reels"
            : "audio";
    const name = makeUploadName(safeExt);
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await storeUpload({
      folder,
      filename: name,
      data: buffer,
      contentType: file.type || undefined,
    });

    return NextResponse.json({
      url,
      kind,
      name: file.name,
      size: file.size,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Yuklash xatosi" },
      { status: 500 }
    );
  }
}
