import { prisma } from "@/lib/prisma";

export async function getFeaturedProducts() {
  return prisma.product.findMany({
    where: { status: "ACTIVE", featured: true },
    include: { images: { orderBy: { sortOrder: "asc" } }, category: true },
    orderBy: { soldCount: "desc" },
  });
}

export async function getProducts(categorySlug?: string) {
  return prisma.product.findMany({
    where: {
      status: "ACTIVE",
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    },
    include: { images: { orderBy: { sortOrder: "asc" } }, category: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findFirst({
    where: { slug, status: "ACTIVE" },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      category: true,
      variants: {
        include: {
          stocks: true,
        },
      },
    },
  });
}

export async function getCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

export async function getDashboardStats() {
  const [productCount, orderCount, revenue, customers, recentOrders, warehouses] =
    await Promise.all([
      prisma.product.count(),
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { total: true }, where: { paymentStatus: "PAID" } }),
      prisma.customer.count(),
      prisma.order.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: { items: { include: { product: true, variant: true } } },
      }),
      prisma.warehouse.findMany({
        include: { _count: { select: { stocks: true } }, stocks: { select: { quantity: true } } },
      }),
    ]);

  const topProducts = await prisma.product.findMany({
    take: 5,
    orderBy: { soldCount: "desc" },
    include: { images: true },
  });

  return {
    productCount,
    orderCount,
    revenue: revenue._sum.total || 0,
    customers,
    recentOrders,
    topProducts,
    warehouses: warehouses.map((w) => ({
      ...w,
      totalStock: w.stocks.reduce((s, x) => s + x.quantity, 0),
    })),
  };
}
