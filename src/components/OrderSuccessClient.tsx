"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { getDeviceOrderToken, saveDeviceOrderToken } from "@/lib/device-order-storage";

export function OrderSuccessClient({ orderNumber }: { orderNumber: string }) {
  useEffect(() => {
    // Cookie → localStorage (Click returnUrl dan qaytganda)
    try {
      const name = `lf_dot_${orderNumber.replace(/[^A-Z0-9-]/gi, "")}`;
      const match = document.cookie
        .split("; ")
        .find((c) => c.startsWith(`${name}=`));
      if (match) {
        const token = decodeURIComponent(match.split("=").slice(1).join("="));
        if (token && !getDeviceOrderToken(orderNumber)) {
          saveDeviceOrderToken(orderNumber, token);
        }
      }
    } catch {
      /* ignore */
    }
  }, [orderNumber]);

  return (
    <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center">
      <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
      <h1 className="mt-4 text-2xl font-bold">Buyurtma qabul qilindi</h1>
      <p className="mt-2 text-sm text-lf-muted">Raqamingiz</p>
      <p className="mt-1 text-xl font-extrabold text-lf-red">{orderNumber}</p>
      <p className="mt-3 text-sm text-lf-muted">
        Kuzatish: pastki menyu «Buyurtma» yoki quyidagi tugma. Faqat shu telefon / qurilma ochadi.
      </p>
      <div className="mt-6 flex flex-col gap-2">
        <Link
          href={`/track/${orderNumber}`}
          className="rounded-2xl bg-lf-red py-3 text-sm font-bold text-white"
        >
          Buyurtmam qayerda?
        </Link>
        <Link
          href="/orders"
          className="rounded-2xl border border-lf-border bg-white py-3 text-sm font-semibold"
        >
          Mening buyurtmalarim
        </Link>
        <Link href="/catalog" className="py-2 text-sm font-semibold text-lf-muted">
          Yana xarid qilish
        </Link>
      </div>
    </div>
  );
}
