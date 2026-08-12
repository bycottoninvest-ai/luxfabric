import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  IgPublishError,
  publishReelToInstagram,
  publishStoryToInstagram,
  testInstagramConnection,
  resolveIgUserId,
  commentOnInstagramMediaWithRetry,
  tryTagProductsOnMedia,
} from "@/lib/instagram-graph";
import { getSetting, setSettings } from "@/lib/settings";
import {
  buildIgFirstComment,
  buildIgPublishCaption,
  productBuyUrl,
} from "@/lib/ig-caption";

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
        include: {
          product: { select: { slug: true, name: true, metaCatalogProductId: true } },
          music: true,
        },
      });
      if (!reel) return NextResponse.json({ error: "Reel topilmadi" }, { status: 404 });

      const domain = await getSetting("app_domain", "");
      const buyUrl =
        reel.product && domain
          ? productBuyUrl(domain, reel.product.slug)
          : reel.product
            ? productBuyUrl(null, reel.product.slug)
            : null;
      const buyLabel = reel.buyButtonLabel || "Sotib olish";
      const caption = buildIgPublishCaption({
        caption: reel.caption || reel.title,
        buyUrl,
        buyLabel,
      });

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

      let firstComment: { ok: boolean; commentId?: string; error?: string } | null = null;
      if (buyUrl) {
        try {
          const c = await commentOnInstagramMediaWithRetry(
            published.mediaId,
            buildIgFirstComment({ buyUrl, buyLabel })
          );
          firstComment = { ok: true, commentId: c.commentId };
        } catch (e) {
          firstComment = {
            ok: false,
            error: e instanceof Error ? e.message : "Izoh yozilmadi",
          };
        }
      }

      let productTag: { ok: boolean; error?: string } | null = null;
      const catalogId = reel.product?.metaCatalogProductId?.trim();
      if (catalogId) {
        productTag = await tryTagProductsOnMedia(published.mediaId, [catalogId], {
          x: 0.5,
          y: 0.85,
        });
      }

      const commentHint = firstComment?.ok
        ? " Caption + birinchi izohda Sotib olish linki chiqadi."
        : firstComment
          ? ` Izoh yozilmadi: ${firstComment.error}`
          : buyUrl
            ? " Mahsulot yo‘q emas, lekin izoh yozilmadi."
            : " Mahsulot bog‘lanmagan — izoh/URL yo‘q.";

      return NextResponse.json({
        ok: true,
        type: "reel",
        mediaId: published.mediaId,
        captionPreview: caption.slice(0, 220),
        buyUrl: buyUrl || undefined,
        firstComment,
        productTag,
        message: `Reel Instagramga joylandi ✓${commentHint}`,
        successHint:
          "Caption + birinchi izohda Sotib olish linki chiqadi. Mijoz: link → o‘lcham → Sotib olish.",
        note:
          "IG appda qizil overlay yo‘q (Meta). Qizil tugma — sayt /instagram. Qo‘lda telefon joylash — avto izoh ishlamaydi.",
      });
    }

    const story = await prisma.instagramStory.findUnique({
      where: { id: body.id },
      include: { product: { select: { slug: true, metaCatalogProductId: true } } },
    });
    if (!story) return NextResponse.json({ error: "Story topilmadi" }, { status: 404 });

    const domain = await getSetting("app_domain", "");
    const storyBuyUrl = story.product
      ? productBuyUrl(domain || null, story.product.slug)
      : null;

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
        "Story Instagramga joylandi ✓ (Meta Graph link sticker bermaydi — havolani Storyda qo‘lda qo‘shing yoki bio/link ishlating)",
      tip: storyBuyUrl || undefined,
      note:
        "Storyda izoh yo‘q. Link sticker faqat Instagram ilovasida qo‘lda. Sayt preview: /instagram/story/…",
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
