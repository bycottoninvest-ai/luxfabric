import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE, readSessionToken } from "@/lib/admin-session";

async function requireAdmin() {
  const jar = await cookies();
  return readSessionToken(jar.get(ADMIN_COOKIE)?.value);
}

/** Test savdo raqamlarini 0 qiladi — katalog (mahsulotlar/ombor) qoladi. */
export async function POST() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const before = {
      orders: await prisma.order.count(),
      customers: await prisma.customer.count(),
    };

    await prisma.scanEvent.updateMany({ data: { orderId: null } });
    await prisma.order.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.product.updateMany({ data: { soldCount: 0 } });

    const after = {
      orders: await prisma.order.count(),
      customers: await prisma.customer.count(),
      sold: await prisma.product.aggregate({ _sum: { soldCount: true } }),
    };

    return NextResponse.json({
      ok: true,
      deletedOrders: before.orders,
      deletedCustomers: before.customers,
      remainingOrders: after.orders,
      remainingCustomers: after.customers,
      soldCountSum: after.sold._sum.soldCount ?? 0,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Xatolik" },
      { status: 500 }
    );
  }
}
