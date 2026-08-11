import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const couriers = await prisma.courierPartner.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { assignedOrders: true } } },
  });
  return NextResponse.json(couriers);
}

const patchSchema = z.object({
  id: z.string(),
  isActive: z.boolean().optional(),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function PATCH(req: Request) {
  try {
    const body = patchSchema.parse(await req.json());
    const courier = await prisma.courierPartner.update({
      where: { id: body.id },
      data: {
        ...(typeof body.isActive === "boolean" ? { isActive: body.isActive } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
    });
    return NextResponse.json(courier);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Xatolik" },
      { status: 400 }
    );
  }
}
