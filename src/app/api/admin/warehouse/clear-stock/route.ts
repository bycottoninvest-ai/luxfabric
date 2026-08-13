import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE, readSessionToken } from "@/lib/admin-session";

async function requireAdmin() {
  const jar = await cookies();
  return readSessionToken(jar.get(ADMIN_COOKIE)?.value);
}

/** Barcha ombor qoldiqlarini 0 qiladi — mahsulotlar/buyurtmalar o‘chirilmaydi. */
export async function POST() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const before = await prisma.warehouseStock.aggregate({
      _sum: { quantity: true },
      _count: { _all: true },
    });

    const result = await prisma.warehouseStock.updateMany({
      data: { quantity: 0 },
    });

    return NextResponse.json({
      ok: true,
      updatedRows: result.count,
      previousQtySum: before._sum.quantity ?? 0,
      stockRows: before._count._all,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Xatolik" },
      { status: 500 }
    );
  }
}
