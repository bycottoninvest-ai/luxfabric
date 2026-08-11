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

/** To‘liq ekran Reels — do‘kon headeri yo‘q, Instagram uslubi */
export function ReelsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const count = useCart((s) => s.items.reduce((n, i) => n + i.quantity, 0));

  return (
    <div className="min-h-screen bg-black text-white pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
      <main className="mx-auto max-w-lg">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-black/95 backdrop-blur-xl">
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
                  "relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
                  active ? "text-white" : "text-white/45"
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
                <span>{tab.label}</span>
                {tab.href === "/cart" && count > 0 && (
                  <span className="absolute right-3 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-lf-red px-1 text-[9px] font-semibold text-white">
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
