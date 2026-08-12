import { prisma } from "@/lib/prisma";

/** Tasdiqlangan sharhlardan mahsulot rating ni yangilash */
export async function refreshProductRating(productId: string) {
  const agg = await prisma.review.aggregate({
    where: { productId, status: "APPROVED" },
    _avg: { rating: true },
    _count: { _all: true },
  });
  if (agg._count._all < 1) return;
  const avg = agg._avg.rating;
  if (typeof avg !== "number") return;
  await prisma.product.update({
    where: { id: productId },
    data: { rating: Math.round(avg * 10) / 10 },
  });
}

export async function getApprovedReviews(productId: string, take = 20) {
  return prisma.review.findMany({
    where: { productId, status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    take,
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
}

export async function getReviewStats(productId: string) {
  const approved = await prisma.review.findMany({
    where: { productId, status: "APPROVED" },
    select: { rating: true },
  });
  const count = approved.length;
  const avg =
    count > 0 ? approved.reduce((s, r) => s + r.rating, 0) / count : null;
  return { count, avg };
}
