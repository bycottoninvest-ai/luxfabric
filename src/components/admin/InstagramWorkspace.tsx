"use client";

import { useState } from "react";
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

      {tab === "reels" && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Reels va musiqa</h2>
          <ReelsManager initialReels={reels} initialMusic={music} products={products} />
        </div>
      )}

      {tab === "stories" && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Stories (hikoyalar)</h2>
          <StoriesManager initialStories={stories} products={products} />
        </div>
      )}

      {tab === "meta" && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Meta / DM sozlamalari</h2>
          <InstagramPanel initial={metaInitial} domain={domain} products={featuredProducts} />
        </div>
      )}
    </div>
  );
}
