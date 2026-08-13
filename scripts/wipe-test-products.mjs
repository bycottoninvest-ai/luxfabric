/**
 * One-shot: barcha mahsulotlarni tozalash (test → real launch).
 *
 * - Buyurtma / ScanEvent bo‘lsa → soft-delete (status=DELETED), metaCatalogProductId=null
 * - Aks holda → hard delete (cascade: images, variants, stocks, reviews)
 * - Reel/Story productId unlink; ixtiyoriy --clear-ig: lokal reels/stories o‘chirish
 * - Instagram Graph katalog o‘chirish YO‘Q (token invalid bo‘lishi mumkin)
 *
 * Ishlatish:
 *   node scripts/wipe-test-products.mjs --dry-run
 *   node scripts/wipe-test-products.mjs --confirm --clear-ig
 *   node scripts/wipe-test-products.mjs --env .env --confirm
 *
 * DATABASE_URL kerak. Vercel Sensitive bo‘lsa lokal pull ishlamaydi —
 * production uchun: node scripts/run-prod-wipe-via-admin.mjs --confirm --clear-ig
 * Buyurtmalar o‘chirilmaydi.
 */
import fs from "fs";
import { config as loadDotenv } from "dotenv";
import { PrismaClient } from "@prisma/client";

const argv = process.argv.slice(2);
const args = new Set(argv);
const dryRun = args.has("--dry-run");
const confirm = args.has("--confirm");
const clearIg = args.has("--clear-ig");
const envIdx = argv.indexOf("--env");
const envFile =
  envIdx >= 0 && argv[envIdx + 1]
    ? argv[envIdx + 1]
    : process.env.WIPE_ENV_FILE || "";

// Agar DATABASE_URL allaqachon berilgan bo‘lsa (masalan: vercel env run) — ustiga yozma
const hadUrl = Boolean(process.env.DATABASE_URL?.trim());
if (envFile && fs.existsSync(envFile)) {
  loadDotenv({ path: envFile, override: !hadUrl });
} else if (!hadUrl) {
  loadDotenv();
}

const dbUrl = (process.env.DATABASE_URL || "").trim();
if (!dbUrl || dbUrl === "[SENSITIVE]" || !/^postgres(ql)?:\/\//i.test(dbUrl)) {
  console.error(
    "DATABASE_URL yaroqsiz yoki Sensitive placeholder.\n" +
      "Ishlatish: npx vercel env run -e production -- node scripts/wipe-test-products.mjs --confirm --clear-ig\n" +
      "yoki: node scripts/wipe-test-products.mjs --env .env --confirm"
  );
  process.exit(1);
}

const prisma = new PrismaClient();

function stamp() {
  return Date.now().toString(36);
}

async function wipeOne(id) {
  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      status: true,
      metaCatalogProductId: true,
      _count: { select: { orderItems: true } },
    },
  });

  if (!product || product.status === "DELETED") {
    return { mode: "skip", alreadyGone: true };
  }

  if (dryRun) {
    const variantIds = (
      await prisma.productVariant.findMany({
        where: { productId: id },
        select: { id: true },
      })
    ).map((v) => v.id);

    const [scanCount, variantOrderCount] = await Promise.all([
      variantIds.length === 0
        ? 0
        : prisma.scanEvent.count({ where: { variantId: { in: variantIds } } }),
      variantIds.length === 0
        ? 0
        : prisma.orderItem.count({ where: { variantId: { in: variantIds } } }),
    ]);
    const hasOrders = product._count.orderItems > 0 || variantOrderCount > 0;
    const canHard = !hasOrders && scanCount === 0;
    return {
      mode: canHard ? "hard" : "soft",
      dryRun: true,
      hadMeta: Boolean(product.metaCatalogProductId?.trim()),
    };
  }

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
      ? 0
      : prisma.scanEvent.count({ where: { variantId: { in: variantIds } } }),
    variantIds.length === 0
      ? 0
      : prisma.orderItem.count({ where: { variantId: { in: variantIds } } }),
  ]);

  const hasOrders = product._count.orderItems > 0 || variantOrderCount > 0;
  const canHard = !hasOrders && scanCount === 0;

  if (canHard) {
    await prisma.product.delete({ where: { id } });
    return { mode: "hard" };
  }

  await prisma.product.update({
    where: { id },
    data: {
      status: "DELETED",
      featured: false,
      metaCatalogProductId: null,
      slug: `${product.slug}-deleted-${stamp()}`.slice(0, 64),
    },
  });
  return { mode: "soft" };
}

async function main() {
  if (!dryRun && !confirm) {
    console.error(
      "Xavfsizlik: --dry-run (hisob) yoki --confirm (o‘chirish) kerak.\n" +
        "  node scripts/wipe-test-products.mjs --dry-run\n" +
        "  node scripts/wipe-test-products.mjs --confirm --clear-ig"
    );
    process.exit(1);
  }

  const before = {
    total: await prisma.product.count(),
    active: await prisma.product.count({ where: { status: "ACTIVE" } }),
    deleted: await prisma.product.count({ where: { status: "DELETED" } }),
    other: await prisma.product.count({
      where: { status: { notIn: ["ACTIVE", "DELETED"] } },
    }),
    withMeta: await prisma.product.count({
      where: { metaCatalogProductId: { not: null } },
    }),
    reels: await prisma.instagramReel.count(),
    stories: await prisma.instagramStory.count(),
    orders: await prisma.order.count(),
  };

  console.log("OLDIN:", JSON.stringify(before, null, 2));

  // ACTIVE + boshqa non-DELETED (DRAFT va h.k.)
  const targets = await prisma.product.findMany({
    where: { status: { not: "DELETED" } },
    select: { id: true, slug: true, status: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Nishan: ${targets.length} ta (status != DELETED)`);

  let hard = 0;
  let soft = 0;
  let skip = 0;

  for (const t of targets) {
    const r = await wipeOne(t.id);
    if (r.mode === "hard") hard += 1;
    else if (r.mode === "soft") soft += 1;
    else skip += 1;
    console.log(
      `  ${r.dryRun ? "[dry] " : ""}${r.mode.padEnd(5)} ${t.slug} (${t.status})`
    );
  }

  let igCleared = { reels: 0, stories: 0, comments: 0 };
  if (clearIg) {
    if (dryRun) {
      igCleared = {
        reels: before.reels,
        stories: before.stories,
        comments: await prisma.instagramComment.count(),
      };
      console.log("[dry] --clear-ig: lokal reels/stories/comments o‘chiriladi:", igCleared);
    } else {
      // Reply → Comment → Reel/Story (Reply.commentId — IG id, FK emas)
      await prisma.instagramCommentReply.deleteMany({});
      const delComments = await prisma.instagramComment.deleteMany({});
      const delStories = await prisma.instagramStory.deleteMany({});
      const delReels = await prisma.instagramReel.deleteMany({});
      igCleared = {
        reels: delReels.count,
        stories: delStories.count,
        comments: delComments.count,
      };
      console.log("IG lokal tozalandi:", igCleared);
    }
  }

  const after = dryRun
    ? null
    : {
        total: await prisma.product.count(),
        active: await prisma.product.count({ where: { status: "ACTIVE" } }),
        deleted: await prisma.product.count({ where: { status: "DELETED" } }),
        visibleCatalog: await prisma.product.count({
          where: { status: "ACTIVE" },
        }),
        withMeta: await prisma.product.count({
          where: { metaCatalogProductId: { not: null } },
        }),
        reels: await prisma.instagramReel.count(),
        stories: await prisma.instagramStory.count(),
        orders: await prisma.order.count(),
      };

  if (after) console.log("KEYIN:", JSON.stringify(after, null, 2));

  console.log(
    JSON.stringify(
      {
        dryRun,
        clearIg,
        processed: targets.length,
        hard,
        soft,
        skip,
        igCleared: clearIg ? igCleared : undefined,
        note: "Instagram Graph katalog o‘chirilmadi — token invalid bo‘lsa Admin → Meta/DM dan qayta ulash kerak",
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error("FAIL", e.code || "", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
