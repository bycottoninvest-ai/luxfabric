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

    // Barcha WarehouseStock qatorlari (shu jumladan DELETED mahsulotlar) → 0
    const result = await prisma.warehouseStock.updateMany({
      where: { quantity: { not: 0 } },
      data: { quantity: 0 },
    });

    const after = await prisma.warehouseStock.aggregate({
      _sum: { quantity: true },
    });
    const remaining = after._sum.quantity ?? 0;
    if (remaining !== 0) {
      // Ikkinchi urinish — qisman yangilanish qolmasin
      await prisma.warehouseStock.updateMany({ data: { quantity: 0 } });
    }

    const verify = await prisma.warehouseStock.aggregate({
      _sum: { quantity: true },
    });

    return NextResponse.json({
      ok: true,
      updatedRows: result.count,
      previousQtySum: before._sum.quantity ?? 0,
      stockRows: before._count._all,
      remainingQtySum: verify._sum.quantity ?? 0,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Xatolik" },
      { status: 500 }
    );
  }
}
