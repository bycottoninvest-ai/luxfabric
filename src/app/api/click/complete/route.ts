import { NextResponse } from "next/server";
import { handleClickWebhook } from "@/lib/click-webhook";

/** Click merchant cabinet → Complete URL */
export async function POST(req: Request) {
  const result = await handleClickWebhook(req, 1);
  return NextResponse.json(result);
}