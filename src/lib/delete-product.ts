import { prisma } from "@/lib/prisma";
import { tryDeleteCatalogProduct } from "@/lib/instagram-graph";

export type DeleteProductResult = {
  ok: true;
  mode: "soft" | "hard";
  alreadyGone?: boolean;
  ig?: {
    attempted: boolean;
    ok: boolean;
    skipped?: boolean;
    error?: string;
    note?: string;
  };
};

/**
 * Mahsulotni tizimdan olib tashlaydi + Meta katalogdan best-effort.
 *
 * Buyurtma (OrderItem) yoki skan jurnali (ScanEvent) bo‘lsa — hard delete FK buzadi,
 * shuning uchun soft-delete: status=DELETED (katalog/ACTIVE filtrlardan yo‘qoladi).
 * Bog‘liq Reel/Story faqat unlink (productId=null), media o‘chirilmaydi.
 */
export async function deleteProduct(id: string): Promise<DeleteProductResult> {
  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      status: true,
      metaCatalogProductId: true,
      _count: {
        select: {
          orderItems: true,
          variants: true,
        },
      },
    },
  });

  if (!product) {
    return { ok: true, mode: "soft", alreadyGone: true };
  }

  const alreadyDeleted = product.status === "DELETED";

  const catalogId = product.metaCatalogProductId?.trim() || "";
  let ig: DeleteProductResult["ig"];

  if (catalogId) {
    const igResult = await tryDeleteCatalogProduct(catalogId);
    ig = {
      attempted: true,
      ok: igResult.ok,
      skipped: igResult.skipped,
      error: igResult.error,
      note: igResult.note,
    };
  } else {
    ig = {
      attempted: false,
      ok: false,
      skipped: true,
      note: alreadyDeleted
        ? "Allaqachon arxiv — Instagram katalog ID yo‘q"
        : "Instagram katalog ID yo‘q — faqat tizimdan o‘chirildi",
    };
  }

  // Reel/Story havolasini uzish (hard delete oldidan ham kerak)
  await prisma.instagramReel.updateMany({
    where: { productId: id },
    data: { productId: null },
  });
  await prisma.instagramStory.updateMany({
    where: { productId: id },
    data: { productId: null },
  });

  const variantIds = (
    await prisma.productVariant.findMany({
      where: { productId: id },
      select: { id: true },
    })
  ).map((v) => v.id);

  const [scanCount, variantOrderCount] = await Promise.all([
    variantIds.length === 0
      ? Promise.resolve(0)
      : prisma.scanEvent.count({ where: { variantId: { in: variantIds } } }),
    variantIds.length === 0
      ? Promise.resolve(0)
      : prisma.orderItem.count({ where: { variantId: { in: variantIds } } }),
  ]);

  const hasOrders = product._count.orderItems > 0 || variantOrderCount > 0;
  const canHard = !hasOrders && scanCount === 0;

  if (canHard) {
    await prisma.product.delete({ where: { id } });
    return { ok: true, mode: "hard", ig, alreadyGone: alreadyDeleted };
  }

  if (alreadyDeleted) {
    // Soft qoladi (buyurtma/skan bor) — meta tozalash
    if (catalogId) {
      await prisma.product.update({
        where: { id },
        data: { featured: false, metaCatalogProductId: null },
      });
    }
    return { ok: true, mode: "soft", alreadyGone: true, ig };
  }

  // Soft-delete: buyurtma tarixi saqlanadi
  const stamp = Date.now().toString(36);
  await prisma.product.update({
    where: { id },
    data: {
      status: "DELETED",
      featured: false,
      metaCatalogProductId: null,
      slug: `${product.slug}-deleted-${stamp}`.slice(0, 64),
    },
  });

  return { ok: true, mode: "soft", ig };
}
