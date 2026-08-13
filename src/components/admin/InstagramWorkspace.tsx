"use client";

import { Suspense, useState } from "react";
import { ImageIcon, Settings2, Video } from "lucide-react";
import { ReelsManager } from "@/components/admin/ReelsManager";
import { StoriesManager } from "@/components/admin/StoriesManager";
import { InstagramPanel } from "@/components/admin/InstagramPanel";

type Tab = "reels" | "stories" | "meta";

type ProductLite = { id: string; name: string; slug: string; price: number };
type FeaturedProduct = {
  id: string;
  name: string;
  slug: string;
  priceLabel: string;
  metaCatalogProductId?: string | null;
};

export function InstagramWorkspace({
  reels,
  music,
  stories,
  products,
  featuredProducts,
  metaInitial,
  domain,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reels: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  music: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stories: any[];
  products: ProductLite[];
  featuredProducts: FeaturedProduct[];
  metaInitial: Record<string, string>;
  domain: string;
}) {
  const [tab, setTab] = useState<Tab>("reels");

  const tabs: { id: Tab; label: string; hint: string; icon: typeof Video }[] = [
    { id: "reels", label: "Reels", hint: "Video + musiqa", icon: Video },
    { id: "stories", label: "Stories", hint: "Hikoya + havola", icon: ImageIcon },
    { id: "meta", label: "Meta / DM", hint: "Ulash va javoblar", icon: Settings2 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">Instagram boshqaruv</h1>
        <p className="mt-1 text-sm text-white/60">
          Avval nima qo‘ymoqchisiz — Reels yoki Stories — tanlang. Meta/DM alohida.
        </p>
        <p className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-100/90">
          IG appda qizil overlay yo‘q (Meta). Tez xarid: caption/izohdagi{" "}
          <span className="text-white">/i/slug</span> → o‘lcham → Sotib olish. Bio:{" "}
          <span className="text-white">luxfabricshop.uz/instagram</span> (Meta/DM da nusxa). Admin orqali
          joylang — avto izoh ishlashi uchun.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-2xl border px-4 py-3.5 text-left transition ${
                active
                  ? "border-lf-red bg-lf-red/15 ring-1 ring-lf-red/40"
                  : "border-white/10 bg-white/5 hover:bg-white/8"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                <Icon className={`h-4 w-4 ${active ? "text-lf-red" : "text-white/60"}`} />
                {t.label}
              </div>
              <div className="mt-0.5 text-xs text-white/45">{t.hint}</div>
            </button>
          );
        })}
      </div>

      {/* Tab almashtirishda unmount qilmaymiz — aks holda o‘chirilgan musiqa eski props bilan qaytib kelardi */}
      <div className={tab === "reels" ? "block" : "hidden"}>
        <h2 className="mb-3 text-lg font-semibold">Reels va musiqa</h2>
        <ReelsManager initialReels={reels} initialMusic={music} products={products} />
      </div>

      <div className={tab === "stories" ? "block" : "hidden"}>
        <h2 className="mb-3 text-lg font-semibold">Stories (hikoyalar)</h2>
        <StoriesManager initialStories={stories} products={products} />
      </div>

      <div className={tab === "meta" ? "block" : "hidden"}>
        <h2 className="mb-3 text-lg font-semibold">Meta / DM sozlamalari</h2>
        <Suspense fallback={<p className="text-sm text-white/40">Yuklanmoqda…</p>}>
          <InstagramPanel initial={metaInitial} domain={domain} products={featuredProducts} />
        </Suspense>
      </div>
    </div>
  );
}
