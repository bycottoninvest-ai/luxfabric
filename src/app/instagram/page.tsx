import { ReelsShell } from "@/components/ReelsShell";
import { ReelsFeed } from "@/components/ReelsFeed";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import { getFeaturedProducts } from "@/lib/catalog";
import { formatSom } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { ShoppingBag } from "lucide-react";

type Props = { searchParams: Promise<{ reel?: string; p?: string }> };

export default async function InstagramReelsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const focusReel = sp.reel?.trim() || "";
  const focusProduct = sp.p?.trim() || "";

  const [reels, username, featured] = await Promise.all([
    prisma.instagramReel.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        music: { select: { title: true, artist: true, fileUrl: true } },
        product: { select: { name: true, slug: true, price: true } },
      },
    }),
    getSetting("instagram_username", "luxfabric"),
    getFeaturedProducts(),
  ]);

  // Instagram/Story dan kelganda shu Reel birinchi
  let ordered = [...reels];
  if (focusReel) {
    const idx = ordered.findIndex((r) => r.id === focusReel);
    if (idx > 0) {
      const [hit] = ordered.splice(idx, 1);
      ordered.unshift(hit);
    }
  } else if (focusProduct) {
    const idx = ordered.findIndex((r) => r.product?.slug === focusProduct);
    if (idx > 0) {
      const [hit] = ordered.splice(idx, 1);
      ordered.unshift(hit);
    }
  }

  const payload = ordered.map((r) => {
    const row = r as typeof r & { audioEmbedded?: boolean };
    return {
      id: r.id,
      title: r.title,
      caption: r.caption,
      videoUrl: r.videoUrl,
      buyButtonLabel: r.buyButtonLabel,
      showBuyButton: r.showBuyButton,
      audioEmbedded: Boolean(row.audioEmbedded) || /-mux\./i.test(r.videoUrl),
      music: r.music,
      product: r.product,
      username: username.replace(/^@/, ""),
    };
  });

  // Faqat mahsulot so‘ralgan va Reel yo‘q — featured dan shu modelni birinchi
  let featuredOrdered = featured;
  if (payload.length === 0 && focusProduct) {
    featuredOrdered = [
      ...featured.filter((p) => p.slug === focusProduct),
      ...featured.filter((p) => p.slug !== focusProduct),
    ];
  }

  return (
    <ReelsShell>
      <ReelsFeed reels={payload} focusId={focusReel || payload[0]?.id} />

      {payload.length === 0 && (
        <div className="space-y-3 px-0 pt-0">
          {featuredOrdered.map((p, idx) => (
            <article key={p.id} className="relative overflow-hidden bg-black">
              <div className="relative min-h-[78dvh] aspect-[9/16]">
                <Image
                  src={p.images[0]?.url || "/brand/luxfabric-mark.svg"}
                  alt={p.name}
                  fill
                  className="object-cover"
                  sizes="100vw"
                  priority={idx === 0}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                <div className="absolute bottom-4 left-3 right-3 space-y-3 text-white">
                  <div>
                    <div className="text-sm font-semibold">@{username.replace(/^@/, "")}</div>
                    <div className="mt-1 text-sm">{p.name}</div>
                    <div className="text-xs text-white/70">{formatSom(p.price)}</div>
                  </div>
                  <Link
                    href={`/i/${p.slug}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-lf-red py-3 text-sm font-bold text-white"
                  >
                    <ShoppingBag className="h-4 w-4" /> Sotib olish
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </ReelsShell>
  );
}
