import { NextResponse } from "next/server";
import { handlePaymeRpc } from "@/lib/payme-webhook";

/** Payme Merchant API — bitta endpoint (JSON-RPC) */
export async function POST(req: Request) {
  const result = await handlePaymeRpc(req);
  return NextResponse.json(result);
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "luxfabric-payme",
    path: "/api/payme",
  });
}
