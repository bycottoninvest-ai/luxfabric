import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isProtectedMusicUrl, removeStoredUpload } from "@/lib/storage";

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
    const id = new URL(req.url).searchParams.get("id")?.trim();
    if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });

    const track = await prisma.instagramMusic.findUnique({
      where: { id },
      include: { _count: { select: { reels: true } } },
    });

    // Allaqachon yo‘q — UI uchun muvaffaqiyat (idempotent)
    if (!track) {
      return NextResponse.json({ ok: true, alreadyGone: true, detachedReels: 0 });
    }

    const fileUrl = track.fileUrl;
    const keepStorage = isProtectedMusicUrl(fileUrl);

    const detached = await prisma.$transaction(async (tx) => {
      const upd = await tx.instagramReel.updateMany({
        where: { musicId: id },
        data: { musicId: null },
      });
      await tx.instagramMusic.delete({ where: { id } });
      return upd.count;
    });

    let storageRemoved = false;
    let storageError: string | null = null;
    if (!keepStorage) {
      try {
        await removeStoredUpload(fileUrl);
        storageRemoved = true;
      } catch (e) {
        storageError = e instanceof Error ? e.message : "Fayl o‘chirilmadi";
      }
    }

    return NextResponse.json({
      ok: true,
      detachedReels: detached,
      storageKept: keepStorage,
      storageRemoved,
      storageError,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Xatolik" },
      { status: 400 }
    );
  }
}
