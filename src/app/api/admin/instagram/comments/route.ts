import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import {
  IgPublishError,
  listInstagramMediaComments,
  replyToInstagramComment,
} from "@/lib/instagram-graph";
import { generateShopReply } from "@/lib/shop-ai-reply";

async function resolveReel(reelId: string) {
  return prisma.instagramReel.findUnique({
    where: { id: reelId },
    include: {
      product: {
        select: {
          name: true,
          slug: true,
          price: true,
          fabric: true,
          variants: { select: { size: true }, take: 40 },
        },
      },
    },
  });
}

function productCtx(reel: NonNullable<Awaited<ReturnType<typeof resolveReel>>>) {
  const p = reel.product;
  if (!p) return {};
  return {
    productName: p.name,
    productSlug: p.slug,
    price: p.price,
    fabric: p.fabric,
    sizes: [...new Set(p.variants.map((v) => v.size))],
  };
}

/** GET ?reelId= — saqlangan izohlar */
export async function GET(req: Request) {
  const reelId = new URL(req.url).searchParams.get("reelId");
  if (!reelId) {
    return NextResponse.json({ error: "reelId kerak" }, { status: 400 });
  }

  const reel = await prisma.instagramReel.findUnique({
    where: { id: reelId },
    select: { id: true, title: true, metaMediaId: true, metaPublishedAt: true },
  });
  if (!reel) {
    return NextResponse.json({ error: "Reel topilmadi" }, { status: 404 });
  }

  if (!reel.metaMediaId) {
    return NextResponse.json({
      ok: true,
      published: false,
      message: "Hali IGga joylanmagan — izohlar yo‘q",
      comments: [],
    });
  }

  const comments = await prisma.instagramComment.findMany({
    where: {
      OR: [{ reelId: reel.id }, { mediaId: reel.metaMediaId }],
    },
    orderBy: [{ postedAt: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  return NextResponse.json({
    ok: true,
    published: true,
    metaMediaId: reel.metaMediaId,
    comments,
  });
}

const postSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("sync"),
    reelId: z.string().min(1),
  }),
  z.object({
    action: z.literal("reply"),
    reelId: z.string().min(1),
    commentId: z.string().min(1),
    text: z.string().optional(),
    useAi: z.boolean().optional(),
  }),
]);

export async function POST(req: Request) {
  try {
    const body = postSchema.parse(await req.json());

    if (body.action === "sync") {
      const reel = await resolveReel(body.reelId);
      if (!reel) {
        return NextResponse.json({ error: "Reel topilmadi" }, { status: 404 });
      }
      if (!reel.metaMediaId) {
        return NextResponse.json({
          ok: false,
          error: "Hali IGga joylanmagan — izohlar yo‘q",
        }, { status: 400 });
      }

      const remote = await listInstagramMediaComments(reel.metaMediaId);
      let upserted = 0;
      for (const c of remote) {
        await prisma.instagramComment.upsert({
          where: { commentId: c.id },
          create: {
            commentId: c.id,
            mediaId: reel.metaMediaId,
            reelId: reel.id,
            username: c.username || "",
            fromId: c.fromId || null,
            text: c.text.slice(0, 2000),
            parentId: c.parentId || null,
            postedAt: c.timestamp ? new Date(c.timestamp) : null,
          },
          update: {
            mediaId: reel.metaMediaId,
            reelId: reel.id,
            username: c.username || undefined,
            fromId: c.fromId || undefined,
            text: c.text.slice(0, 2000),
            parentId: c.parentId || undefined,
            postedAt: c.timestamp ? new Date(c.timestamp) : undefined,
          },
        });
        upserted += 1;
      }

      const comments = await prisma.instagramComment.findMany({
        where: {
          OR: [{ reelId: reel.id }, { mediaId: reel.metaMediaId }],
        },
        orderBy: [{ postedAt: "desc" }, { createdAt: "desc" }],
        take: 100,
      });

      return NextResponse.json({
        ok: true,
        synced: upserted,
        comments,
        message: `Yangilandi: ${upserted} izoh`,
      });
    }

    // reply
    const reel = await resolveReel(body.reelId);
    if (!reel) {
      return NextResponse.json({ error: "Reel topilmadi" }, { status: 404 });
    }

    const existing = await prisma.instagramComment.findUnique({
      where: { commentId: body.commentId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Izoh topilmadi — avval «Izohlarni yangilash»" }, { status: 404 });
    }

    let replyText = (body.text || "").trim();
    let source: "openai" | "template" | "manual" = "manual";

    if (body.useAi || !replyText) {
      const ai = await generateShopReply(existing.text, productCtx(reel));
      replyText = ai.reply;
      source = ai.source;
    }
    if (!replyText) {
      return NextResponse.json({ error: "Javob matni bo‘sh" }, { status: 400 });
    }

    const graphRes = await replyToInstagramComment(body.commentId, replyText);
    const replyId = typeof graphRes.id === "string" ? graphRes.id : null;

    const updated = await prisma.instagramComment.update({
      where: { commentId: body.commentId },
      data: {
        ourReplyText: replyText.slice(0, 900),
        ourReplyId: replyId,
        repliedAt: new Date(),
        reelId: existing.reelId || reel.id,
        mediaId: existing.mediaId || reel.metaMediaId,
      },
    });

    await prisma.instagramCommentReply.upsert({
      where: { commentId: body.commentId },
      create: {
        commentId: body.commentId,
        mediaId: reel.metaMediaId || null,
        commentText: existing.text.slice(0, 500),
        replyText: replyText.slice(0, 900),
        source: source === "manual" ? "manual" : source,
      },
      update: {
        replyText: replyText.slice(0, 900),
        source: source === "manual" ? "manual" : source,
      },
    });

    return NextResponse.json({
      ok: true,
      comment: updated,
      source,
      message: "Javob Instagramga yuborildi ✓",
    });
  } catch (e) {
    const msg =
      e instanceof IgPublishError
        ? e.message
        : e instanceof Error
          ? e.message
          : "Xatolik";
    const status = e instanceof ZodError ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
