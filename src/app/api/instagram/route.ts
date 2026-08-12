import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSetting, getAppUrl, getSettings } from "@/lib/settings";
import { replyToInstagramComment, sendInstagramDm } from "@/lib/instagram-graph";
import { generateShopReply, templateShopReply, openaiConfigured } from "@/lib/shop-ai-reply";

function extractMessaging(body: unknown): { senderId: string; text: string } | null {
  const b = body as {
    entry?: Array<{
      messaging?: Array<{ sender?: { id?: string }; message?: { text?: string } }>;
      changes?: Array<{
        field?: string;
        value?: {
          sender?: { id?: string };
          message?: { text?: string };
        };
      }>;
    }>;
  };

  const entry = b?.entry?.[0];
  if (!entry) return null;

  const m = entry.messaging?.[0];
  if (m?.sender?.id && m?.message?.text) {
    return { senderId: m.sender.id, text: String(m.message.text) };
  }

  const change = entry.changes?.find((c) => c.field === "messages" || c.value?.message?.text);
  if (change?.value?.sender?.id && change.value.message?.text) {
    return {
      senderId: change.value.sender.id,
      text: String(change.value.message.text),
    };
  }

  return null;
}

type IgCommentEvent = {
  commentId: string;
  text: string;
  mediaId?: string;
  fromId?: string;
  username?: string;
  parentId?: string;
};

function extractComments(body: unknown): IgCommentEvent[] {
  const b = body as {
    entry?: Array<{
      changes?: Array<{
        field?: string;
        value?: {
          id?: string;
          text?: string;
          parent_id?: string;
          from?: { id?: string; username?: string };
          media?: { id?: string };
        };
      }>;
    }>;
  };

  const out: IgCommentEvent[] = [];
  for (const entry of b?.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== "comments" && change.field !== "live_comments") continue;
      const v = change.value;
      if (!v?.id || !v.text) continue;
      out.push({
        commentId: String(v.id),
        text: String(v.text),
        mediaId: v.media?.id ? String(v.media.id) : undefined,
        fromId: v.from?.id ? String(v.from.id) : undefined,
        username: v.from?.username ? String(v.from.username) : undefined,
        parentId: v.parent_id ? String(v.parent_id) : undefined,
      });
    }
  }
  return out;
}

async function productContextFromMedia(mediaId?: string) {
  if (!mediaId) return { ctx: {}, reelId: null as string | null };
  const reel = await prisma.instagramReel.findFirst({
    where: { metaMediaId: mediaId },
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
  const story = !reel
    ? await prisma.instagramStory.findFirst({
        where: { metaMediaId: mediaId },
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
      })
    : null;
  const product = reel?.product || story?.product;
  return {
    reelId: reel?.id ?? null,
    ctx: product
      ? {
          productName: product.name,
          productSlug: product.slug,
          price: product.price,
          fabric: product.fabric,
          sizes: [...new Set(product.variants.map((v) => v.size))],
        }
      : {},
  };
}

async function upsertIncomingComment(c: IgCommentEvent, reelId: string | null) {
  await prisma.instagramComment.upsert({
    where: { commentId: c.commentId },
    create: {
      commentId: c.commentId,
      mediaId: c.mediaId || null,
      reelId,
      username: c.username || "",
      fromId: c.fromId || null,
      text: c.text.slice(0, 2000),
      parentId: c.parentId || null,
      postedAt: new Date(),
    },
    update: {
      mediaId: c.mediaId || undefined,
      reelId: reelId || undefined,
      username: c.username || undefined,
      fromId: c.fromId || undefined,
      text: c.text.slice(0, 2000),
      parentId: c.parentId || undefined,
    },
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const verify =
    (await getSetting("instagram_verify_token")) ||
    process.env.INSTAGRAM_VERIFY_TOKEN ||
    "luxfabric_verify";

  if (mode === "subscribe" && token === verify && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  const enabled = (await getSetting("instagram_enabled")) === "true";
  const aiComments = (await getSetting("instagram_ai_comments", "true")) !== "false";
  const domain = await getAppUrl();
  const username = await getSetting("instagram_username", "luxfabricshop.uz");
  const hasToken = Boolean(await getSetting("instagram_page_token"));
  const igUserId = await getSetting("instagram_ig_user_id", "");

  return NextResponse.json({
    ok: true,
    enabled,
    aiComments,
    openaiConfigured: openaiConfigured(),
    username,
    hasPageToken: hasToken,
    igUserId: igUserId || null,
    webhookUrl: `${domain}/api/instagram`,
    storeReels: `${domain}/instagram`,
    dmDemo: `${domain}/instagram/dm`,
    admin: `${domain}/admin/instagram`,
    publishApi: `${domain}/api/admin/instagram/publish`,
    commentAutoReply: enabled && aiComments,
    webhookFields: ["messages", "comments"],
  });
}

export async function POST(req: Request) {
  const enabled = (await getSetting("instagram_enabled")) === "true";
  const aiComments = (await getSetting("instagram_ai_comments", "true")) !== "false";
  const pageToken = await getSetting("instagram_page_token");
  const body = await req.json().catch(() => ({}));

  const replies = await getSettings([
    "instagram_auto_reply_price",
    "instagram_auto_reply_size",
    "instagram_auto_reply_delivery",
    "instagram_auto_reply_default",
    "instagram_dm_welcome",
  ]);

  const results: Record<string, unknown> = {
    received: true,
    enabled,
    aiComments,
  };

  // --- Izohlar (comments) ---
  const comments = extractComments(body);
  if (comments.length > 0) {
    const commentResults: Array<{ id: string; replied: boolean; reason?: string; stored?: boolean }> =
      [];
    for (const c of comments) {
      try {
        const { ctx, reelId } = await productContextFromMedia(c.mediaId);
        await upsertIncomingComment(c, reelId);

        if (!enabled || !pageToken) {
          commentResults.push({ id: c.commentId, replied: false, reason: "disabled", stored: true });
          continue;
        }
        if (!aiComments) {
          commentResults.push({ id: c.commentId, replied: false, reason: "ai_off", stored: true });
          continue;
        }
        // O‘z javobimizga (parent reply) qayta javob bermaslik — faqat ildiz izohlar
        if (c.parentId) {
          commentResults.push({ id: c.commentId, replied: false, reason: "reply_thread", stored: true });
          continue;
        }

        const already = await prisma.instagramCommentReply.findUnique({
          where: { commentId: c.commentId },
        });
        if (already) {
          commentResults.push({ id: c.commentId, replied: false, reason: "already", stored: true });
          continue;
        }

        const recent = await prisma.instagramCommentReply.count({
          where: { createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) } },
        });
        if (recent >= 8) {
          commentResults.push({ id: c.commentId, replied: false, reason: "rate_limit", stored: true });
          continue;
        }

        const ai = await generateShopReply(c.text, ctx);
        const graphRes = await replyToInstagramComment(c.commentId, ai.reply);
        const replyId = typeof graphRes.id === "string" ? graphRes.id : null;

        await prisma.instagramCommentReply.create({
          data: {
            commentId: c.commentId,
            mediaId: c.mediaId || null,
            commentText: c.text.slice(0, 500),
            replyText: ai.reply,
            source: ai.source,
          },
        });
        await prisma.instagramComment.update({
          where: { commentId: c.commentId },
          data: {
            ourReplyText: ai.reply.slice(0, 900),
            ourReplyId: replyId,
            repliedAt: new Date(),
          },
        });
        commentResults.push({ id: c.commentId, replied: true, stored: true });
      } catch (e) {
        commentResults.push({
          id: c.commentId,
          replied: false,
          reason: e instanceof Error ? e.message : "error",
        });
      }
    }
    results.comments = commentResults;
  }

  // --- DM ---
  const messaging = extractMessaging(body);
  if (enabled && pageToken && messaging) {
    try {
      const ai = await generateShopReply(messaging.text, {});
      let reply = ai.reply;
      if (ai.source === "template") {
        if (/narx|price|qancha/i.test(messaging.text) && replies.instagram_auto_reply_price) {
          reply = replies.instagram_auto_reply_price;
        } else if (/olcham|size/i.test(messaging.text) && replies.instagram_auto_reply_size) {
          reply = replies.instagram_auto_reply_size;
        } else if (/yetkaz|dostavka|delivery/i.test(messaging.text) && replies.instagram_auto_reply_delivery) {
          reply = replies.instagram_auto_reply_delivery;
        } else if (replies.instagram_auto_reply_default || replies.instagram_dm_welcome) {
          if (!/salom|assalom/i.test(messaging.text)) {
            reply =
              replies.instagram_auto_reply_default ||
              replies.instagram_dm_welcome ||
              templateShopReply(messaging.text);
          }
        }
      }
      await sendInstagramDm(messaging.senderId, reply);
      results.dm = { replied: true, source: ai.source };
    } catch {
      results.dm = { replied: false };
    }
  }

  return NextResponse.json({ ...results, handledBy: "luxfabric-instagram" });
}
