import Link from "next/link";
import { StoreShell } from "@/components/StoreShell";

export default function ProfilePage() {
  return (
    <StoreShell>
      <h1 className="text-xl font-bold">Profil</h1>
      <div className="mt-4 space-y-3">
        <div className="rounded-2xl border border-lf-border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lf-muted">Mijoz</p>
          <p className="mt-1 text-lg font-bold">luxfabric</p>
          <p className="text-sm text-lf-muted">Buyurtma va savat shu yerda</p>
        </div>
        {[
          { href: "/orders", label: "Buyurtmalarim" },
          { href: "/instagram", label: "Reels" },
          { href: "/cart", label: "Savat" },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="block rounded-xl border border-lf-border bg-white px-4 py-3 text-sm font-medium shadow-sm"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </StoreShell>
  );
}
