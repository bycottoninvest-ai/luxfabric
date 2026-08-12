import { NextResponse } from "next/server";
import { handleClickWebhook } from "@/lib/click-webhook";

/** Click merchant cabinet → Prepare URL */
export async function POST(req: Request) {
  const result = await handleClickWebhook(req, 0);
  return NextResponse.json(result);
}
