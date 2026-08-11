/** O‘zbekiston viloyatlari va tumanlari (checkout uchun) */

export type UzDistrict = { name: string };
export type UzRegion = { code: string; name: string; districts: string[] };

export const UZ_REGIONS: UzRegion[] = [
  {
    code: "TAS",
    name: "Toshkent shahri",
    districts: [
      "Bektemir",
      "Chilonzor",
      "Yashnobod",
      "Mirobod",
      "Mirzo Ulug‘bek",
      "Sergeli",
      "Shayxontohur",
      "Olmazor",
      "Uchtepa",
      "Yakkasaroy",
      "Yunusobod",
      "Yangihayot",
    ],
  },
  {
    code: "AND",
    name: "Andijon viloyati",
    districts: [
      "Andijon shahri",
      "Xonobod shahri",
      "Andijon tumani",
      "Asaka",
      "Baliqchi",
      "Bo‘z",
      "Buloqboshi",
      "Izboskan",
      "Jalaquduq",
      "Marhamat",
      "Oltinko‘l",
      "Paxtaobod",
      "Qo‘rg‘ontepa",
      "Shahrixon",
      "Ulug‘nor",
      "Xo‘jaobod",
    ],
  },
  {
    code: "BUH",
    name: "Buxoro viloyati",
    districts: [
      "Buxoro shahri",
      "Kogon shahri",
      "Buxoro tumani",
      "Vobkent",
      "G‘ijduvon",
      "Jondor",
      "Kogon tumani",
      "Olot",
      "Peshku",
      "Romitan",
      "Shofirkon",
      "Qorako‘l",
      "Qorovulbozor",
    ],
  },
  {
    code: "FER",
    name: "Farg‘ona viloyati",
    districts: [
      "Farg‘ona shahri",
      "Marg‘ilon shahri",
      "Qo‘qon shahri",
      "Quvasoy shahri",
      "Besharik",
      "Bog‘dod",
      "Buvayda",
      "Dang‘ara",
      "Farg‘ona tumani",
      "Furqat",
      "O‘zbekiston",
      "Oltiariq",
      "Qo‘shtepa",
      "Rishton",
      "So‘x",
      "Toshloq",
      "Uchko‘prik",
      "Yozyovon",
      "Quva",
    ],
  },
  {
    code: "JIZ",
    name: "Jizzax viloyati",
    districts: [
      "Jizzax shahri",
      "Arnasoy",
      "Baxmal",
      "Do‘stlik",
      "Forish",
      "G‘allaorol",
      "Jizzax tumani",
      "Mirzacho‘l",
      "Paxtakor",
      "Yangiobod",
      "Zafarobod",
      "Zarbdor",
      "Zomin",
    ],
  },
  {
    code: "QAS",
    name: "Qashqadaryo viloyati",
    districts: [
      "Qarshi shahri",
      "Shahrisabz shahri",
      "Chiroqchi",
      "Dehqonobod",
      "G‘uzor",
      "Qamashi",
      "Qarshi tumani",
      "Koson",
      "Kasbi",
      "Kitob",
      "Mirishkor",
      "Muborak",
      "Nishon",
      "Shahrisabz tumani",
      "Yakkabog‘",
      "Ko‘kdala",
    ],
  },
  {
    code: "NAV",
    name: "Navoiy viloyati",
    districts: [
      "Navoiy shahri",
      "Zarafshon shahri",
      "Konimex",
      "Karmana",
      "Qiziltepa",
      "Xatirchi",
      "Navbahor",
      "Nurota",
      "Tomdi",
      "Uchquduq",
    ],
  },
  {
    code: "NAM",
    name: "Namangan viloyati",
    districts: [
      "Namangan shahri",
      "Chortoq",
      "Chust",
      "Kosonsoy",
      "Mingbuloq",
      "Namangan tumani",
      "Norin",
      "Pop",
      "To‘raqo‘rg‘on",
      "Uychi",
      "Uchqo‘rg‘on",
      "Yangiqo‘rg‘on",
      "Davlatobod",
      "Yangi Namangan",
    ],
  },
  {
    code: "SAM",
    name: "Samarqand viloyati",
    districts: [
      "Samarqand shahri",
      "Kattaqo‘rg‘on shahri",
      "Bulung‘ur",
      "Ishtixon",
      "Jomboy",
      "Kattaqo‘rg‘on tumani",
      "Qo‘shrabot",
      "Narpay",
      "Nurobod",
      "Oqdaryo",
      "Payariq",
      "Pastdarg‘om",
      "Paxtachi",
      "Samarqand tumani",
      "Toyloq",
      "Urgut",
    ],
  },
  {
    code: "SIR",
    name: "Sirdaryo viloyati",
    districts: [
      "Guliston shahri",
      "Yangiyer shahri",
      "Shirin shahri",
      "Boyovut",
      "Guliston tumani",
      "Xovos",
      "Mirzaobod",
      "Oqoltin",
      "Sardoba",
      "Sayxunobod",
      "Sirdaryo tumani",
    ],
  },
  {
    code: "SUR",
    name: "Surxondaryo viloyati",
    districts: [
      "Termiz shahri",
      "Angor",
      "Bandixon",
      "Boysun",
      "Denov",
      "Jarqo‘rg‘on",
      "Qiziriq",
      "Qumqo‘rg‘on",
      "Muzrabot",
      "Oltinsoy",
      "Sariosiyo",
      "Sherobod",
      "Sho‘rchi",
      "Termiz tumani",
      "Uzun",
    ],
  },
  {
    code: "TOS",
    name: "Toshkent viloyati",
    districts: [
      "Nurafshon shahri",
      "Angren shahri",
      "Bekobod shahri",
      "Chirchiq shahri",
      "Ohangaron shahri",
      "Olmaliq shahri",
      "Yangiyo‘l shahri",
      "Bekobod tumani",
      "Bo‘ka",
      "Bo‘stonliq",
      "Chinoz",
      "Qibray",
      "Ohangaron tumani",
      "Oqqo‘rg‘on",
      "Parkent",
      "Piskent",
      "Quyi Chirchiq",
      "Zangiota",
      "O‘rta Chirchiq",
      "Yuqori Chirchiq",
      "Yangiyo‘l tumani",
      "Toshkent tumani",
    ],
  },
  {
    code: "XOR",
    name: "Xorazm viloyati",
    districts: [
      "Urganch shahri",
      "Xiva shahri",
      "Bog‘ot",
      "Gurlan",
      "Xonqa",
      "Hazorasp",
      "Qo‘shko‘pir",
      "Shovot",
      "Urganch tumani",
      "Yangiariq",
      "Yangibozor",
      "Tuproqqal’a",
    ],
  },
  {
    code: "QQR",
    name: "Qoraqalpog‘iston Respublikasi",
    districts: [
      "Nukus shahri",
      "Amudaryo",
      "Beruniy",
      "Chimboy",
      "Ellikqal’a",
      "Kegeyli",
      "Mo‘ynoq",
      "Nukus tumani",
      "Qanliko‘l",
      "Qo‘ng‘irot",
      "Qorao‘zak",
      "Shumanay",
      "Taxtako‘pir",
      "To‘rtko‘l",
      "Xo‘jayli",
      "Taxiatosh",
      "Bo‘zatov",
    ],
  },
];

export function getRegionByCode(code: string) {
  return UZ_REGIONS.find((r) => r.code === code);
}

export function formatCityLabel(regionName: string, district: string) {
  return `${regionName}, ${district}`;
}

function normalizeGeo(s: string) {
  return s
    .toLowerCase()
    .replace(/[''`‘’ʻʼ]/g, "")
    .replace(/gʻ|ғ|gʻ/gi, "g")
    .replace(/oʻ|ў/gi, "o")
    .replace(/shahri|tumani|viloyati|respublikasi/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** GPS / reverse-geocode matnidan viloyat + tuman topish */
export function matchUzFromGeoText(text: string): { regionCode: string; district: string } | null {
  const hay = normalizeGeo(text);
  if (!hay) return null;

  let best: { regionCode: string; district: string; score: number } | null = null;

  for (const region of UZ_REGIONS) {
    const rn = normalizeGeo(region.name);
    const regionHit = hay.includes(rn) || rn.split(" ").some((w) => w.length > 3 && hay.includes(w));

    for (const district of region.districts) {
      const dn = normalizeGeo(district);
      if (!dn) continue;
      let score = 0;
      if (hay.includes(dn)) score += 50;
      const parts = dn.split(" ").filter((p) => p.length > 3);
      for (const p of parts) if (hay.includes(p)) score += 15;
      if (regionHit) score += 20;
      if (score > 0 && (!best || score > best.score)) {
        best = { regionCode: region.code, district, score };
      }
    }

    if (regionHit && !best) {
      best = { regionCode: region.code, district: region.districts[0], score: 10 };
    }
  }

  return best ? { regionCode: best.regionCode, district: best.district } : null;
}
