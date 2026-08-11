import { NextResponse } from "next/server";

/** Telegram webhook stub — keyin bot token bilan ulanadi */
export async function POST(req: Request) {
  const update = await req.json().catch(() => ({}));
  const text = update?.message?.text as string | undefined;
  const chatId = update?.message?.chat?.id;

  if (text?.startsWith("/tracking")) {
    const orderNo = text.split(/\s+/)[1] || "LF-080963";
    return NextResponse.json({
      method: "sendMessage",
      chat_id: chatId,
      text: `LUXFABRIC tracking\nBuyurtma: ${orderNo}\nStatus: Yo‘lda\nhttps://localhost:3000/track/${orderNo}`,
    });
  }

  return NextResponse.json({
    method: "sendMessage",
    chat_id: chatId,
    text: "LUXFABRIC bot\nBuyruqlar:\n/tracking LF-XXXXXX\n/stock\n/stats",
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    bots: ["customer-tracking", "warehouse-manager"],
    note: "TELEGRAM_BOT_TOKEN .env ga qo‘shilgach webhook ulanadi",
  });
}
