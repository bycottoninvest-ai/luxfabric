import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      events: { orderBy: { createdAt: "asc" } },
      warehouse: true,
      items: { include: { product: { include: { images: true } }, variant: true } },
    },
  });
  if (!order) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  return NextResponse.json(order);
}
