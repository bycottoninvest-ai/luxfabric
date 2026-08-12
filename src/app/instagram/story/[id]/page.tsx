import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import { formatSom } from "@/lib/utils";
import { ReelsShell } from "@/components/ReelsShell";

type Props = { params: Promise<{ id: string }> };

/** Story preview — Instagram sticker ochilganda ham /i/slug ishlatiladi; bu ichki ko‘rinish. */
export default async function InstagramStoryPreviewPage({ params }: Props) {
  const { id } = await params;
  const [story, username] = await Promise.all([
    prisma.instagramStory.findUnique({
      where: { id },
      include: {
        product: { select: { name: true, slug: true, price: true } },
      },
    }),
    getSetting("instagram_username", "luxfabric"),
  ]);

  if (!story || !story.isPublished) notFound();

  const handle = username.replace(/^@/, "");

  return (
    <ReelsShell>
      <article className="relative min-h-[100dvh] overflow-hidden bg-black">
        <div className="relative mx-auto aspect-[9/16] min-h-[100dvh] w-full max-w-md">
          {story.mediaType === "video" ? (
            <video
              src={story.mediaUrl}
              className="absolute inset-0 h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            <Image
              src={story.mediaUrl}
              alt={story.title}
              fill
              className="object-cover"
              sizes="100vw"
              priority
              unoptimized={
                story.mediaUrl.startsWith("/uploads/") ||
                story.mediaUrl.includes("blob.vercel-storage.com")
              }
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30" />
          <div className="absolute left-3 top-3 text-[13px] font-semibold text-white drop-shadow">
            @{handle}
          </div>
          <div className="absolute bottom-6 left-3 right-3 space-y-3 text-white">
            <div>
              <div className="text-sm font-semibold drop-shadow">{story.title}</div>
              {story.caption ? (
                <p className="mt-1 line-clamp-3 text-sm text-white/85 drop-shadow">{story.caption}</p>
              ) : null}
              {story.product ? (
                <div className="mt-1 text-xs text-white/70">
                  {story.product.name} · {formatSom(story.product.price)}
                </div>
              ) : null}
            </div>
            {story.product && (
              <Link
                href={`/i/${story.product.slug}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-lf-red py-3 text-sm font-bold text-white"
              >
                <ShoppingBag className="h-4 w-4" /> {story.linkLabel || "Sotib olish"}
              </Link>
            )}
          </div>
        </div>
      </article>
    </ReelsShell>
  );
}
