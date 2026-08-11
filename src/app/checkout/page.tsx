"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StoreShell } from "@/components/StoreShell";
import { useCart } from "@/lib/cart";
import { cn, formatSom, isValidUzPhone, maskUzPhone } from "@/lib/utils";
import { UZ_REGIONS, formatCityLabel, getRegionByCode, matchUzFromGeoText } from "@/lib/uzbekistan-regions";

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
    desc: "Hech narsa tanlamasangiz — biz eng qulay kuryerni o‘zimiz tanlaymiz",
  },
  {
    id: "COURIER_CHOICE",
    title: "O‘zim kuryer tanlayman",
    desc: "Qayerdan olish qulay bo‘lsa — o‘sha kuryerni belgilaysiz",
  },
  {
    id: "PICKUP",
    title: "O‘zim olib ketaman",
    desc: "Yaqin ombor / punktdan olib ketish",
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

type Courier = { id: string; code: string; nameUz: string; name: string; notes: string | null };
type Pickup = {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string | null;
  region: { nameUz: string };
};

type CheckoutForm = {
  name: string;
  phone: string;
  regionCode: string;
  district: string;
  address: string;
  paymentMethod: string;
  deliveryType: "SHOP_DELIVERY" | "COURIER_CHOICE" | "PICKUP";
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
}) {
  try {
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(data));
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
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [locating, setLocating] = useState(false);
  const [locHint, setLocHint] = useState("");
  const [profileHint, setProfileHint] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
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
    preferredCourierId: "",
    pickupWarehouseId: "",
    notifyChannel: "SMS",
    telegramUsername: "",
  });

  const districts = useMemo(() => getRegionByCode(form.regionCode)?.districts || [], [form.regionCode]);
  const regionName = getRegionByCode(form.regionCode)?.name || "";
  const cityLabel = formatCityLabel(regionName, form.district);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(CUSTOMER_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<CheckoutForm> & { city?: string };
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
        };
        if (saved.city && !saved.regionCode) next = applyCityToForm(saved.city, next);
        return next;
      });
      if (saved.name || saved.address || saved.phone) {
        setProfileHint("Oldingi ma’lumotlaringiz yuklandi — kerak bo‘lsa o‘zgartiring.");
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetch("/api/delivery-options")
      .then((r) => r.json())
      .then((d) => {
        setCouriers(d.couriers || []);
        setPickups(d.pickups || []);
        if (d.pickups?.[0]?.id) {
          setForm((f) => ({ ...f, pickupWarehouseId: f.pickupWarehouseId || d.pickups[0].id }));
        }
      })
      .catch(() => {});
  }, []);

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
    if (form.deliveryType === "COURIER_CHOICE" && !form.preferredCourierId) {
      setError("Kuryerni tanlang yoki «Do‘kon o‘zi yuboradi»ni belgilang");
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
          paymentMethod: form.paymentMethod,
          deliveryType: form.deliveryType,
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
      });
      clear();
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
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-lf-muted">2. Manzil</div>
            <button
              type="button"
              onClick={detectLocation}
              disabled={locating}
              className="rounded-lg border border-lf-red/30 bg-lf-pink px-2.5 py-1 text-[11px] font-semibold text-lf-red disabled:opacity-60"
            >
              {locating ? "Aniqlanmoqda..." : "Joylashuvni aniqlash"}
            </button>
          </div>

          <label className="block space-y-1">
            <span className="text-xs text-lf-muted">Ism</span>
            <input
              required
              value={form.name}
              onFocus={() => setStep(1)}
              onChange={(e) => {
                setStep(1);
                setForm({ ...form, name: e.target.value });
              }}
              placeholder="Ismingiz"
              className="w-full rounded-xl border border-lf-border bg-lf-bg px-3 py-2.5 text-sm outline-none ring-lf-red focus:ring-2"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-lf-muted">Telefon (+998, 12 raqam)</span>
            <input
              required
              type="tel"
              inputMode="numeric"
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
              value={form.regionCode}
              onChange={(e) => {
                const code = e.target.value;
                const firstDistrict = getRegionByCode(code)?.districts[0] || "";
                setStep(1);
                setForm({ ...form, regionCode: code, district: firstDistrict });
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
          {locHint && <p className="text-[11px] text-emerald-600">{locHint}</p>}
          {profileHint && <p className="text-[11px] text-emerald-600">{profileHint}</p>}
          {lookingUp && <p className="text-[11px] text-lf-muted">Mijoz bazadan qidirilmoqda...</p>}
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
                  setForm({
                    ...form,
                    deliveryType: d.id,
                    preferredCourierId: d.id === "COURIER_CHOICE" ? form.preferredCourierId : "",
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
            <div className="grid gap-2 sm:grid-cols-2">
              {couriers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setForm({ ...form, preferredCourierId: c.id })}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-left text-sm",
                    form.preferredCourierId === c.id
                      ? "border-lf-red bg-lf-pink text-lf-red"
                      : "border-lf-border"
                  )}
                >
                  <div className="font-medium">{c.nameUz || c.name}</div>
                  {c.notes && <div className="text-[11px] text-lf-muted">{c.notes}</div>}
                </button>
              ))}
            </div>
          )}

          {form.deliveryType === "PICKUP" && (
            <label className="block space-y-1">
              <span className="text-xs text-lf-muted">Qayerdan olasiz?</span>
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
            </label>
          )}
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
