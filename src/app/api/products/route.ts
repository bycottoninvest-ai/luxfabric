import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sizesForGender } from "@/lib/product-options";
import {
  PRODUCT_CATEGORY_SLUGS,
  categoryNameForSlug,
  isProductCategorySlug,
} from "@/lib/product-categories";

const schema = z.object({
  name: z.string().min(2),
  price: z.number().int().positive(),
  oldPrice: z.number().int().positive().optional().nullable(),
  categorySlug: z
    .string()
    .refine((s) => isProductCategorySlug(s), {
      message: `Noto‘g‘ri kategoriya. Ruxsat: ${PRODUCT_CATEGORY_SLUGS.slice(0, 8).join(", ")}…`,
    }),
  gender: z.enum(["WOMEN", "MEN", "KIDS"]),
  description: z.string().min(5),
  fabric: z.string().min(2),
  care: z.string().min(2),
  images: z
    .array(
      z.union([
        z.string().min(1),
        z.object({
          url: z.string().min(1),
          color: z.string().optional().nullable(),
        }),
      ])
    )
    .min(1),
  colors: z
    .array(
      z.object({
        color: z.string().min(1),
        colorHex: z.string().min(3),
      })
    )
    .min(1),
  sizes: z.array(z.string()).min(1),
  stockCentral: z.number().int().min(0).optional().default(40),
  stockBranch: z.number().int().min(0).optional().default(15),
});

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

function uniqueSku(colorHex: string, size: string) {
  const hex = colorHex.replace("#", "").slice(0, 6).toUpperCase() || "XXX";
  const sizePart = size.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase() || "SZ";
  const rand = randomBytes(3).toString("hex").toUpperCase();
  return `LF-${hex}-${sizePart}-${rand}`.slice(0, 40);
}

function formatError(err: unknown): string {
  if (err instanceof z.ZodError) {
    const first = err.issues[0];
    return first ? `${first.path.join(".") || "maydon"}: ${first.message}` : "Validation xato";
  }
  if (err instanceof Error) return err.message;
  return "Xatolik";
}

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const categoryName = categoryNameForSlug(body.categorySlug);
    let category = await prisma.category.findUnique({ where: { slug: body.categorySlug } });
    if (!category) {
      category = await prisma.category.create({
        data: {
          name: categoryName,
          slug: body.categorySlug,
        },
      });
    } else if (category.name !== categoryName) {
      category = await prisma.category.update({
        where: { id: category.id },
        data: { name: categoryName },
      });
    }

    const allowed = sizesForGender(body.gender);
    const sizes = body.sizes.filter((s) => allowed.includes(s));
    if (sizes.length === 0) {
      return NextResponse.json({ error: "Kamida 1 ta o‘lcham tanlang" }, { status: 400 });
    }

    const slugBase = slugify(body.name) || `product-${Date.now()}`;
    const slug = `${slugBase}-${randomBytes(3).toString("hex")}`;
    const warehouses = await prisma.warehouse.findMany({ where: { isActive: true } });

    const variantCreates = [];
    for (const c of body.colors) {
      for (const size of sizes) {
        variantCreates.push({
          sku: uniqueSku(c.colorHex, size),
          color: c.color,
          colorHex: c.colorHex,
          size,
          barcode: `LF${Math.floor(100000000 + Math.random() * 899999999)}`,
        });
      }
    }

    const product = await prisma.product.create({
      data: {
        name: body.name,
        slug,
        description: body.description,
        fabric: body.fabric,
        care: body.care,
        gender: body.gender,
        price: body.price,
        oldPrice: body.oldPrice || null,
        featured: true,
        categoryId: category.id,
        images: {
          create: body.images.map((item, i) => {
            const url = typeof item === "string" ? item : item.url;
            const explicitColor = typeof item === "string" ? null : item.color || null;
            const color = explicitColor || body.colors[i % body.colors.length]?.color || null;
            return {
              url,
              alt: color ? `${body.name} — ${color}` : `${body.name} ${i + 1}`,
              color,
              sortOrder: i,
            };
          }),
        },
        variants: { create: variantCreates },
      },
      include: { variants: true, images: true },
    });

    const stockRows = [];
    for (const variant of product.variants) {
      for (const wh of warehouses) {
        const quantity = wh.isCentral ? body.stockCentral : body.stockBranch;
        if (quantity <= 0 && !wh.isCentral) continue;
        stockRows.push({
          warehouseId: wh.id,
          variantId: variant.id,
          quantity,
        });
      }
    }
    if (stockRows.length > 0) {
      await prisma.warehouseStock.createMany({ data: stockRows });
    }

    return NextResponse.json({
      id: product.id,
      slug: product.slug,
      gender: product.gender,
      variants: product.variants.length,
      images: product.images.length,
      distributedTo: ["website", "warehouse", "analytics", "telegram-ready", "instagram-ready"],
    });
  } catch (err) {
    return NextResponse.json({ error: formatError(err) }, { status: 400 });
  }
}

export async function GET() {
  const products = await prisma.product.findMany({
    include: { images: true, category: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(products);
}
