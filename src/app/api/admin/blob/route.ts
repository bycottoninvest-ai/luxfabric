import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, readSessionToken } from "@/lib/admin-session";

/** Client → Vercel Blob (katta video/audio uchun). Faqat admin sessiyasi. */
export async function POST(request: Request): Promise<NextResponse> {
  const jar = await cookies();
  const session = await readSessionToken(jar.get(ADMIN_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "BLOB_READ_WRITE_TOKEN yo‘q — Vercel Blob ulang" },
      { status: 503 }
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const allowed =
          pathname.startsWith("reels/") ||
          pathname.startsWith("music/") ||
          pathname.startsWith("stories/") ||
          pathname.startsWith("products/");
        if (!allowed) throw new Error("Noto‘g‘ri papka");
        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "video/mp4",
            "video/webm",
            "video/quicktime",
            "audio/mpeg",
            "audio/mp4",
            "audio/aac",
            "audio/wav",
            "audio/ogg",
            "audio/x-m4a",
          ],
          maximumSizeInBytes: 80 * 1024 * 1024,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({ email: session.email }),
        };
      },
      onUploadCompleted: async () => {
        // DB yangilash client tomonda URL bilan bo‘ladi
      },
    });
    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Blob xato" },
      { status: 400 }
    );
  }
}
