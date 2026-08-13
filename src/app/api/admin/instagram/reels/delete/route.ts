import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteInstagramReel } from "@/lib/delete-instagram-reel";

const bodySchema = z.object({
  id: z.string().min(1),
});

/**
 * POST /api/admin/instagram/reels/delete  { id }
 * Cloudflare/proxy ba’zan DELETE ni bloklaydi — UI shu endpointni ishlatadi.
 */
export async function POST(req: Request) {
  try {
    const body = bodySchema.parse(await req.json());
    const result = await deleteInstagramReel(body.id.trim());
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Xatolik";
    const status = message.includes("Required") || message.includes("id") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
