import { NextResponse } from "next/server";
import { handleClickWebhook } from "@/lib/click-webhook";

/** Click SHOP API — bitta URL (Prepare action=0 + Complete action=1) */
export async function POST(req: Request) {
  const result = await handleClickWebhook(req);
  return NextResponse.json(result);
}
