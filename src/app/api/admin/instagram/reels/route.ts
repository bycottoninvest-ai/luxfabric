import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { muxVideoWithMusic } from "@/lib/mux-reel-audio";

const include = {
  music: true,
  product: { select: { id: true, name: true, slug: true, price: true } },
} as const;

export async function GET() {
  const reels = await prisma.instagramReel.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include,
  });
  return NextResponse.json(reels);
}

const schema = z.object({
  title: z.string().min(1),
  caption: z.string().optional(),
  videoUrl: z.string().min(1),
  coverUrl: z.string().optional().nullable(),
  musicId: z.string().optional().nullable(),
  productId: z.string().optional().nullable(),
  buyButtonLabel: z.string().optional(),
  showBuyButton: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const showBuy = body.showBuyButton ?? true;
    if (showBuy && !body.productId) {
      return NextResponse.json(
        { error: "«Sotib olish» uchun mahsulot tanlang yoki tugmani o‘chiring" },
        { status: 400 }
      );
    }
    let videoUrl = body.videoUrl;
    let audioEmbedded = false;
    let muxNote: string | null = null;

    if (body.musicId) {
      const track = await prisma.instagramMusic.findUnique({ where: { id: body.musicId } });
      if (track?.fileUrl) {
        try {
          videoUrl = await muxVideoWithMusic(body.videoUrl, track.fileUrl);
          audioEmbedded = true;
          muxNote = `Musiqa videoga birlashtirildi · ${track.title}`;
        } catch (e) {
          muxNote =
            e instanceof Error
              ? `Birlashtirish ishlamadi — alohida audio: ${e.message}`
              : "Birlashtirish ishlamadi — alohida audio";
        }
      }
    }

    const reel = await prisma.instagramReel.create({
      data: {
        title: body.title,
        caption: body.caption || "",
        videoUrl,
        coverUrl: body.coverUrl || null,
        musicId: body.musicId || null,
        productId: showBuy ? body.productId || null : null,
        buyButtonLabel: body.buyButtonLabel || "Sotib olish",
        showBuyButton: showBuy,
        isPublished: body.isPublished ?? true,
        sortOrder: body.sortOrder ?? 0,
      },
      include,
    });

    if (audioEmbedded) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE InstagramReel SET audioEmbedded = 1 WHERE id = ?`,
          reel.id
        );
      } catch {
        /* client/schema sync kechikishi */
      }
    }

    return NextResponse.json({ ...reel, audioEmbedded, muxNote });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Xatolik" },
      { status: 400 }
    );
  }
}

const patchSchema = schema.partial().extend({
  id: z.string(),
  audioEmbedded: z.boolean().optional(),
  remux: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  try {
    const body = patchSchema.parse(await req.json());
    const { id, remux, ...data } = body;

    const existing = await prisma.instagramReel.findUnique({
      where: { id },
      include: { music: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Reel topilmadi" }, { status: 404 });
    }

    const nextShowBuy =
      typeof data.showBuyButton === "boolean" ? data.showBuyButton : existing.showBuyButton;
    const nextProductId =
      data.productId !== undefined ? data.productId || null : existing.productId;
    if (nextShowBuy && !nextProductId) {
      return NextResponse.json(
        { error: "«Sotib olish» uchun mahsulot tanlang yoki tugmani o‘chiring" },
        { status: 400 }
      );
    }

    let videoUrl = data.videoUrl;
    let audioEmbedded = data.audioEmbedded;
    let muxNote: string | null = null;
    const musicChanging =
      data.musicId !== undefined && (data.musicId || null) !== (existing.musicId || null);
    const shouldRemux = Boolean(remux) || musicChanging;

    if (shouldRemux) {
      const musicId = data.musicId !== undefined ? data.musicId || null : existing.musicId;
      const track = musicId
        ? await prisma.instagramMusic.findUnique({ where: { id: musicId } })
        : null;
      if (!track?.fileUrl) {
        if (remux) {
          return NextResponse.json({ error: "Reelda musiqa yo‘q" }, { status: 400 });
        }
      } else {
        try {
          const sourceVideo = data.videoUrl || existing.videoUrl;
          videoUrl = await muxVideoWithMusic(sourceVideo, track.fileUrl);
          audioEmbedded = true;
          muxNote = `Musiqa videoga birlashtirildi · ${track.title}`;
        } catch (e) {
          muxNote =
            e instanceof Error
              ? `Birlashtirish ishlamadi — alohida audio: ${e.message}`
              : "Birlashtirish ishlamadi — alohida audio";
          audioEmbedded = false;
        }
      }
    }

    const reel = await prisma.instagramReel.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.caption !== undefined ? { caption: data.caption } : {}),
        ...(videoUrl !== undefined ? { videoUrl } : {}),
        ...(data.coverUrl !== undefined ? { coverUrl: data.coverUrl } : {}),
        ...(data.musicId !== undefined ? { musicId: data.musicId || null } : {}),
        ...(data.productId !== undefined || typeof data.showBuyButton === "boolean"
          ? { productId: nextShowBuy ? nextProductId : null }
          : {}),
        ...(data.buyButtonLabel !== undefined ? { buyButtonLabel: data.buyButtonLabel } : {}),
        ...(typeof data.showBuyButton === "boolean" ? { showBuyButton: data.showBuyButton } : {}),
        ...(typeof data.isPublished === "boolean" ? { isPublished: data.isPublished } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(typeof audioEmbedded === "boolean" ? { audioEmbedded } : {}),
      },
      include,
    });

    return NextResponse.json({
      ...reel,
      audioEmbedded: typeof audioEmbedded === "boolean" ? audioEmbedded : reel.audioEmbedded,
      muxNote,
    });
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
    await prisma.instagramReel.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Xatolik" },
      { status: 400 }
    );
  }
}
