"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, ShoppingBag, Package, Clapperboard } from "lucide-react";
import { useCart } from "@/lib/cart";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Bosh", icon: Home },
  { href: "/instagram", label: "Reels", icon: Clapperboard },
  { href: "/catalog", label: "Katalog", icon: LayoutGrid },
  { href: "/cart", label: "Savat", icon: ShoppingBag },
  { href: "/orders", label: "Buyurtma", icon: Package },
];

export function StoreShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const count = useCart((s) => s.items.reduce((n, i) => n + i.quantity, 0));

  return (
    <div className="min-h-screen bg-lf-bg pb-24 text-lf-text">
      <header className="sticky top-0 z-40 border-b border-lf-border bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-12 max-w-lg items-center justify-between px-3">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-xl font-black tracking-tight text-lf-text"
          >
            luxfabric
          </Link>
          <span className="rounded-full bg-lf-pink px-2 py-0.5 text-[10px] font-semibold text-lf-red">
            1–2 kun
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-3 pt-2 sm:px-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-lf-border bg-white/95 backdrop-blur-xl">
        <div className="mx-auto grid max-w-lg grid-cols-5 px-1 pb-[env(safe-area-inset-bottom)]">
          {tabs.map((tab) => {
            const active =
              pathname === tab.href || (tab.href !== "/" && pathname.startsWith(tab.href));
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition",
                  active ? "text-lf-red" : "text-lf-muted hover:text-lf-text"
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
                <span>{tab.label}</span>
                {tab.href === "/cart" && count > 0 && (
                  <span className="absolute right-3 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-lf-red px-1 text-[9px] font-semibold text-white">
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
