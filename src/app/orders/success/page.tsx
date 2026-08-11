import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { StoreShell } from "@/components/StoreShell";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ no?: string }>;
}) {
  const { no } = await searchParams;
  const orderNumber = no || "LF-000000";

  return (
    <StoreShell>
      <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
        <h1 className="mt-4 text-2xl font-bold">Buyurtma qabul qilindi</h1>
        <p className="mt-2 text-sm text-lf-muted">Raqamingiz</p>
        <p className="mt-1 text-xl font-extrabold text-lf-red">{orderNumber}</p>
        <p className="mt-3 text-sm text-lf-muted">Yetkazib berish: 1–2 kun ichida</p>
        <div className="mt-6 flex flex-col gap-2">
          <Link href={`/track/${orderNumber}`} className="rounded-2xl bg-lf-red py-3 text-sm font-bold text-white">
            Tracking ochish
          </Link>
          <Link href="/catalog" className="rounded-2xl border border-lf-border bg-white py-3 text-sm font-semibold">
            Yana xarid qilish
          </Link>
        </div>
      </div>
    </StoreShell>
  );
}
