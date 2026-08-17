/**
 * Demo/test savdo raqamlarini 0 qiladi.
 * Katalog (mahsulotlar, ombor) qoladi.
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: process.argv[2] || ".env" });

const prisma = new PrismaClient();

async function main() {
  const before = {
    orders: await prisma.order.count(),
    customers: await prisma.customer.count(),
    products: await prisma.product.count(),
  };

  await prisma.scanEvent.updateMany({ data: { orderId: null } });
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.updateMany({ data: { soldCount: 0 } });

  const after = {
    orders: await prisma.order.count(),
    customers: await prisma.customer.count(),
    products: await prisma.product.count(),
    sold: await prisma.product.aggregate({ _sum: { soldCount: true } }),
  };

  console.log("[reset-dashboard] oldin:", before);
  console.log("[reset-dashboard] keyin:", {
    orders: after.orders,
    customers: after.customers,
    products: after.products,
    soldCountSum: after.sold._sum.soldCount || 0,
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
