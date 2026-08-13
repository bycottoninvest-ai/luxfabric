import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  IgPublishError,
  listInstagramMediaComments,
  listOwnInstagramMedia,
} from "@/lib/instagram-graph";

/** GET — o‘z IG Reels/VIDEO; ?mediaId= — shu media izohlari (Graph + DB sync) */
export async function GET(req: Request) {
  try {
    const mediaId = new URL(req.url).searchParams.get("mediaId")?.trim() || "";

    if (mediaId) {
      const remote = await listInstagramMediaComments(mediaId);
      const localReel = await prisma.instagramReel.findFirst({
        where: { metaMediaId: mediaId },
        select: { id: true },
      });

      let upserted = 0;
      for (const c of remote) {
        await prisma.instagramComment.upsert({
          where: { commentId: c.id },
          create: {
            commentId: c.id,
            mediaId,
            reelId: localReel?.id || null,
            username: c.username || "",
            fromId: c.fromId || null,
            text: c.text.slice(0, 2000),
            parentId: c.parentId || null,
            postedAt: c.timestamp ? new Date(c.timestamp) : null,
          },
          update: {
            mediaId,
            reelId: localReel?.id || undefined,
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
          OR: [
            { mediaId },
            ...(localReel ? [{ reelId: localReel.id }] : []),
          ],
        },
        orderBy: [{ postedAt: "desc" }, { createdAt: "desc" }],
        take: 100,
      });

      return NextResponse.json({
        ok: true,
        mediaId,
        reelId: localReel?.id || null,
        synced: upserted,
        comments,
      });
    }

    const feed = await listOwnInstagramMedia({ limit: 24 });
    const mediaIds = feed.media.map((m) => m.id);
    const linked =
      mediaIds.length === 0
        ? []
        : await prisma.instagramReel.findMany({
            where: { metaMediaId: { in: mediaIds } },
            select: { id: true, title: true, metaMediaId: true },
          });
    const byMedia = new Map(
      linked
        .filter((r) => r.metaMediaId)
        .map((r) => [r.metaMediaId as string, { reelId: r.id, title: r.title }])
    );

    return NextResponse.json({
      ok: true,
      username: feed.username,
      igUserId: feed.igUserId,
      media: feed.media.map((m) => ({
        ...m,
        localReelId: byMedia.get(m.id)?.reelId || null,
        localTitle: byMedia.get(m.id)?.title || null,
      })),
    });
  } catch (e) {
    const msg =
      e instanceof IgPublishError
        ? e.message
        : e instanceof Error
          ? e.message
          : "Xatolik";
    const noToken = /token yo‘q|token bo‘sh|Page Access Token/i.test(msg);
    return NextResponse.json(
      { ok: false, error: msg, needsToken: noToken },
      { status: noToken ? 400 : 500 }
    );
  }
}
