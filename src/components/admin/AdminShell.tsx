"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  Clapperboard,
  LayoutDashboard,
  Package,
  PackageCheck,
  QrCode,
  Settings,
  ShoppingBag,
  Truck,
  Users,
  Warehouse,
  BarChart3,
  MessageSquareQuote,
} from "lucide-react";
import { cn } from "@/lib/utils";

const desktopLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/kirim", label: "Kirim", icon: ArrowDownToLine },
  { href: "/admin/chiqim", label: "Chiqim", icon: ArrowUpFromLine },
  { href: "/admin/scan", label: "Buyurtma yig‘ish", icon: PackageCheck },
  { href: "/admin/labels", label: "QR Yorliqlar", icon: QrCode },
  { href: "/admin/products", label: "Mahsulotlar", icon: Package },
  { href: "/admin/orders", label: "Buyurtmalar", icon: ShoppingBag },
  { href: "/admin/reviews", label: "Sharhlar", icon: MessageSquareQuote },
  { href: "/admin/warehouse", label: "Omborlar", icon: Warehouse },
  { href: "/admin/logistics", label: "Dostavka", icon: Truck },
  { href: "/admin/instagram", label: "Instagram", icon: Clapperboard },
  { href: "/admin/customers", label: "Mijozlar", icon: Users },
  { href: "/admin/analytics", label: "Analitika", icon: BarChart3 },
  { href: "/admin/settings", label: "Sozlamalar", icon: Settings },
];

const mobileLinks = [
  { href: "/admin", label: "Home", icon: LayoutDashboard },
  { href: "/admin/kirim", label: "Kirim", icon: ArrowDownToLine },
  { href: "/admin/chiqim", label: "Chiqim", icon: ArrowUpFromLine, primary: true },
  { href: "/admin/scan", label: "Zakaz", icon: PackageCheck },
  { href: "/admin/orders", label: "Ro‘yxat", icon: ShoppingBag },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";
  const isCameraPage =
    pathname === "/admin/chiqim" ||
    pathname?.startsWith("/admin/chiqim/") ||
    pathname === "/admin/scan" ||
    pathname?.startsWith("/admin/scan/");

  async function logout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="admin-root min-h-screen bg-[#070707] text-white">
      <div className="flex min-h-screen w-full">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-white/10 bg-black/50 p-5 lg:block xl:w-72">
          <Link href="/admin" className="inline-flex items-center">
            <Image
              src="/brand/luxfabric-logo-on-dark.png"
              alt="LUXFABRIC"
              width={160}
              height={68}
              className="h-10 w-auto object-contain object-left"
              priority
            />
          </Link>
          <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-white/40">Sales OS · Admin · PC</p>
          <nav className="mt-8 space-y-1">
            {desktopLinks.map((l) => {
              const Icon = l.icon;
              const active =
                pathname === l.href || (l.href !== "/admin" && pathname?.startsWith(l.href));
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                    active ? "bg-lf-red/20 text-white" : "text-white/55 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-lf-red" />
                  {l.label}
                </Link>
              );
            })}
          </nav>
          <Link
            href="/"
            className="mt-8 flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/55 hover:text-white"
          >
            <Boxes className="h-3.5 w-3.5" /> Do‘konga qaytish
          </Link>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header
            className={cn(
              "sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-black/70 px-4 py-3 backdrop-blur lg:px-8",
              isCameraPage && "max-lg:hidden"
            )}
          >
            <div className="lg:hidden">
              <Link href="/admin" className="inline-flex items-center">
                <Image
                  src="/brand/luxfabric-logo-on-dark.png"
                  alt="LUXFABRIC"
                  width={120}
                  height={48}
                  className="h-7 w-auto"
                />
              </Link>
            </div>
            <div className="hidden text-sm text-white/50 lg:block">Markaziy boshqaruv paneli · Kompyuter</div>
            <div className="flex items-center gap-2">
              <Link
                href="/admin/chiqim"
                className="rounded-full bg-lf-red px-3 py-1.5 text-xs font-semibold lg:hidden"
              >
                Chiqim
              </Link>
              <div className="hidden rounded-full bg-white/5 px-3 py-1 text-xs text-white/50 lg:block">
                admin@luxfabricshop.uz
              </div>
              <button
                type="button"
                onClick={logout}
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/55 hover:text-white"
              >
                Chiqish
              </button>
            </div>
          </header>

          <main
            className={cn("flex-1", isCameraPage ? "p-0 lg:p-6 lg:pb-6" : "p-4 pb-24 lg:p-8 lg:pb-10")}
          >
            <div className={cn(!isCameraPage && "mx-auto w-full max-w-[1400px]")}>{children}</div>
          </main>

          <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-black/95 px-1 pb-[env(safe-area-inset-bottom)] pt-1 lg:hidden">
            <div className="flex items-end justify-around">
              {mobileLinks.map((l) => {
                const Icon = l.icon;
                const active =
                  pathname === l.href || (l.href !== "/admin" && pathname?.startsWith(l.href));
                if (l.primary) {
                  return (
                    <Link key={l.href} href={l.href} className="-mt-4 flex flex-col items-center">
                      <span className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-black bg-lf-red shadow-lg">
                        <Icon className="h-6 w-6 text-white" />
                      </span>
                      <span className="mt-0.5 text-[10px] font-semibold text-lf-red">{l.label}</span>
                    </Link>
                  );
                }
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={cn(
                      "flex min-w-[3rem] flex-col items-center gap-0.5 px-1 py-1.5 text-[10px]",
                      active ? "text-white" : "text-white/45"
                    )}
                  >
                    <Icon className={cn("h-5 w-5", active && "text-lf-red")} />
                    {l.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
