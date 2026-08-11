import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

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
    await prisma.instagramMusic.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Xatolik" },
      { status: 400 }
    );
  }
}
