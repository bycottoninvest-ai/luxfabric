import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateShopReply } from "@/lib/shop-ai-reply";
import { refreshProductRating } from "@/lib/reviews";

const postSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  text: z.string().max(2000).optional().default(""),
  customerName: z.string().min(1).max(80),
  customerPhone: z.string().max(32).optional(),
  orderNumber: z.string().max(64).optional(),
  photoUrls: z.array(z.string().min(1).max(500)).max(3).optional(),
});

function normPhone(p: string) {
  return p.replace(/\D/g, "").slice(-9);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "productId kerak" }, { status: 400 });
  }
  const reviews = await prisma.review.findMany({
    where: { productId, status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      id: true,
      rating: true,
      text: true,
      photoUrls: true,
      customerName: true,
      shopReply: true,
      shopRepliedAt: true,
      createdAt: true,
    },
  });
  const count = reviews.length;
  const avg = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : null;
  return NextResponse.json({ reviews, count, avg });
}

export async function POST(req: Request) {
  try {
    const body = postSchema.parse(await req.json());
    const product = await prisma.product.findUnique({
      where: { id: body.productId },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        fabric: true,
        variants: { select: { size: true }, take: 40 },
      },
    });
    if (!product) {
      return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 });
    }

    let orderId: string | null = null;
    let status = "PENDING";

    if (body.orderNumber?.trim() && body.customerPhone?.trim()) {
      const order = await prisma.order.findFirst({
        where: {
          orderNumber: body.orderNumber.trim(),
          items: { some: { productId: product.id } },
        },
        select: { id: true, customerPhone: true, status: true },
      });
      if (order && normPhone(order.customerPhone) === normPhone(body.customerPhone)) {
        orderId = order.id;
        status = "APPROVED";
      }
    }

    const sizes = [...new Set(product.variants.map((v) => v.size))];
    let shopReply: string | null = null;
    let shopRepliedAt: Date | null = null;

    if (body.text?.trim()) {
      const ai = await generateShopReply(body.text, {
        productName: product.name,
        productSlug: product.slug,
        price: product.price,
        fabric: product.fabric,
        sizes,
      });
      shopReply = ai.reply;
      shopRepliedAt = new Date();
    }

    const review = await prisma.review.create({
      data: {
        productId: product.id,
        orderId,
        rating: body.rating,
        text: body.text?.trim() || "",
        photoUrls: body.photoUrls || [],
        customerName: body.customerName.trim(),
        customerPhone: body.customerPhone?.trim() || null,
        status,
        shopReply,
        shopRepliedAt,
      },
      select: {
        id: true,
        rating: true,
        text: true,
        photoUrls: true,
        customerName: true,
        shopReply: true,
        shopRepliedAt: true,
        createdAt: true,
        status: true,
      },
    });

    if (status === "APPROVED") {
      await refreshProductRating(product.id);
    }

    return NextResponse.json({
      ok: true,
      status: review.status,
      review:
        review.status === "APPROVED"
          ? {
              id: review.id,
              rating: review.rating,
              text: review.text,
              photoUrls: review.photoUrls,
              customerName: review.customerName,
              shopReply: review.shopReply,
              createdAt: review.createdAt,
            }
          : null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sharh xatosi" },
      { status: 400 }
    );
  }
}
