import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE, readSessionToken } from "@/lib/admin-session";
import {
  PRODUCT_CATEGORY_SLUGS,
  categoryNameForSlug,
  isProductCategorySlug,
} from "@/lib/product-categories";

async function requireAdmin() {
  const jar = await cookies();
  return readSessionToken(jar.get(ADMIN_COOKIE)?.value);
}

const schema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).optional(),
  price: z.number().int().positive().optional(),
  oldPrice: z.number().int().positive().nullable().optional(),
  description: z.string().min(5).optional(),
  fabric: z.string().min(2).optional(),
  care: z.string().min(2).optional(),
  status: z.enum(["ACTIVE", "DRAFT", "HIDDEN"]).optional(),
  categorySlug: z
    .string()
    .refine((s) => isProductCategorySlug(s), {
      message: `Noto‘g‘ri kategoriya. Ruxsat: ${PRODUCT_CATEGORY_SLUGS.slice(0, 8).join(", ")}…`,
    })
    .optional(),
  featured: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = schema.parse(await req.json());
    const existing = await prisma.product.findFirst({
      where: { id: body.id, status: { not: "DELETED" } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 });
    }

    let categoryId = existing.categoryId;
    if (body.categorySlug) {
      const categoryName = categoryNameForSlug(body.categorySlug);
      let category = await prisma.category.findUnique({ where: { slug: body.categorySlug } });
      if (!category) {
        category = await prisma.category.create({
          data: { name: categoryName, slug: body.categorySlug },
        });
      } else if (category.name !== categoryName) {
        category = await prisma.category.update({
          where: { id: category.id },
          data: { name: categoryName },
        });
      }
      categoryId = category.id;
    }

    const product = await prisma.product.update({
      where: { id: body.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.price !== undefined ? { price: body.price } : {}),
        ...(body.oldPrice !== undefined ? { oldPrice: body.oldPrice } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.fabric !== undefined ? { fabric: body.fabric } : {}),
        ...(body.care !== undefined ? { care: body.care } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.featured !== undefined ? { featured: body.featured } : {}),
        categoryId,
      },
      select: { id: true, name: true, slug: true, status: true, price: true },
    });

    return NextResponse.json({ ok: true, product });
  } catch (err) {
    if (err instanceof z.ZodError) {
      const first = err.issues[0];
      return NextResponse.json(
        { error: first ? `${first.path.join(".")}: ${first.message}` : "Validation xato" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Xatolik" },
      { status: 400 }
    );
  }
}
