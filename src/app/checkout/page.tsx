"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StoreShell } from "@/components/StoreShell";
import { useCart } from "@/lib/cart";
import { cn, formatSom, isValidUzPhone, maskUzPhone } from "@/lib/utils";
import { saveDeviceOrderToken } from "@/lib/device-order-storage";
import { UZ_REGIONS, formatCityLabel, getRegionByCode, matchUzFromGeoText } from "@/lib/uzbekistan-regions";
import {
  formatBranchLabel,
  sortBranchesByRegion,
  type UzCourierBranch,
} from "@/lib/uz-couriers";
import { estimateDeliveryLabel, formatPromisedByLabel } from "@/lib/delivery-eta";
import { computeDeliveryPromise } from "@/lib/delivery-promise";
import {
  defaultHandoffForRegion,
  rankCarriersForRegion,
  shopDefaultCourierCode,
} from "@/lib/carrier-matrix";

const payments = [
  { id: "CLICK", label: "Click" },
  { id: "PAYME", label: "Payme" },
  { id: "CARD", label: "Visa / Mastercard" },
  { id: "COD", label: "Kuryerga naqd" },
];

const deliveryTypes = [
  {
    id: "SHOP_DELIVERY",
    title: "Do‘kon o‘zi yuboradi",
    desc: "Eng ishonchli kuryerni biz tanlaymiz (PVZ-first viloyatlarda)",
  },
  {
    id: "COURIER_CHOICE",
    title: "O‘zim kuryer tanlayman",
    desc: "Uyga yoki punktdan — kuryer va punktni o‘zingiz belgilaysiz",
  },
  {
    id: "PICKUP",
    title: "O‘zim olib ketaman",
    desc: "Toshkent omboridan olib ketish (Click & Collect)",
  },
] as const;

const notifyOptions = [
  { id: "SMS", label: "SMS" },
  { id: "TELEGRAM", label: "Telegram" },
  { id: "BOTH", label: "SMS + Telegram" },
  { id: "NONE", label: "Kerak emas" },
] as const;

const steps = ["Mahsulot", "Yetkazish", "To‘lov", "Tasdiq"];
const CUSTOMER_KEY = "lf_checkout_customer";

/** Contact Picker API (asosan Android Chrome) */
type ContactAddress = {
  addressLine?: string[];
  city?: string;
  country?: string;
  postalCode?: string;
  region?: string;
};
type ContactInfo = {
  name?: string[];
  tel?: string[];
  address?: ContactAddress[];
};
type ContactsManager = {
  select: (properties: string[], options?: { multiple?: boolean }) => Promise<ContactInfo[]>;
};

function getContactsManager(): ContactsManager | null {
  if (typeof navigator === "undefined") return null;
  const nav = navigator as Navigator & { contacts?: ContactsManager };
  if (!nav.contacts || typeof nav.contacts.select !== "function") return null;
  if (!("ContactsManager" in window)) return null;
  return nav.contacts;
}

type Pickup = {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string | null;
  region: { nameUz: string; code?: string };
};

type CheckoutForm = {
  name: string;
  phone: string;
  regionCode: string;
  district: string;
  address: string;
  paymentMethod: string;
  deliveryType: "SHOP_DELIVERY" | "COURIER_CHOICE" | "PICKUP";
  /** HOME | PVZ */
  handoffMode: "HOME" | "PVZ";
  /** uz-couriers company id (bts, fargo, …) */
  courierCompanyId: string;
  courierBranchId: string;
  preferredCourierId: string;
  pickupWarehouseId: string;
  notifyChannel: "SMS" | "TELEGRAM" | "BOTH" | "NONE";
  telegramUsername: string;
};

function applyCityToForm(city: string | null | undefined, form: CheckoutForm): CheckoutForm {
  if (!city) return form;
  const matched = matchUzFromGeoText(city);
  if (!matched) return form;
  return { ...form, regionCode: matched.regionCode, district: matched.district };
}

function saveCustomerDraft(data: {
  name: string;
  phone: string;
  city: string;
  address: string;
  regionCode: string;
  district: string;
  deliveryType: string;
  notifyChannel: string;
  telegramUsername: string;
  preferredCourierId: string;
  courierCompanyId?: string;
  courierBranchId?: string;
}) {
  try {
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

function clearCustomerDraft() {
  try {
    localStorage.removeItem(CUSTOMER_KEY);
  } catch {
    /* ignore */
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, clear } = useCart();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [locating, setLocating] = useState(false);
  const [pickingContact, setPickingContact] = useState(false);
  const [locHint, setLocHint] = useState("");
  const [profileHint, setProfileHint] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [contactPickerOk, setContactPickerOk] = useState(false);
  const [source] = useState(() => {
    if (typeof window === "undefined") return "STORE";
    return new URLSearchParams(window.location.search).get("from") === "instagram"
      ? "INSTAGRAM"
      : "STORE";
  });
  const [form, setForm] = useState<CheckoutForm>({
    name: "",
    phone: "+998",
    regionCode: "TAS",
    district: "Yunusobod",
    address: "",
    paymentMethod: "CLICK",
    deliveryType: "SHOP_DELIVERY",
    handoffMode: "PVZ",
    courierCompanyId: "",
    courierBranchId: "",
    preferredCourierId: "",
    pickupWarehouseId: "",
    notifyChannel: "SMS",
    telegramUsername: "",
  });

  const districts = useMemo(() => getRegionByCode(form.regionCode)?.districts || [], [form.regionCode]);
  const regionName = getRegionByCode(form.regionCode)?.name || "";
  const cityLabel = formatCityLabel(regionName, form.district);
  const rankedCarriers = useMemo(
    () => rankCarriersForRegion(form.regionCode),
    [form.regionCode]
  );
  const selectedCompany = useMemo(
    () => rankedCarriers.find((r) => r.company.id === form.courierCompanyId)?.company || null,
    [rankedCarriers, form.courierCompanyId]
  );
  const sortedBranches = useMemo(() => {
    if (!selectedCompany) return [] as UzCourierBranch[];
    return sortBranchesByRegion(selectedCompany.branches, form.regionCode);
  }, [selectedCompany, form.regionCode]);
  const selectedBranch = sortedBranches.find((b) => b.id === form.courierBranchId) || null;
  const courierKeyForEta =
    form.deliveryType === "COURIER_CHOICE"
      ? selectedCompany?.code || form.courierCompanyId || form.preferredCourierId
      : form.deliveryType === "SHOP_DELIVERY"
        ? shopDefaultCourierCode(form.regionCode)
        : null;
  const handoffForEta =
    form.deliveryType === "PICKUP"
      ? "WAREHOUSE"
      : form.deliveryType === "COURIER_CHOICE"
        ? form.handoffMode
        : defaultHandoffForRegion(form.regionCode, shopDefaultCourierCode(form.regionCode).toLowerCase());
  const deliveryPromise = useMemo(
    () =>
      computeDeliveryPromise({
        regionCode: form.regionCode,
        deliveryType: form.deliveryType,
        courierKey: courierKeyForEta,
        handoffMode: handoffForEta,
      }),
    [form.regionCode, form.deliveryType, courierKeyForEta, handoffForEta]
  );
  const deliveryEta = useMemo(
    () =>
      estimateDeliveryLabel({
        regionCode: form.regionCode,
        deliveryType: form.deliveryType,
        courierKey: courierKeyForEta,
        handoffMode: handoffForEta,
      }),
    [form.regionCode, form.deliveryType, courierKeyForEta, handoffForEta]
  );
  const promisedByText = formatPromisedByLabel(deliveryPromise.promisedBy);

  useEffect(() => {
    setMounted(true);
    setContactPickerOk(!!getContactsManager());
    try {
      const raw = localStorage.getItem(CUSTOMER_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<CheckoutForm> & { city?: string };
      setHasSavedDraft(true);
      setForm((f) => {
        let next: CheckoutForm = {
          ...f,
          name: saved.name || f.name,
          phone: saved.phone ? maskUzPhone(saved.phone) : f.phone,
          address: saved.address || f.address,
          regionCode: saved.regionCode || f.regionCode,
          district: saved.district || f.district,
          deliveryType: (saved.deliveryType as CheckoutForm["deliveryType"]) || f.deliveryType,
          notifyChannel: (saved.notifyChannel as CheckoutForm["notifyChannel"]) || f.notifyChannel,
          telegramUsername: saved.telegramUsername || f.telegramUsername,
          preferredCourierId: saved.preferredCourierId || f.preferredCourierId,
          courierCompanyId:
            (saved as { courierCompanyId?: string }).courierCompanyId ||
            saved.preferredCourierId ||
            f.courierCompanyId,
          courierBranchId: (saved as { courierBranchId?: string }).courierBranchId || f.courierBranchId,
        };
        if (saved.city && !saved.regionCode) next = applyCityToForm(saved.city, next);
        return next;
      });
      if (saved.name || saved.address || saved.phone) {
        setProfileHint("Oldingi buyurtma ma’lumotlari yuklandi — kerak bo‘lsa o‘zgartiring.");
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetch("/api/delivery-options")
      .then((r) => r.json())
      .then((d) => {
        setPickups(d.pickups || []);
        if (d.pickups?.[0]?.id) {
          setForm((f) => ({ ...f, pickupWarehouseId: f.pickupWarehouseId || d.pickups[0].id }));
        }
      })
      .catch(() => {});
  }, []);

  // Viloyat o‘zgaganda: mahalliy punktni yangilash (faqat COURIER + PVZ)
  useEffect(() => {
    if (form.deliveryType !== "COURIER_CHOICE" || form.handoffMode !== "PVZ" || !selectedCompany)
      return;
    const ranked = sortBranchesByRegion(selectedCompany.branches, form.regionCode);
    if (!ranked.length) return;
    const stillValid = ranked.some((b) => b.id === form.courierBranchId);
    if (!stillValid) {
      setForm((f) => ({ ...f, courierBranchId: ranked[0].id }));
    }
  }, [
    form.deliveryType,
    form.handoffMode,
    form.regionCode,
    form.courierBranchId,
    selectedCompany,
  ]);

  useEffect(() => {
    if (!isValidUzPhone(form.phone)) return;
    const phone = form.phone;
    const t = setTimeout(async () => {
      setLookingUp(true);
      try {
        const res = await fetch(`/api/customers/lookup?phone=${encodeURIComponent(phone)}`);
        const data = await res.json();
        if (!res.ok || !data.found) return;
        setForm((f) => {
          if (f.phone !== phone) return f;
          let next: CheckoutForm = {
            ...f,
            name: data.name || f.name,
            address: data.address || f.address,
            telegramUsername: data.telegramUsername || f.telegramUsername,
            preferredCourierId: data.preferredCourierId || f.preferredCourierId,
            courierCompanyId: data.courierCompanyId || data.preferredCourierId || f.courierCompanyId,
            courierBranchId: data.courierBranchId || f.courierBranchId,
          };
          if (data.deliveryType === "SHOP_DELIVERY" || data.deliveryType === "COURIER_CHOICE" || data.deliveryType === "PICKUP") {
            next.deliveryType = data.deliveryType;
          }
          if (data.notifyChannel === "SMS" || data.notifyChannel === "TELEGRAM" || data.notifyChannel === "BOTH" || data.notifyChannel === "NONE") {
            next.notifyChannel = data.notifyChannel;
          }
          next = applyCityToForm(data.city, next);
          return next;
        });
        setProfileHint("Bazadan topildi: ism, telefon va manzil avtomatik to‘ldirildi.");
        setLocHint("");
      } catch {
        /* ignore */
      } finally {
        setLookingUp(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [form.phone]);

  if (!mounted) {
    return (
      <StoreShell>
        <div className="py-20 text-center text-lf-muted">Yuklanmoqda...</div>
      </StoreShell>
    );
  }

  if (items.length === 0) {
    return (
      <StoreShell>
        <div className="py-16 text-center">
          <p className="text-lf-muted">Avval mahsulot tanlang</p>
          <button type="button" className="mt-4 font-semibold text-lf-red" onClick={() => router.push("/catalog")}>
            Katalog
          </button>
        </div>
      </StoreShell>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidUzPhone(form.phone)) {
      setError("Telefon +998 dan keyin 9 ta raqam bo‘lishi kerak (jami 12 raqam)");
      return;
    }
    if (form.deliveryType === "COURIER_CHOICE" && !form.courierCompanyId) {
      setError("Kuryer kompaniyasini tanlang yoki «Do‘kon o‘zi yuboradi»ni belgilang");
      return;
    }
    if (
      form.deliveryType === "COURIER_CHOICE" &&
      form.handoffMode === "PVZ" &&
      !form.courierBranchId
    ) {
      setError("Punktdan olish uchun filial/punktni tanlang");
      return;
    }
    if (
      (form.notifyChannel === "TELEGRAM" || form.notifyChannel === "BOTH") &&
      !form.telegramUsername.trim()
    ) {
      setError("Telegram username kiriting (@username)");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          city: cityLabel,
          address: form.address,
          regionCode: form.regionCode,
          paymentMethod: form.paymentMethod,
          deliveryType: form.deliveryType,
          handoffMode:
            form.deliveryType === "PICKUP"
              ? "WAREHOUSE"
              : form.deliveryType === "COURIER_CHOICE"
                ? form.handoffMode
                : defaultHandoffForRegion(form.regionCode),
          courierCompanyId: form.deliveryType === "COURIER_CHOICE" ? form.courierCompanyId : null,
          courierBranchId:
            form.deliveryType === "COURIER_CHOICE" && form.handoffMode === "PVZ"
              ? form.courierBranchId || null
              : null,
          courierBranchLabel:
            form.deliveryType === "COURIER_CHOICE" &&
            form.handoffMode === "PVZ" &&
            selectedBranch
              ? formatBranchLabel(selectedBranch)
              : null,
          preferredCourierId: form.preferredCourierId || null,
          pickupWarehouseId: form.deliveryType === "PICKUP" ? form.pickupWarehouseId : null,
          notifyChannel: form.notifyChannel,
          telegramUsername: form.telegramUsername || null,
          source,
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
            price: i.price,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      if (typeof data.deviceOrderToken === "string" && data.orderNumber) {
        saveDeviceOrderToken(data.orderNumber, data.deviceOrderToken);
      }
      saveCustomerDraft({
        name: form.name,
        phone: form.phone,
        city: cityLabel,
        address: form.address,
        regionCode: form.regionCode,
        district: form.district,
        deliveryType: form.deliveryType,
        notifyChannel: form.notifyChannel,
        telegramUsername: form.telegramUsername,
        preferredCourierId: form.preferredCourierId,
        courierCompanyId: form.courierCompanyId,
        courierBranchId: form.courierBranchId,
      });
      setHasSavedDraft(true);
      clear();
      if (typeof data.paymentUrl === "string" && data.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }
      router.push(`/orders/success?no=${data.orderNumber}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }

  async function detectLocation() {
    if (!navigator.geolocation) {
      setError("Brauzeringiz GPS ni qo‘llab-quvvatlamaydi");
      return;
    }
    setLocating(true);
    setError("");
    setLocHint("");
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        });
      });
      const { latitude, longitude } = pos.coords;
      const res = await fetch(`/api/geocode?lat=${latitude}&lng=${longitude}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Manzil topilmadi");

      const matched = matchUzFromGeoText(data.geoText || data.displayName || "");
      setForm((f) => ({
        ...f,
        address: data.address || f.address,
        ...(matched
          ? { regionCode: matched.regionCode, district: matched.district }
          : {}),
      }));
      setLocHint(
        matched
          ? "Joylashuv aniqlandi — viloyat, tuman va manzil to‘ldirildi. Kerak bo‘lsa tuzating."
          : "Manzil topildi. Viloyat/tumanni qo‘lda tanlang."
      );
      setStep(1);
    } catch (err) {
      const msg =
        err instanceof GeolocationPositionError
          ? err.code === 1
            ? "Joylashuvga ruxsat bering (brauzer so‘rovida «Allow»)"
            : "GPS signal topilmadi"
          : err instanceof Error
            ? err.message
            : "Joylashuv xatosi";
      setError(msg);
    } finally {
      setLocating(false);
    }
  }

  async function pickContact() {
    const contacts = getContactsManager();
    if (!contacts) {
      setError("Kontakt tanlash ushbu brauzerda ishlamaydi (Android Chrome tavsiya etiladi)");
      return;
    }
    setPickingContact(true);
    setError("");
    try {
      const selected = await contacts.select(["name", "tel", "address"], { multiple: false });
      const c = selected?.[0];
      if (!c) return;

      const fullName = (c.name?.[0] || "").trim();
      const rawTel = (c.tel?.[0] || "").trim();
      const addr = c.address?.[0];
      const line = addr?.addressLine?.filter(Boolean).join(", ") || "";
      const geoBits = [line, addr?.city, addr?.region, addr?.country].filter(Boolean).join(", ");
      const matched = matchUzFromGeoText(geoBits);

      setForm((f) => {
        let next: CheckoutForm = {
          ...f,
          name: fullName || f.name,
          phone: rawTel ? maskUzPhone(rawTel) : f.phone,
          address: line || f.address,
        };
        if (matched) {
          next = { ...next, regionCode: matched.regionCode, district: matched.district };
        } else if (addr?.city || addr?.region) {
          next = applyCityToForm([addr.city, addr.region].filter(Boolean).join(" "), next);
        }
        return next;
      });
      setProfileHint("Kontakt tanlandi — ism, telefon va manzil to‘ldirildi. Kerak bo‘lsa tuzating.");
      setLocHint("");
      setStep(1);
    } catch (err) {
      // Foydalanuvchi bekor qilsa — jim
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError("Kontakt tanlash bekor qilindi yoki ruxsat berilmadi");
    } finally {
      setPickingContact(false);
    }
  }

  function clearSavedCustomer() {
    clearCustomerDraft();
    setHasSavedDraft(false);
    setProfileHint("");
    setForm((f) => ({
      ...f,
      name: "",
      phone: "+998",
      regionCode: "TAS",
      district: "Yunusobod",
      address: "",
      telegramUsername: "",
    }));
    setLocHint("Saqlangan ma’lumot tozalandi.");
  }

  const delivery = form.deliveryType === "PICKUP" ? 0 : 15000;
  const phoneOk = isValidUzPhone(form.phone);
  const sum = total();

  return (
    <StoreShell>
      <h1 className="text-xl font-bold">Tez checkout</h1>
      <p className="mt-1 text-sm text-lf-muted">Yetkazishni o‘zingiz tanlang yoki bizga qoldiring.</p>

      <div className="mt-4 grid grid-cols-4 gap-1">
        {steps.map((label, idx) => (
          <div key={label} className="text-center">
            <div
              className={cn(
                "mx-auto mb-1 h-1.5 rounded-full",
                idx <= step ? "bg-lf-red" : "bg-lf-border"
              )}
            />
            <div className={cn("text-[10px] font-medium", idx <= step ? "text-lf-red" : "text-lf-muted")}>
              {label}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="mt-4 space-y-3">
        <div className="rounded-2xl border border-lf-border bg-white p-4 shadow-sm">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-lf-muted">1. Mahsulot</div>
          {items.map((i) => (
            <div key={i.variantId} className="flex justify-between text-sm">
              <span>
                {i.name} · {i.size}
              </span>
              <span className="font-semibold">{formatSom(i.price * i.quantity)}</span>
            </div>
          ))}
        </div>

        <div className="space-y-3 rounded-2xl border border-lf-border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-lf-muted">2. Manzil</div>
            <div className="flex flex-wrap items-center gap-1.5">
              {contactPickerOk ? (
                <button
                  type="button"
                  onClick={pickContact}
                  disabled={pickingContact}
                  className="rounded-lg border border-lf-red/30 bg-lf-pink px-2.5 py-1 text-[11px] font-semibold text-lf-red disabled:opacity-60"
                >
                  {pickingContact ? "Tanlanmoqda..." : "Kontaktni tanlash"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  title="Faqat Android Chrome (HTTPS) da ishlaydi"
                  className="rounded-lg border border-lf-border bg-lf-bg px-2.5 py-1 text-[11px] font-semibold text-lf-muted opacity-60"
                >
                  Kontaktni tanlash
                </button>
              )}
              <button
                type="button"
                onClick={detectLocation}
                disabled={locating}
                className="rounded-lg border border-lf-red/30 bg-lf-pink px-2.5 py-1 text-[11px] font-semibold text-lf-red disabled:opacity-60"
              >
                {locating ? "Aniqlanmoqda..." : "Joylashuvni aniqlash"}
              </button>
            </div>
          </div>
          {!contactPickerOk && (
            <p className="text-[11px] text-lf-muted">
              «Kontaktni tanlash» asosan Android Chrome da ishlaydi. Boshqa brauzerlarda Autofill yoki saqlangan
              buyurtma ishlatiladi.
            </p>
          )}

          <label className="block space-y-1">
            <span className="text-xs text-lf-muted">Ism</span>
            <input
              required
              name="name"
              autoComplete="name"
              autoCapitalize="words"
              value={form.name}
              onFocus={() => setStep(1)}
              onChange={(e) => {
                setStep(1);
                setForm({ ...form, name: e.target.value });
              }}
              placeholder="Ism Familiya"
              className="w-full rounded-xl border border-lf-border bg-lf-bg px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-lf-muted">Telefon (+998, 12 raqam)</span>
            <input
              required
              type="tel"
              name="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={13}
              value={form.phone}
              onFocus={() => setStep(1)}
              onChange={(e) => {
                setStep(1);
                setForm({ ...form, phone: maskUzPhone(e.target.value) });
              }}
              placeholder="+998901234567"
              className={cn(
                "w-full rounded-xl border bg-lf-bg px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2",
                form.phone.length > 4 && !phoneOk ? "border-rose-500" : "border-lf-border"
              )}
            />
            <span className="text-[11px] text-lf-muted">
              Format: +998XXXXXXXXX · hozir {form.phone.replace(/\D/g, "").length}/12 raqam
            </span>
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-lf-muted">Viloyat / shahar</span>
            <select
              required
              name="address-level1"
              autoComplete="address-level1"
              value={form.regionCode}
              onChange={(e) => {
                const code = e.target.value;
                const firstDistrict = getRegionByCode(code)?.districts[0] || "";
                setStep(1);
                setForm({
                  ...form,
                  regionCode: code,
                  district: firstDistrict,
                  handoffMode: defaultHandoffForRegion(code, form.courierCompanyId),
                });
              }}
              className="w-full rounded-xl border border-lf-border bg-lf-bg px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2"
            >
              {UZ_REGIONS.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-lf-muted">Tuman / rayon</span>
            <select
              required
              name="address-level2"
              autoComplete="address-level2"
              value={form.district}
              onChange={(e) => {
                setStep(1);
                setForm({ ...form, district: e.target.value });
              }}
              className="w-full rounded-xl border border-lf-border bg-lf-bg px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2"
            >
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-lf-muted">Manzil</span>
            <input
              required
              name="address-line1"
              autoComplete="address-line1"
              value={form.address}
              onFocus={() => setStep(1)}
              onChange={(e) => {
                setStep(1);
                setForm({ ...form, address: e.target.value });
              }}
              placeholder="Ko‘cha, uy, mo‘ljal"
              className="w-full rounded-xl border border-lf-border bg-lf-bg px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2"
            />
          </label>
          {/* Autofill uchun yashirin postal-code (UI da ko‘rinmaydi) */}
          <input
            type="text"
            name="postal-code"
            autoComplete="postal-code"
            tabIndex={-1}
            aria-hidden
            className="sr-only"
            defaultValue=""
          />
          {locHint && <p className="text-[11px] text-emerald-600">{locHint}</p>}
          {profileHint && <p className="text-[11px] text-emerald-600">{profileHint}</p>}
          {lookingUp && <p className="text-[11px] text-lf-muted">Mijoz bazadan qidirilmoqda...</p>}
          {hasSavedDraft && (
            <button
              type="button"
              onClick={clearSavedCustomer}
              className="text-[11px] font-medium text-lf-muted underline underline-offset-2 hover:text-lf-red"
            >
              Saqlangan ma’lumotni tozalash
            </button>
          )}
        </div>

        <div className="space-y-3 rounded-2xl border border-lf-border bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-lf-muted">Yetkazib berish</div>
          <div className="space-y-2">
            {deliveryTypes.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  setStep(1);
                  const first = rankedCarriers[0]?.company;
                  const preferPvz = rankedCarriers[0]?.preferPvz ?? true;
                  const handoff = d.id === "PICKUP" ? form.handoffMode : preferPvz ? "PVZ" : "HOME";
                  const firstBranch = first
                    ? sortBranchesByRegion(first.branches, form.regionCode)[0]
                    : null;
                  setForm({
                    ...form,
                    deliveryType: d.id,
                    handoffMode:
                      d.id === "COURIER_CHOICE"
                        ? defaultHandoffForRegion(form.regionCode, first?.id)
                        : form.handoffMode,
                    courierCompanyId:
                      d.id === "COURIER_CHOICE" ? form.courierCompanyId || first?.id || "" : "",
                    courierBranchId:
                      d.id === "COURIER_CHOICE" && handoff === "PVZ"
                        ? form.courierBranchId || firstBranch?.id || ""
                        : d.id === "COURIER_CHOICE"
                          ? form.courierBranchId
                          : "",
                    preferredCourierId:
                      d.id === "COURIER_CHOICE"
                        ? form.preferredCourierId || first?.code || ""
                        : "",
                  });
                }}
                className={cn(
                  "w-full rounded-xl border px-3 py-3 text-left",
                  form.deliveryType === d.id ? "border-lf-red bg-lf-pink" : "border-lf-border"
                )}
              >
                <div className={cn("text-sm font-semibold", form.deliveryType === d.id && "text-lf-red")}>
                  {d.title}
                </div>
                <div className="mt-0.5 text-xs text-lf-muted">{d.desc}</div>
              </button>
            ))}
          </div>

          {form.deliveryType === "COURIER_CHOICE" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: "PVZ" as const, title: "Punktdan olish", desc: "Ishonchliroq · PVZ/ofis" },
                    { id: "HOME" as const, title: "Uyga yetkazish", desc: "Manzilga kuryer" },
                  ] as const
                ).map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => setForm({ ...form, handoffMode: h.id })}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-left",
                      form.handoffMode === h.id ? "border-lf-red bg-lf-pink" : "border-lf-border"
                    )}
                  >
                    <div
                      className={cn(
                        "text-sm font-semibold",
                        form.handoffMode === h.id && "text-lf-red"
                      )}
                    >
                      {h.title}
                    </div>
                    <div className="mt-0.5 text-[11px] text-lf-muted">{h.desc}</div>
                  </button>
                ))}
              </div>

              <p className="text-xs text-lf-muted">
                Viloyatingiz ({regionName}) uchun tavsiya qilingan kuryer birinchi. Punktdan olish —
                moda uchun eng ishonchli kanal.
              </p>
              <div className="grid gap-2">
                {rankedCarriers.map((rec) => {
                  const c = rec.company;
                  const localCount = c.branches.filter((b) => b.regionCode === form.regionCode).length;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        const ranked = sortBranchesByRegion(c.branches, form.regionCode);
                        const handoff = defaultHandoffForRegion(form.regionCode, c.id);
                        setForm({
                          ...form,
                          courierCompanyId: c.id,
                          handoffMode: handoff,
                          courierBranchId: handoff === "PVZ" ? ranked[0]?.id || "" : "",
                          preferredCourierId: c.code,
                        });
                      }}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-left text-sm",
                        form.courierCompanyId === c.id
                          ? "border-lf-red bg-lf-pink"
                          : "border-lf-border"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className={cn(
                            "font-semibold",
                            form.courierCompanyId === c.id && "text-lf-red"
                          )}
                        >
                          {c.name}
                        </div>
                        {rec.recommended && (
                          <span className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                            Tavsiya etiladi
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[11px] text-lf-muted">{rec.reason}</div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-lf-muted">
                        <span>{c.coverage}</span>
                        {c.phone && <span>☎ {c.phone}</span>}
                        {localCount > 0 && (
                          <span className="font-medium text-emerald-700">
                            {localCount} ta punkt shu viloyatda
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedCompany && form.handoffMode === "PVZ" && (
                <div className="space-y-2 rounded-xl border border-lf-border bg-lf-bg/60 p-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.1em] text-lf-muted">
                    Filial / punkt — {selectedCompany.name}
                  </div>
                  {selectedCompany.website && (
                    <a
                      href={selectedCompany.website}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-[11px] font-medium text-lf-red underline underline-offset-2"
                    >
                      {selectedCompany.website.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                  <p className="text-[11px] text-lf-muted">{selectedCompany.pickupNote}</p>
                  <div className="grid gap-2">
                    {sortedBranches.map((b) => {
                      const local = b.regionCode === form.regionCode;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setForm({ ...form, courierBranchId: b.id })}
                          className={cn(
                            "rounded-xl border bg-white px-3 py-2.5 text-left text-sm",
                            form.courierBranchId === b.id
                              ? "border-lf-red bg-lf-pink"
                              : "border-lf-border"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-medium">{b.name}</div>
                            {local && (
                              <span className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                                Sizning viloyat
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 text-[11px] text-lf-muted">
                            {b.city} · {b.address}
                            {b.landmark ? ` · ${b.landmark}` : ""}
                          </div>
                          {b.phone && (
                            <div className="mt-0.5 text-[11px] text-lf-muted">☎ {b.phone}</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {form.handoffMode === "HOME" && (
                <p className="rounded-xl border border-lf-border bg-lf-bg/60 px-3 py-2 text-[11px] text-lf-muted">
                  Uyga yetkazish: yuqoridagi manzilga kuryer keladi. Telefon ochiq bo‘lsin.
                </p>
              )}
            </div>
          )}

          {form.deliveryType === "PICKUP" && (
            <label className="block space-y-1">
              <span className="text-xs text-lf-muted">Qayerdan olasiz? (ombor manzili)</span>
              <select
                value={form.pickupWarehouseId}
                onChange={(e) => setForm({ ...form, pickupWarehouseId: e.target.value })}
                className="w-full rounded-xl border border-lf-border bg-lf-bg px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2"
              >
                {pickups.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.city}, {p.address}
                  </option>
                ))}
              </select>
              {pickups.length === 0 && (
                <p className="text-[11px] text-amber-700">Ombor manzillari hali yuklanmadi.</p>
              )}
            </label>
          )}

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2.5 text-xs text-emerald-900">
            {promisedByText && (
              <div className="mb-1 text-sm font-bold text-emerald-950">
                Kutiladi: {promisedByText} gacha
              </div>
            )}
            <span className="font-semibold">Tafsilot:</span>{" "}
            {deliveryEta.replace(/^Taxminiy:\s*/i, "")}
            <span className="mt-0.5 block text-[11px] font-normal text-emerald-800/80">
              Cutoff 15:00 (Toshkent) · ish kunlari · kafolat emas · bayramda o‘zgarishi mumkin
            </span>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-lf-border bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-lf-muted">Xabar olish</div>
          <p className="text-xs text-lf-muted">Buyurtma qabul qilinganda SMS yoki Telegramga avtomatik xabar.</p>
          <div className="grid grid-cols-2 gap-2">
            {notifyOptions.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => setForm({ ...form, notifyChannel: n.id })}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-sm font-medium",
                  form.notifyChannel === n.id ? "border-lf-red bg-lf-pink text-lf-red" : "border-lf-border"
                )}
              >
                {n.label}
              </button>
            ))}
          </div>
          {(form.notifyChannel === "TELEGRAM" || form.notifyChannel === "BOTH") && (
            <label className="block space-y-1">
              <span className="text-xs text-lf-muted">Telegram username</span>
              <input
                value={form.telegramUsername}
                onChange={(e) => setForm({ ...form, telegramUsername: e.target.value })}
                placeholder="@username"
                className="w-full rounded-xl border border-lf-border bg-lf-bg px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2"
              />
            </label>
          )}
        </div>

        <div className="rounded-2xl border border-lf-border bg-white p-4 shadow-sm">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-lf-muted">3. To‘lov</div>
          <div className="grid grid-cols-2 gap-2">
            {payments.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setStep(2);
                  setForm({ ...form, paymentMethod: p.id });
                }}
                className={cn(
                  "rounded-xl border px-3 py-3 text-left text-sm font-medium",
                  form.paymentMethod === p.id ? "border-lf-red bg-lf-pink text-lf-red" : "border-lf-border"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-lf-border bg-white p-4 text-sm shadow-sm">
          <div className="flex justify-between text-lf-muted">
            <span>{items.length} ta mahsulot</span>
            <span>{formatSom(sum)}</span>
          </div>
          <div className="mt-2 flex justify-between text-lf-muted">
            <span>Yetkazib berish</span>
            <span>{form.deliveryType === "PICKUP" ? "Bepul" : formatSom(delivery)}</span>
          </div>
          <div className="mt-3 flex justify-between border-t border-lf-border pt-3 text-base font-bold">
            <span>Jami</span>
            <span>{formatSom(sum + delivery)}</span>
          </div>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          onClick={() => setStep(3)}
          className="w-full rounded-2xl bg-lf-red py-3.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {loading ? "Yuborilmoqda..." : "4. Buyurtmani tasdiqlash"}
        </button>
      </form>
    </StoreShell>
  );
}
