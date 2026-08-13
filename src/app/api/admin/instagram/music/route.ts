import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { removeStoredUpload } from "@/lib/storage";

export async function GET() {
  const tracks = await prisma.instagramMusic.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { reels: true } } },
  });
  return NextResponse.json(tracks);
}

const schema = z.object({
  title: z.string().min(1),
  artist: z.string().optional(),
  fileUrl: z.string().min(1),
  durationSec: z.number().int().positive().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const track = await prisma.instagramMusic.create({
      data: {
        title: body.title,
        artist: body.artist || "LUXFABRIC",
        fileUrl: body.fileUrl,
        durationSec: body.durationSec || null,
      },
    });
    return NextResponse.json(track);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Xatolik" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });

    const track = await prisma.instagramMusic.findUnique({
      where: { id },
      include: { _count: { select: { reels: true } } },
    });
    if (!track) {
      return NextResponse.json({ error: "Trek topilmadi" }, { status: 404 });
    }

    // Reel FK bloklamasligi uchun bog‘lanishni uzamiz
    const detached = await prisma.instagramReel.updateMany({
      where: { musicId: id },
      data: { musicId: null },
    });

    await prisma.instagramMusic.delete({ where: { id } });

    // Yuklangan fayl — best-effort; /music/trends/* himoyalangan (diskda qoladi)
    try {
      await removeStoredUpload(track.fileUrl);
    } catch {
      /* ignore storage cleanup errors */
    }

    return NextResponse.json({
      ok: true,
      detachedReels: detached.count,
      storageKept: track.fileUrl.includes("/music/"),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Xatolik" },
      { status: 400 }
    );
  }
}
