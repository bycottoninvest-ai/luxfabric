import { NextResponse } from "next/server";
import { makeUploadName, storeUpload } from "@/lib/storage";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fayl topilmadi" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Faqat rasm yuklash mumkin" }, { status: 400 });
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "Rasm 8MB dan katta bo‘lmasin" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg";
    const name = makeUploadName(safeExt);
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await storeUpload({
      folder: "products",
      filename: name,
      data: buffer,
      contentType: file.type || undefined,
    });

    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Yuklash xatosi" },
      { status: 500 }
    );
  }
}
