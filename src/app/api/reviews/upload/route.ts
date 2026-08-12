import { NextResponse } from "next/server";
import { makeUploadName, storeUpload } from "@/lib/storage";

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/** Ommaviy sharh fotosi — faqat rasm, kichik hajm. */
export async function POST(req: Request) {
  try {
    const fd = await req.formData();
    const file = fd.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fayl kerak" }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ error: "Faqat rasm (jpg/png/webp)" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Rasm 4 MB dan oshmasin" }, { status: 400 });
    }

    const ext =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : file.type === "image/gif"
            ? "gif"
            : "jpg";
    const filename = makeUploadName(ext);
    const url = await storeUpload({
      folder: "reviews",
      filename,
      data: file,
      contentType: file.type,
    });
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Yuklash xatosi" },
      { status: 500 }
    );
  }
}
