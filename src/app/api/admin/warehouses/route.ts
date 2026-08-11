import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  warehouseId: z.string(),
  variantId: z.string(),
  quantity: z.number().int().min(0),
});

export async function PATCH(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const stock = await prisma.warehouseStock.upsert({
      where: {
        warehouseId_variantId: {
          warehouseId: body.warehouseId,
          variantId: body.variantId,
        },
      },
      update: { quantity: body.quantity },
      create: {
        warehouseId: body.warehouseId,
        variantId: body.variantId,
        quantity: body.quantity,
      },
    });
    return NextResponse.json(stock);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Xatolik" },
      { status: 400 }
    );
  }
}

export async function GET() {
  const regions = await prisma.region.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      warehouses: {
        include: {
          stocks: { select: { quantity: true } },
          _count: { select: { orders: true } },
        },
      },
    },
  });
  return NextResponse.json(regions);
}
