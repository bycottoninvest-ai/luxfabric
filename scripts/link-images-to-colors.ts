/**
 * Mavjud mahsulot rasmlarini ranglarga bog‘lash + yetishmagan ranglar uchun rasm qo‘shish
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EXTRA_BY_COLOR: Record<string, string> = {
  Yashil: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800&q=80",
  Qora: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&q=80",
  Oq: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80",
  "Ko'k": "https://images.unsplash.com/photo-1618354691438-25bc04584c23?w=800&q=80",
  Bej: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80",
  Kulrang: "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800&q=80",
  Qizil: "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=800&q=80",
};

async function main() {
  const products = await prisma.product.findMany({
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: true,
    },
  });

  for (const p of products) {
    const colors = [...new Set(p.variants.map((v) => v.color))];
    if (colors.length === 0) continue;

    // Mavjud rasmlarni ranglarga biriktirish
    for (let i = 0; i < p.images.length; i++) {
      const color = colors[i % colors.length];
      await prisma.productImage.update({
        where: { id: p.images[i].id },
        data: {
          color,
          alt: `${p.name} — ${color}`,
        },
      });
    }

    const linked = new Set(
      (
        await prisma.productImage.findMany({
          where: { productId: p.id },
          select: { color: true },
        })
      )
        .map((x) => x.color)
        .filter(Boolean)
    );

    let sort = p.images.length;
    for (const color of colors) {
      if (linked.has(color)) continue;
      const url = EXTRA_BY_COLOR[color] || p.images[0]?.url;
      if (!url) continue;
      await prisma.productImage.create({
        data: {
          productId: p.id,
          url,
          color,
          alt: `${p.name} — ${color}`,
          sortOrder: sort++,
        },
      });
      console.log(`+ ${p.slug}: ${color}`);
    }
  }

  console.log("Rasmlar ranglarga bog‘landi");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
