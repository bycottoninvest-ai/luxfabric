/**
 * O‘zbekiston asosiy milliy/mashhur yetkazib beruvchilar (posilka/kuryer).
 * Manzillar — rasmiy sayt / kataloglardan; to‘liq «barcha filial» emas.
 * Express24: ovqat (Yandex Eats) — posilka ro‘yxatiga kiritilmadi.
 * Stark Express / APEX: ishonchli ochiq ma’lumot yetarli emas — kiritilmadi.
 */

export type UzCourierBranch = {
  id: string;
  name: string;
  regionCode: string;
  city: string;
  address: string;
  phone?: string | null;
  landmark?: string | null;
};

export type UzCourierCompany = {
  id: string;
  code: string;
  name: string;
  shortDesc: string;
  website: string | null;
  phone: string | null;
  coverage: string;
  pickupNote: string;
  supportsCod: boolean;
  sortOrder: number;
  apiBaseUrl?: string | null;
  notes?: string | null;
  branches: UzCourierBranch[];
};

export const UZ_COURIER_COMPANIES: UzCourierCompany[] = [
  {
    id: "bts",
    code: "BTS",
    name: "BTS Express",
    shortDesc: "Milliy ekspress pochta, fulfillment va xalqaro jo‘natmalar.",
    website: "https://bts.uz",
    phone: "1230",
    coverage: "O‘zbekiston bo‘ylab",
    pickupNote: "Yaqin ofis/PVZ ni tanlang yoki to‘liq ro‘yxat: bts.uz/uz/nashi-ofisi",
    supportsCod: true,
    sortOrder: 1,
    apiBaseUrl: "https://api.bts.uz",
    notes: "Call-center: 1230",
    branches: [
      {
        id: "bts-tash-janubiy",
        name: "Janubiy vokzal (bosh ofis zonasi)",
        regionCode: "TAS",
        city: "Toshkent",
        address: "Yakkasaroy tumani, Kichik halqa yo‘li, 22A",
        phone: "1230",
        landmark: "IBR yonida",
      },
      {
        id: "bts-tash-qushbegi",
        name: "Qushbegi (sklad)",
        regionCode: "TAS",
        city: "Toshkent",
        address: "Qushbegi massivi, Kichik halqa yo‘li, 23",
        phone: "1230",
      },
      {
        id: "bts-tash-sam-darvoza",
        name: "Samarqand Darvoza",
        regionCode: "TAS",
        city: "Toshkent",
        address: "Shayxontohur tumani, Samarqand Darvoza ko‘chasi, 1",
        phone: "1230",
        landmark: "JFA stomatologiya qarshisi",
      },
      {
        id: "bts-sam-siyob",
        name: "Samarqand Siyob",
        regionCode: "SAM",
        city: "Samarqand",
        address: "Rudakiy ko‘chasi, 277",
        phone: "1230",
        landmark: "Kohinur Plaza qarshisi",
      },
      {
        id: "bts-xor-urganch",
        name: "Urganch",
        regionCode: "XOR",
        city: "Urganch",
        address: "Al-Xorazmiy ko‘chasi, 62",
        phone: "+998935052566",
        landmark: "Eski vino zavod chorrahasida",
      },
      {
        id: "bts-xor-urganch-4mkr",
        name: "Urganch 4-mkr",
        regionCode: "XOR",
        city: "Urganch",
        address: "Zarbuloq ko‘chasi, 1-uy, 26-xonadon",
        phone: "1230",
        landmark: "Stadion chorrahasida",
      },
      {
        id: "bts-xor-xiva",
        name: "Xiva",
        regionCode: "XOR",
        city: "Xiva",
        address: "Yangi Hayot, A. Temur ko‘chasi",
        phone: "1230",
        landmark: "Prokuratura yonida",
      },
    ],
  },
  {
    id: "fargo",
    code: "FARGO",
    name: "Fargo",
    shortDesc: "E-commerce last-mile, 1100+ pickup point va locker tarmog‘i.",
    website: "https://fargo.uz",
    phone: "+998712000037",
    coverage: "O‘zbekiston bo‘ylab (120+ shahar)",
    pickupNote: "Aniq punkt/locker ni fargo.uz dagi xarita orqali tanlang.",
    supportsCod: true,
    sortOrder: 2,
    notes: "info@fargo.uz · +998 71 200 00 37",
    branches: [
      {
        id: "fargo-web",
        name: "Pickup point / locker (saytdan)",
        regionCode: "TAS",
        city: "Toshkent va viloyatlar",
        address: "Saytdan eng yaqin punktni tanlang",
        phone: "+998712000037",
      },
      {
        id: "fargo-qash-shahrisabz",
        name: "Shahrisabz ofis",
        regionCode: "QAS",
        city: "Shahrisabz",
        address: "Chilonzor ko‘chasi, 16/2",
        phone: "+998712000037",
      },
    ],
  },
  {
    id: "uzpost",
    code: "UZPOST",
    name: "O‘zbekiston pochtasi (UzPost)",
    shortDesc: "Milliy pochta — viloyatlar bo‘ylab bo‘limlar tarmog‘i.",
    website: "https://uz.post",
    phone: "1165",
    coverage: "O‘zbekiston bo‘ylab",
    pickupNote: "Yaqin pochta bo‘limini uz.post/uz/filiallar yoki xaritadan tanlang.",
    supportsCod: true,
    sortOrder: 3,
    notes: "+998 71 233 57 47 · Yunusobod, Oloy ko‘chasi, 1",
    branches: [
      {
        id: "uzpost-hq",
        name: "Bosh ofis / aloqa",
        regionCode: "TAS",
        city: "Toshkent",
        address: "Yunusobod tumani, Oloy ko‘chasi, 1",
        phone: "1165",
      },
      {
        id: "uzpost-tash-pochtamt",
        name: "Toshkent pochtamt",
        regionCode: "TAS",
        city: "Toshkent",
        address: "Shahrisabz ko‘chasi (Toshkent pochtamt filiali)",
        phone: "1165",
        landmark: "Aniq bo‘lim — uz.post xaritasi",
      },
      {
        id: "uzpost-xor",
        name: "Xorazm filiali (viloyat)",
        regionCode: "XOR",
        city: "Urganch",
        address: "Viloyat pochta bo‘limlari — saytdan punkt tanlang",
        phone: "1165",
      },
    ],
  },
  {
    id: "ems",
    code: "EMS",
    name: "EMS Uzbekistan",
    shortDesc: "Xalqaro/tezkor pochta (UzPost tarkibida).",
    website: "https://emspost.uz",
    phone: "1081",
    coverage: "O‘zbekiston + xalqaro",
    pickupNote: "EMS qabul qiladigan UzPost bo‘limlarini uz.post dan tanlang; Toshkentda 1081 orqali kuryer chaqirish mumkin.",
    supportsCod: true,
    sortOrder: 4,
    notes: "+998 71 232 09 44 · info.ems@post.uz",
    branches: [
      {
        id: "ems-central",
        name: "EMS markaziy ofis",
        regionCode: "TAS",
        city: "Toshkent",
        address: "Mirobod tumani, Turkiston ko‘chasi, 4",
        phone: "1081",
        landmark: "Xalqaro pochtamt",
      },
    ],
  },
  {
    id: "yandex",
    code: "YANDEX",
    name: "Yandex Delivery",
    shortDesc: "Biznes uchun tezkor kuryer (asosan Toshkent, kengaymoqda).",
    website: "https://delivery.yandex.uz",
    phone: null,
    coverage: "Toshkent (boshqa yirik shaharlar ulanmoqda)",
    pickupNote: "Punktlar o‘rniga ilova orqali kuryer chaqiriladi — Yandex Go / delivery.yandex.uz",
    supportsCod: true,
    sortOrder: 5,
    apiBaseUrl: "https://b2b.taxi.yandex.net",
    notes: "Asosan B2B ekspress; milliy PVZ tarmog‘i emas.",
    branches: [
      {
        id: "yandex-tash",
        name: "Toshkent — kuryer (ilova)",
        regionCode: "TAS",
        city: "Toshkent",
        address: "Manzilga kuryer chaqiring (punktsiz)",
        phone: null,
      },
    ],
  },
  {
    id: "tezbor",
    code: "TEZBOR",
    name: "Tezbor",
    shortDesc: "Hujjat, posilka va last-mile yetkazish (O‘zbekiston).",
    website: "https://tezbor.uz",
    phone: "+998555005051",
    coverage: "O‘zbekiston bo‘ylab",
    pickupNote: "Buyurtma/punkt — tezbor.uz yoki mobil ilova orqali.",
    supportsCod: true,
    sortOrder: 6,
    notes: "Chilonzor, Sug‘alli-Ota, 11",
    branches: [
      {
        id: "tezbor-hq",
        name: "Toshkent ofis",
        regionCode: "TAS",
        city: "Toshkent",
        address: "Chilonzor tumani, Sug‘alli-Ota ko‘chasi, 11",
        phone: "+998555005051",
      },
    ],
  },
  {
    id: "dpd",
    code: "DPD",
    name: "DPD Uzbekistan",
    shortDesc: "DPD Eurasia — ichki va xalqaro ekspress yuk.",
    website: "https://dpd.uz",
    phone: "+998917878787",
    coverage: "O‘zbekiston bo‘ylab + xalqaro",
    pickupNote: "Filial/qabul punktlari — dpd.uz kontaktlar bo‘limidan.",
    supportsCod: true,
    sortOrder: 7,
    notes: "customer@dpd.uz · Du–Ju 09:00–18:00",
    branches: [
      {
        id: "dpd-tash",
        name: "Toshkent bosh ofis",
        regionCode: "TAS",
        city: "Toshkent",
        address: "Sergeli tumani, Toshkent halqa yo‘li, 229/12",
        phone: "+998917878787",
      },
      {
        id: "dpd-xor",
        name: "Urganch bo‘limi",
        regionCode: "XOR",
        city: "Urganch",
        address: "Viloyat bo‘limi — dpd.uz/infocenter/contacts",
        phone: "+998917878787",
      },
      {
        id: "dpd-sam",
        name: "Samarqand bo‘limi",
        regionCode: "SAM",
        city: "Samarqand",
        address: "Viloyat bo‘limi — dpd.uz kontaktlar",
        phone: "+998917878787",
      },
    ],
  },
];

/** Seed / CourierPartner uchun soddalashtirilgan ro‘yxat */
export const UZ_COURIERS = UZ_COURIER_COMPANIES.map((c) => ({
  code: c.code,
  name: c.name,
  nameUz: c.name,
  phone: c.phone,
  website: c.website,
  apiBaseUrl: c.apiBaseUrl ?? null,
  supportsCod: c.supportsCod,
  notes: c.notes || c.shortDesc,
  sortOrder: c.sortOrder,
}));

export function getUzCourierByCode(code: string) {
  return UZ_COURIER_COMPANIES.find((c) => c.code === code || c.id === code);
}

export function getUzCourierById(id: string) {
  return UZ_COURIER_COMPANIES.find((c) => c.id === id || c.code === id);
}

/** Tanlangan viloyatdagi punktlar birinchi — keyin qolganlari */
export function sortBranchesByRegion(branches: UzCourierBranch[], regionCode: string) {
  return [...branches].sort((a, b) => {
    const aHit = a.regionCode === regionCode ? 0 : 1;
    const bHit = b.regionCode === regionCode ? 0 : 1;
    if (aHit !== bHit) return aHit - bHit;
    return a.city.localeCompare(b.city, "uz");
  });
}

export function formatBranchLabel(b: UzCourierBranch) {
  const bits = [b.city, b.address];
  if (b.landmark) bits.push(`(${b.landmark})`);
  return bits.join(" — ");
}
