import { getFeaturedProducts } from "@/lib/catalog";
import { getSettings, getAppUrl } from "@/lib/settings";
import { formatSom } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { InstagramWorkspace } from "@/components/admin/InstagramWorkspace";

export default async function AdminInstagramPage() {
  const [products, allProducts, settings, domain, reels, music, stories] = await Promise.all([
    getFeaturedProducts(),
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: { id: true, name: true, slug: true, price: true },
    }),
    getSettings([
      "app_domain",
      "instagram_username",
      "instagram_enabled",
      "instagram_page_token",
      "instagram_verify_token",
      "instagram_app_secret",
      "instagram_ig_user_id",
      "instagram_dm_welcome",
      "instagram_auto_reply_price",
      "instagram_auto_reply_size",
      "instagram_auto_reply_delivery",
      "instagram_auto_reply_default",
    ]),
    getAppUrl(),
    prisma.instagramReel.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        music: true,
        product: { select: { id: true, name: true, slug: true, price: true } },
      },
    }),
    prisma.instagramMusic.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { reels: true } } },
    }),
    prisma.instagramStory.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        product: { select: { id: true, name: true, slug: true, price: true } },
      },
    }),
  ]);

  const initial = {
    app_domain: settings.app_domain || "https://luxfabricshop.uz",
    instagram_username: settings.instagram_username || "luxfabric.shop",
    instagram_enabled: settings.instagram_enabled || "false",
    instagram_page_token: settings.instagram_page_token || "",
    instagram_verify_token: settings.instagram_verify_token || "luxfabric_verify",
    instagram_app_secret: settings.instagram_app_secret || "",
    instagram_ig_user_id: settings.instagram_ig_user_id || "",
    instagram_dm_welcome:
      settings.instagram_dm_welcome ||
      "Assalomu alaykum! LUXFABRIC AI yordamchi. Narx, o‘lcham yoki yetkazib berish haqida so‘rang 👋",
    instagram_auto_reply_price:
      settings.instagram_auto_reply_price ||
      "Nice Print Futbolka — 129 000 so‘m. Shop Now: /product/nice-print-futbolka?from=instagram",
    instagram_auto_reply_size:
      settings.instagram_auto_reply_size ||
      "Hozir omborda: S / M / L / XL / XXL. Qaysi o‘lcham kerak?",
    instagram_auto_reply_delivery:
      settings.instagram_auto_reply_delivery ||
      "Butun O‘zbekiston bo‘ylab 1–2 kun. Eng yaqin ombordan jo‘natamiz.",
    instagram_auto_reply_default:
      settings.instagram_auto_reply_default ||
      "Salom! Narx, o‘lcham, yetkazib berish yoki buyurtma havolasini so‘rashingiz mumkin. Operator: «operator» deb yozing.",
  };

  return (
    <div className="pb-16 text-white">
      <InstagramWorkspace
        reels={reels}
        music={music}
        stories={stories}
        products={allProducts}
        featuredProducts={products.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          priceLabel: formatSom(p.price),
        }))}
        metaInitial={initial}
        domain={domain}
      />
    </div>
  );
}
