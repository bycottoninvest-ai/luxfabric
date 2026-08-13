import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { importDirectAudioUrl } from "@/lib/import-audio-url";

const schema = z.object({
  url: z.string().min(8).max(2000),
  title: z.string().max(80).optional(),
  artist: z.string().max(80).optional(),
});

/**
 * Kutubxonaga URL dan musiqa: faqat to‘g‘ridan-to‘g‘ri audio (.mp3/.m4a/.aac yoki audio/*).
 * HTML / YouTube / Instagram / Spotify scrape — rad.
 */
export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const imported = await importDirectAudioUrl(body.url, body.title);
    if (!imported.ok) {
      return NextResponse.json({ error: imported.error }, { status: imported.status || 400 });
    }

    const track = await prisma.instagramMusic.create({
      data: {
        title: imported.title,
        artist: body.artist?.trim() || "LUXFABRIC",
        fileUrl: imported.fileUrl,
      },
    });

    return NextResponse.json({
      ...track,
      importedBytes: imported.bytes,
      contentType: imported.contentType,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Xatolik" },
      { status: 400 }
    );
  }
}
