import { NextResponse } from "next/server";
import { handlePaynetRequest } from "@/lib/paynet-webhook";

/** Paynet Provider API — JSON-RPC 2.0 yoki SOAP XML */
export async function POST(req: Request) {
  const result = await handlePaynetRequest(req);
  if (result.xml) {
    return new NextResponse(result.xml, {
      status: 200,
      headers: { "content-type": "text/xml; charset=utf-8" },
    });
  }
  return NextResponse.json(result.json);
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "luxfabric-paynet",
    path: "/api/paynet",
    field: "order_id",
    methods: [
      "GetInformation",
      "PerformTransaction",
      "CheckTransaction",
      "CancelTransaction",
      "GetStatement",
      "ChangePassword",
    ],
  });
}
