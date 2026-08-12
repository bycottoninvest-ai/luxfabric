import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  productId: z.string().min(1),
  metaCatalogProductId: z.string().max(64).optional().nullable(),
});

/** Instagram Shopping katalog ID (stub) — Shop + Facebook Login keyin ishlaydi. */
export async function PATCH(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const raw = (body.metaCatalogProductId || "").trim();
    const product = await prisma.product.update({
      where: { id: body.productId },
      data: { metaCatalogProductId: raw || null },
      select: { id: true, slug: true, metaCatalogProductId: true },
    });
    return NextResponse.json({ ok: true, product });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Saqlash xatosi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
