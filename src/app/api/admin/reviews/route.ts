import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE, readSessionToken } from "@/lib/admin-session";
import { refreshProductRating } from "@/lib/reviews";

async function requireAdmin() {
  const jar = await cookies();
  return readSessionToken(jar.get(ADMIN_COOKIE)?.value);
}

export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;

  const reviews = await prisma.review.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      product: { select: { id: true, name: true, slug: true } },
      order: { select: { orderNumber: true } },
    },
  });
  return NextResponse.json(reviews);
}

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["APPROVED", "REJECTED", "PENDING"]).optional(),
  shopReply: z.string().max(1000).nullable().optional(),
});

export async function PATCH(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = patchSchema.parse(await req.json());
    const data: {
      status?: string;
      shopReply?: string | null;
      shopRepliedAt?: Date | null;
    } = {};
    if (body.status) data.status = body.status;
    if (body.shopReply !== undefined) {
      data.shopReply = body.shopReply;
      data.shopRepliedAt = body.shopReply ? new Date() : null;
    }

    const review = await prisma.review.update({
      where: { id: body.id },
      data,
      include: { product: { select: { id: true } } },
    });

    if (body.status === "APPROVED" || body.status === "REJECTED") {
      await refreshProductRating(review.productId);
    }

    return NextResponse.json(review);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Xato" },
      { status: 400 }
    );
  }
}
