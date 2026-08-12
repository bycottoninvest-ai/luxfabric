import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSetting, getAppUrl, getSettings } from "@/lib/settings";
import { replyToInstagramComment, sendInstagramDm } from "@/lib/instagram-graph";
import { generateShopReply, templateShopReply } from "@/lib/shop-ai-reply";

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
      // O‘z javobimizga takroriy javob bermaslik (parent_id = asosiy izoh)
      out.push({
        commentId: String(v.id),
        text: String(v.text),
        mediaId: v.media?.id ? String(v.media.id) : undefined,
        fromId: v.from?.id ? String(v.from.id) : undefined,
        parentId: v.parent_id ? String(v.parent_id) : undefined,
      });
    }
  }
  return out;
}

async function productContextFromMedia(mediaId?: string) {
  if (!mediaId) return {};
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
  if (!product) return {};
  return {
    productName: product.name,
    productSlug: product.slug,
    price: product.price,
    fabric: product.fabric,
    sizes: [...new Set(product.variants.map((v) => v.size))],
  };
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
  const domain = await getAppUrl();
  const username = await getSetting("instagram_username", "luxfabricshop.uz");
  const hasToken = Boolean(await getSetting("instagram_page_token"));
  const igUserId = await getSetting("instagram_ig_user_id", "");

  return NextResponse.json({
    ok: true,
    enabled,
    username,
    hasPageToken: hasToken,
    igUserId: igUserId || null,
    webhookUrl: `${domain}/api/instagram`,
    storeReels: `${domain}/instagram`,
    dmDemo: `${domain}/instagram/dm`,
    admin: `${domain}/admin/instagram`,
    publishApi: `${domain}/api/admin/instagram/publish`,
    commentAutoReply: true,
  });
}

export async function POST(req: Request) {
  const enabled = (await getSetting("instagram_enabled")) === "true";
  const pageToken = await getSetting("instagram_page_token");
  const body = await req.json().catch(() => ({}));

  const replies = await getSettings([
    "instagram_auto_reply_price",
    "instagram_auto_reply_size",
    "instagram_auto_reply_delivery",
    "instagram_auto_reply_default",
    "instagram_dm_welcome",
  ]);

  const results: Record<string, unknown> = { received: true, enabled };

  // --- Izohlar (comments) ---
  const comments = extractComments(body);
  if (enabled && pageToken && comments.length > 0) {
    const commentResults: Array<{ id: string; replied: boolean; reason?: string }> = [];
    for (const c of comments) {
      try {
        const already = await prisma.instagramCommentReply.findUnique({
          where: { commentId: c.commentId },
        });
        if (already) {
          commentResults.push({ id: c.commentId, replied: false, reason: "already" });
          continue;
        }

        // Oxirgi 2 daqiqada > 8 javob — spam himoya
        const recent = await prisma.instagramCommentReply.count({
          where: { createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) } },
        });
        if (recent >= 8) {
          commentResults.push({ id: c.commentId, replied: false, reason: "rate_limit" });
          continue;
        }

        const ctx = await productContextFromMedia(c.mediaId);
        const ai = await generateShopReply(c.text, ctx);
        await replyToInstagramComment(c.commentId, ai.reply);
        await prisma.instagramCommentReply.create({
          data: {
            commentId: c.commentId,
            mediaId: c.mediaId || null,
            commentText: c.text.slice(0, 500),
            replyText: ai.reply,
            source: ai.source,
          },
        });
        commentResults.push({ id: c.commentId, replied: true });
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
      // Sozlamalardagi shablonlar AI ishlamasa ham ustunlik qilishi mumkin emas —
      // AI + templateShopReply allaqachon shablon. Maxsus sozlama bo‘lsa, narx/olcham uchun qo‘llaymiz.
      let reply = ai.reply;
      if (ai.source === "template") {
        if (/narx|price|qancha/i.test(messaging.text) && replies.instagram_auto_reply_price) {
          reply = replies.instagram_auto_reply_price;
        } else if (/olcham|size/i.test(messaging.text) && replies.instagram_auto_reply_size) {
          reply = replies.instagram_auto_reply_size;
        } else if (/yetkaz|dostavka|delivery/i.test(messaging.text) && replies.instagram_auto_reply_delivery) {
          reply = replies.instagram_auto_reply_delivery;
        } else if (replies.instagram_auto_reply_default || replies.instagram_dm_welcome) {
          // Umumiy fallback — AI shablon yaxshiroq bo‘lishi mumkin
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
