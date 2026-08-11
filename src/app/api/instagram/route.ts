import { NextResponse } from "next/server";
import { getSetting, getAppUrl, getSettings } from "@/lib/settings";
import { sendInstagramDm } from "@/lib/instagram-graph";

function pickReply(text: string, replies: Record<string, string>) {
  if (/narx|price|qancha/i.test(text)) return replies.price;
  if (/olcham|size|\bm\b|\bl\b|xl/i.test(text)) return replies.size;
  if (/yetkaz|dostavka|qachon|delivery/i.test(text)) return replies.delivery;
  if (/operator|odam|manager/i.test(text)) {
    return "Operatorga ulayman. Tez orada javob beramiz.";
  }
  return replies.fallback;
}

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

  const messaging = extractMessaging(body);
  if (enabled && pageToken && messaging) {
    const reply = pickReply(messaging.text, {
      price:
        replies.instagram_auto_reply_price ||
        "LUXFABRIC mahsulotlari haqida: /instagram",
      size: replies.instagram_auto_reply_size || "O‘lchamlar mavjud: S-XXL",
      delivery: replies.instagram_auto_reply_delivery || "1–2 kun ichida yetkazamiz",
      fallback: replies.instagram_auto_reply_default || replies.instagram_dm_welcome || "Salom!",
    });

    try {
      await sendInstagramDm(messaging.senderId, reply);
      return NextResponse.json({ received: true, replied: true });
    } catch {
      return NextResponse.json({ received: true, replied: false });
    }
  }

  return NextResponse.json({ received: true, enabled, handledBy: "luxfabric-instagram" });
}
