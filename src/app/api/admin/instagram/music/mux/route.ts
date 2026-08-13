import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { muxVideoWithMusic } from "@/lib/mux-reel-audio";

const schema = z.object({
  videoUrl: z.string().min(1),
  musicId: z.string().min(1),
});

/** Draft video + kutubxona treki → mux (Reel saqlamasdan). */
export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const track = await prisma.instagramMusic.findUnique({ where: { id: body.musicId } });
    if (!track?.fileUrl) {
      return NextResponse.json({ error: "Musiqa topilmadi" }, { status: 404 });
    }
    const videoUrl = await muxVideoWithMusic(body.videoUrl, track.fileUrl);
    return NextResponse.json({
      videoUrl,
      audioEmbedded: true,
      musicId: track.id,
      muxNote: `Musiqa videoga birlashtirildi · ${track.title}`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Birlashtirish xatosi" },
      { status: 400 }
    );
  }
}
