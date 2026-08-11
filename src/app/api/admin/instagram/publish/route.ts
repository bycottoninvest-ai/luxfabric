import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  IgPublishError,
  publishReelToInstagram,
  publishStoryToInstagram,
  testInstagramConnection,
  resolveIgUserId,
} from "@/lib/instagram-graph";
import { getSetting, setSettings } from "@/lib/settings";

export async function GET(req: Request) {
  const action = new URL(req.url).searchParams.get("action") || "status";
  if (action === "test") {
    const result = await testInstagramConnection();
    if (result.ok && result.igUserId) {
      await setSettings({ instagram_ig_user_id: result.igUserId });
    }
    return NextResponse.json(result);
  }

  const enabled = (await getSetting("instagram_enabled")) === "true";
  const hasToken = Boolean(await getSetting("instagram_page_token"));
  const igUserId = await getSetting("instagram_ig_user_id", "");
  const domain = await getSetting("app_domain", "");
  return NextResponse.json({
    enabled,
    hasToken,
    igUserId,
    domain,
    publishReady:
      hasToken &&
      Boolean(domain) &&
      !/localhost|127\.0\.0\.1/i.test(domain),
  });
}

const schema = z.object({
  type: z.enum(["reel", "story"]),
  id: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const enabled = (await getSetting("instagram_enabled")) === "true";
    if (!enabled) {
      return NextResponse.json(
        { error: "Avval Meta/DM da «Instagramni yoqish» ni bosing" },
        { status: 400 }
      );
    }

    const pageToken = await getSetting("instagram_page_token");
    if (pageToken) {
      try {
        const ig = await resolveIgUserId(pageToken);
        await setSettings({ instagram_ig_user_id: ig });
      } catch {
        /* publish ichida yana tekshiriladi */
      }
    }

    if (body.type === "reel") {
      const reel = await prisma.instagramReel.findUnique({
        where: { id: body.id },
        include: { product: { select: { slug: true, name: true } }, music: true },
      });
      if (!reel) return NextResponse.json({ error: "Reel topilmadi" }, { status: 404 });

      const domain = ((await getSetting("app_domain")) || "").replace(/\/$/, "");
      const shopLine =
        reel.product && domain
          ? `\n\n🛒 Sotib olish: ${domain}/i/${reel.product.slug}`
          : "";
      const caption = `${reel.caption || reel.title}${shopLine}`.trim();

      const published = await publishReelToInstagram({
        videoUrl: reel.videoUrl,
        caption,
        coverUrl: reel.coverUrl,
        shareToFeed: true,
      });

      try {
        await prisma.instagramReel.update({
          where: { id: reel.id },
          data: {
            metaMediaId: published.mediaId,
            metaPublishedAt: new Date(),
          },
        });
      } catch {
        await prisma.$executeRawUnsafe(
          `UPDATE InstagramReel SET metaMediaId = ?, metaPublishedAt = ? WHERE id = ?`,
          published.mediaId,
          new Date().toISOString(),
          reel.id
        );
      }

      return NextResponse.json({
        ok: true,
        type: "reel",
        mediaId: published.mediaId,
        message: "Reel Instagramga joylandi ✓",
      });
    }

    const story = await prisma.instagramStory.findUnique({
      where: { id: body.id },
      include: { product: { select: { slug: true } } },
    });
    if (!story) return NextResponse.json({ error: "Story topilmadi" }, { status: 404 });

    const published = await publishStoryToInstagram({
      mediaUrl: story.mediaUrl,
      mediaType: story.mediaType === "video" ? "video" : "image",
    });

    try {
      await prisma.instagramStory.update({
        where: { id: story.id },
        data: {
          metaMediaId: published.mediaId,
          metaPublishedAt: new Date(),
        },
      });
    } catch {
      await prisma.$executeRawUnsafe(
        `UPDATE InstagramStory SET metaMediaId = ?, metaPublishedAt = ? WHERE id = ?`,
        published.mediaId,
        new Date().toISOString(),
        story.id
      );
    }

    return NextResponse.json({
      ok: true,
      type: "story",
      mediaId: published.mediaId,
      message:
        "Story Instagramga joylandi ✓ (link sticker API da yo‘q — havolani Storyda qo‘lda qo‘shing yoki bio/link ishlating)",
      tip: story.product
        ? `Havola: /i/${story.product.slug}`
        : undefined,
    });
  } catch (err) {
    const message =
      err instanceof IgPublishError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Publish xatosi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
