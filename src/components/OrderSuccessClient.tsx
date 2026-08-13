"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, Download, X } from "lucide-react";
import { getDeviceOrderToken, saveDeviceOrderToken } from "@/lib/device-order-storage";

type Props = {
  orderNumber: string;
  initialPaymentMethod?: string | null;
  initialPaymentStatus?: string | null;
  /** Click/Payme sozlanmagan — admin kalit kerak */
  paymentSetupHint?: boolean;
};

export function OrderSuccessClient({
  orderNumber,
  initialPaymentMethod = null,
  initialPaymentStatus = null,
  paymentSetupHint = false,
}: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [saveHint, setSaveHint] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(initialPaymentMethod || "");
  const [paymentStatus, setPaymentStatus] = useState(initialPaymentStatus || "PENDING");

  useEffect(() => {
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

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function pollPayment() {
      try {
        const token = getDeviceOrderToken(orderNumber);
        const url = new URL(`/api/orders/${encodeURIComponent(orderNumber)}`, window.location.origin);
        if (token) url.searchParams.set("deviceToken", token);
        const res = await fetch(url.toString());
        if (!res.ok) return;
        const data = await res.json();
        const order = data.order || data;
        if (cancelled || !order) return;
        if (typeof order.paymentMethod === "string") setPaymentMethod(order.paymentMethod);
        if (typeof order.paymentStatus === "string") setPaymentStatus(order.paymentStatus);
        if (order.paymentStatus === "PENDING" && (order.paymentMethod === "CLICK" || order.paymentMethod === "PAYME" || order.paymentMethod === "CARD")) {
          timer = setTimeout(() => void pollPayment(), 4000);
        }
      } catch {
        /* ignore */
      }
    }

    void pollPayment();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderNumber]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/qr?order=${encodeURIComponent(orderNumber)}`);
        const data = await res.json();
        if (!cancelled && res.ok && data.qr) {
          setQrDataUrl(data.qr);
          const key = `lf_qr_prompt_${orderNumber}`;
          if (!sessionStorage.getItem(key)) {
            setShowSavePrompt(true);
            sessionStorage.setItem(key, "1");
          }
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderNumber]);

  async function saveQrToPhone() {
    if (!qrDataUrl) return;
    setSaveHint("");
    try {
      const res = await fetch(qrDataUrl);
      const blob = await res.blob();
      const file = new File([blob], `${orderNumber}-qr.png`, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `LUXFABRIC ${orderNumber}`,
          text: `Buyurtma QR: ${orderNumber}. Saqlab qo‘ying.`,
        });
        setSaveHint("Ulashish oynasi ochildi — «Saqlash» / Galereyani tanlang.");
        setShowSavePrompt(false);
        return;
      }

      const a = document.createElement("a");
      a.href = qrDataUrl;
      a.download = `${orderNumber}-qr.png`;
      a.click();
      setSaveHint("QR fayl yuklandi. Telefoningizda yuklamalar / galereyadan toping.");
      setShowSavePrompt(false);
    } catch {
      setSaveHint("Avtomatik saqlash ishlamadi — ekran rasmini (skrinshot) oling.");
    }
  }

  const onlinePay =
    paymentMethod === "CLICK" || paymentMethod === "PAYME" || paymentMethod === "CARD";
  const pendingOnline = onlinePay && paymentStatus !== "PAID";
  const paid = paymentStatus === "PAID";
  const cod = paymentMethod === "COD";

  return (
    <div
      className={`mt-6 rounded-3xl border p-8 text-center relative ${
        pendingOnline
          ? "border-amber-200 bg-amber-50"
          : "border-emerald-200 bg-emerald-50"
      }`}
    >
      {pendingOnline ? (
        <Clock3 className="mx-auto h-14 w-14 text-amber-500" />
      ) : (
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
      )}
      <h1 className="mt-4 text-2xl font-bold">
        {pendingOnline ? "Buyurtma qabul qilindi — to‘lov kutilmoqda" : "Buyurtma qabul qilindi"}
      </h1>
      <p className="mt-2 text-sm text-lf-muted">Raqamingiz</p>
      <p className="mt-1 text-xl font-extrabold text-lf-red">{orderNumber}</p>

      {paid ? (
        <p className="mt-3 text-sm font-semibold text-emerald-700">To‘lov tasdiqlandi ✓</p>
      ) : null}
      {cod ? (
        <p className="mt-3 text-sm text-lf-muted">
          To‘lov: kuryerga naqd / kartada — yetkazishda. Holat: PENDING.
        </p>
      ) : null}
      {pendingOnline ? (
        <p className="mt-3 text-sm text-amber-800 leading-relaxed">
          {paymentMethod === "PAYME" ? "Payme" : "Click"} orqali to‘lovni yakunlang. Tasdiq
          webhook kelgach avtomatik PAID bo‘ladi (sahifa yangilanadi).
          {paymentSetupHint
            ? " Agar to‘lov oynasi ochilmagan bo‘lsa — Admin → Sozlamalarda kalitlar yo‘q."
            : ""}
        </p>
      ) : null}

      {qrDataUrl ? (
        <div className="mt-5 mx-auto max-w-[220px]">
          <div className="rounded-2xl border border-emerald-200 bg-white p-3 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt={`QR ${orderNumber}`}
              className="mx-auto h-auto w-full"
            />
          </div>
          <p className="mt-2 text-xs font-semibold text-lf-ink">Buyurtma QR-kodi</p>
          <p className="mt-1 text-[11px] text-lf-muted leading-snug">
            Bu QR ni saqlab qo‘ying — keyin kuzatish / omborda skanerlash uchun kerak.
          </p>
          <button
            type="button"
            onClick={() => void saveQrToPhone()}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-lf-ink py-2.5 text-sm font-bold text-white"
          >
            <Download className="h-4 w-4" />
            QR ni telefoniga saqlash
          </button>
          <p className="mt-2 text-[11px] text-lf-muted">
            Yoki ekran rasmini (skrinshot) oling — aks holda yopib yuborsangiz yo‘qolishi mumkin.
          </p>
        </div>
      ) : null}

      {saveHint ? (
        <p className="mt-3 text-xs font-medium text-emerald-700">{saveHint}</p>
      ) : null}

      <p className="mt-4 text-sm text-lf-muted">
        Kuzatish: pastki menyu «Kuzatish» yoki quyidagi tugma. Faqat shu telefon / qurilma ochadi.
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

      {showSavePrompt && qrDataUrl ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-3xl bg-white p-5 text-left shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold text-lf-ink">QR kodni saqlab qoling!</h2>
              <button
                type="button"
                aria-label="Yopish"
                onClick={() => setShowSavePrompt(false)}
                className="rounded-full p-1 text-lf-muted hover:bg-black/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-lf-muted leading-relaxed">
              Ko‘p odam sahifani yopib yuboradi yoki esdan chiqaradi. Shu telefon egasi — QR ni
              hozir saqlang yoki skrinshot qiling.
            </p>
            <div className="mt-4 mx-auto w-36 rounded-xl border border-lf-border bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="" className="w-full" />
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void saveQrToPhone()}
                className="rounded-2xl bg-lf-red py-3 text-sm font-bold text-white"
              >
                Telefoniga saqlash / ulashish
              </button>
              <button
                type="button"
                onClick={() => {
                  setSaveHint(
                    "Endi skrinshot oling (telefon: Power+Volume pastga yoki tizim skrinshoti), keyin galereyaga saqlanadi."
                  );
                  setShowSavePrompt(false);
                }}
                className="rounded-2xl border border-lf-border bg-white py-3 text-sm font-semibold"
              >
                Skrinshot olaman
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
