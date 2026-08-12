import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";
import { UZ_COURIERS } from "../src/lib/couriers";

const prisma = new PrismaClient();

async function ensureCouriers() {
  for (const c of UZ_COURIERS) {
    await prisma.courierPartner.upsert({
      where: { code: c.code },
      update: {
        name: c.name,
        nameUz: c.nameUz,
        phone: c.phone,
        website: c.website,
        apiBaseUrl: c.apiBaseUrl,
        supportsCod: c.supportsCod,
        notes: c.notes,
        sortOrder: c.sortOrder,
        isActive: true,
        coverage: "UZ",
      },
      create: {
        code: c.code,
        name: c.name,
        nameUz: c.nameUz,
        phone: c.phone,
        website: c.website,
        apiBaseUrl: c.apiBaseUrl,
        supportsCod: c.supportsCod,
        notes: c.notes,
        sortOrder: c.sortOrder,
        isActive: true,
        coverage: "UZ",
      },
    });
  }
  console.log(`[seed] couriers: ${await prisma.courierPartner.count()}`);
}

function hashPassword(password: string): string {
  const N = 16384;
  const r = 8;
  const p = 1;
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

/** O‘zbekiston: Toshkent shahar (markaz) + 12 viloyat + Qoraqalpog‘iston */
export const UZ_REGIONS = [
  { code: "TAS", name: "Tashkent City", nameUz: "Toshkent shahri", sortOrder: 0, city: "Toshkent", address: "Yunusobod, Amir Temur 108", lat: 41.3111, lng: 69.2797, isCentral: true, phone: "+998712000001" },
  { code: "AND", name: "Andijan", nameUz: "Andijon viloyati", sortOrder: 1, city: "Andijon", address: "Navoiy ko‘chasi 22", lat: 40.7821, lng: 72.3442, isCentral: false, phone: "+998742000001" },
  { code: "BUH", name: "Bukhara", nameUz: "Buxoro viloyati", sortOrder: 2, city: "Buxoro", address: "Mustaqillik 45", lat: 39.7681, lng: 64.4556, isCentral: false, phone: "+998652000001" },
  { code: "FER", name: "Fergana", nameUz: "Farg‘ona viloyati", sortOrder: 3, city: "Farg‘ona", address: "Al-Farg‘oniy 19", lat: 40.3864, lng: 71.7864, isCentral: false, phone: "+998732000001" },
  { code: "JIZ", name: "Jizzakh", nameUz: "Jizzax viloyati", sortOrder: 4, city: "Jizzax", address: "Sh. Rashidov 11", lat: 40.1158, lng: 67.8422, isCentral: false, phone: "+998722000001" },
  { code: "QAS", name: "Kashkadarya", nameUz: "Qashqadaryo viloyati", sortOrder: 5, city: "Qarshi", address: "Nasaf 9", lat: 38.8606, lng: 65.7891, isCentral: false, phone: "+998752000001" },
  { code: "NAV", name: "Navoiy", nameUz: "Navoiy viloyati", sortOrder: 6, city: "Navoiy", address: "Galaba 18", lat: 40.1039, lng: 65.3686, isCentral: false, phone: "+998436200001" },
  { code: "NAM", name: "Namangan", nameUz: "Namangan viloyati", sortOrder: 7, city: "Namangan", address: "Uychi 7", lat: 41.0011, lng: 71.6726, isCentral: false, phone: "+998692000001" },
  { code: "SAM", name: "Samarkand", nameUz: "Samarqand viloyati", sortOrder: 8, city: "Samarqand", address: "Registon yo‘li 12", lat: 39.6542, lng: 66.9597, isCentral: false, phone: "+998662000001" },
  { code: "SIR", name: "Sirdarya", nameUz: "Sirdaryo viloyati", sortOrder: 9, city: "Guliston", address: "Mustaqillik 5", lat: 40.4897, lng: 68.7842, isCentral: false, phone: "+998672000001" },
  { code: "SUR", name: "Surkhandarya", nameUz: "Surxondaryo viloyati", sortOrder: 10, city: "Termiz", address: "Alisher Navoiy 4", lat: 37.2242, lng: 67.2783, isCentral: false, phone: "+998762000001" },
  { code: "TOS", name: "Tashkent Region", nameUz: "Toshkent viloyati", sortOrder: 11, city: "Nurafshon", address: "Mustaqillik 1", lat: 41.035, lng: 69.36, isCentral: false, phone: "+998702000001" },
  { code: "XOR", name: "Khorezm", nameUz: "Xorazm viloyati", sortOrder: 12, city: "Urganch", address: "Al-Xorazmiy 15", lat: 41.55, lng: 60.6333, isCentral: false, phone: "+998622000001" },
  { code: "QQR", name: "Karakalpakstan", nameUz: "Qoraqalpog‘iston", sortOrder: 13, city: "Nukus", address: "Dosnazarov 3", lat: 42.4531, lng: 59.6103, isCentral: false, phone: "+998612000001" },
];

const sizes = ["S", "M", "L", "XL", "XXL"];

async function main() {
  await ensureCouriers();

  const existing = await prisma.product.count();
  if (existing > 0 && process.env.FORCE_SEED !== "1") {
    console.log(
      `[seed] ${existing} mahsulot bor — o‘tkazib yuborildi (qayta seed: FORCE_SEED=1)`
    );
    return;
  }

  await prisma.trackingEvent.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.warehouseStock.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.region.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.adminUser.deleteMany();
  await prisma.systemSetting.deleteMany();

  const warehouses = [];
  for (const r of UZ_REGIONS) {
    const region = await prisma.region.create({
      data: {
        code: r.code,
        name: r.name,
        nameUz: r.nameUz,
        sortOrder: r.sortOrder,
      },
    });
    const wh = await prisma.warehouse.create({
      data: {
        name: `${r.city} ombori`,
        city: r.city,
        address: r.address,
        phone: r.phone,
        lat: r.lat,
        lng: r.lng,
        isCentral: r.isCentral,
        isActive: true,
        regionId: region.id,
      },
    });
    warehouses.push(wh);
  }

  const cats = await Promise.all(
    [
      { name: "Futbolkalar", slug: "futbolkalar" },
      { name: "Polo", slug: "polo" },
      { name: "Hoodie", slug: "hoodie" },
      { name: "Shortlar", slug: "shortlar" },
    ].map((c) => prisma.category.create({ data: c }))
  );

  const productsData = [
    {
      name: "Nice Print Futbolka",
      slug: "nice-print-futbolka",
      description: "Premium paxta print futbolka. Kunlik kiyim uchun ideal.",
      fabric: "100% premium paxta, 220 gsm",
      care: "30°C da yuvish",
      price: 129000,
      oldPrice: 161000,
      rating: 4.9,
      soldCount: 2840,
      featured: true,
      categoryId: cats[0].id,
      colors: [
        { color: "Qora", colorHex: "#111111" },
        { color: "Oq", colorHex: "#F5F5F5" },
        { color: "Qizil", colorHex: "#C81E1E" },
      ],
      image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80",
    },
    {
      name: "Oversize Basic Futbolka",
      slug: "oversize-basic-futbolka",
      description: "Zamonaviy oversize kesim. Street style uchun.",
      fabric: "95% paxta, 5% elastan",
      care: "Sovuq suvda yuvish",
      price: 149000,
      oldPrice: 189000,
      rating: 4.8,
      soldCount: 1920,
      featured: true,
      categoryId: cats[0].id,
      colors: [
        { color: "Yashil", colorHex: "#2F6B4F" },
        { color: "Qora", colorHex: "#111111" },
      ],
      image: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&q=80",
    },
    {
      name: "Classic Polo",
      slug: "classic-polo",
      description: "Klassik polo — ofis va dam olish uchun.",
      fabric: "Pique paxta",
      care: "30°C, dazmol past",
      price: 189000,
      oldPrice: null,
      rating: 4.7,
      soldCount: 860,
      featured: true,
      categoryId: cats[1].id,
      colors: [
        { color: "Ko'k", colorHex: "#1E3A5F" },
        { color: "Oq", colorHex: "#F5F5F5" },
      ],
      image: "https://images.unsplash.com/photo-1625910513413-58f4e0f0f6a1?w=800&q=80",
    },
    {
      name: "Premium Hoodie",
      slug: "premium-hoodie",
      description: "Issiq va yumshoq hoodie.",
      fabric: "Fleece 320 gsm",
      care: "30°C, quritgichda emas",
      price: 289000,
      oldPrice: 349000,
      rating: 4.9,
      soldCount: 640,
      featured: true,
      categoryId: cats[2].id,
      colors: [
        { color: "Qora", colorHex: "#111111" },
        { color: "Bej", colorHex: "#D2B48C" },
      ],
      image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80",
    },
    {
      name: "Sport Short",
      slug: "sport-short",
      description: "Yengil sport short.",
      fabric: "Polyester mesh",
      care: "Sovuq yuvish",
      price: 99000,
      oldPrice: 129000,
      rating: 4.6,
      soldCount: 1120,
      featured: false,
      categoryId: cats[3].id,
      colors: [
        { color: "Qora", colorHex: "#111111" },
        { color: "Kulrang", colorHex: "#6B6B6B" },
      ],
      image: "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800&q=80",
    },
    {
      name: "Minimal Logo Tee",
      slug: "minimal-logo-tee",
      description: "Minimal logo bilan sof dizayn.",
      fabric: "Organic cotton 180 gsm",
      care: "30°C yuvish",
      price: 119000,
      oldPrice: null,
      rating: 4.8,
      soldCount: 1540,
      featured: true,
      categoryId: cats[0].id,
      colors: [
        { color: "Oq", colorHex: "#F5F5F5" },
        { color: "Qora", colorHex: "#111111" },
      ],
      image: "https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?w=800&q=80",
    },
  ];

  for (const p of productsData) {
    const product = await prisma.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        fabric: p.fabric,
        care: p.care,
        price: p.price,
        oldPrice: p.oldPrice,
        rating: p.rating,
        soldCount: p.soldCount,
        featured: p.featured,
        categoryId: p.categoryId,
        images: { create: [{ url: p.image, alt: p.name, sortOrder: 0 }] },
      },
    });

    for (const c of p.colors) {
      for (const size of sizes) {
        const sku = `${p.slug.slice(0, 8)}-${c.colorHex.replace("#", "")}-${size}`.toUpperCase();
        const barcode = `LF${Math.floor(100000000 + Math.random() * 899999999)}`;
        const variant = await prisma.productVariant.create({
          data: { sku, color: c.color, colorHex: c.colorHex, size, barcode, productId: product.id },
        });

        for (const wh of warehouses) {
          const base = wh.isCentral ? 50 : 18;
          const qty = Math.max(5, base + Math.floor(Math.random() * 25) - (size === "M" || size === "L" ? 0 : 6));
          await prisma.warehouseStock.create({
            data: { warehouseId: wh.id, variantId: variant.id, quantity: qty },
          });
        }
      }
    }
  }

  const adminPassword = process.env.ADMIN_PASSWORD?.trim() || "demo";
  await prisma.adminUser.create({
    data: {
      email: "admin@luxfabricshop.uz",
      name: "Luxfabric Admin",
      passwordHash: hashPassword(adminPassword),
      role: "ADMIN",
    },
  });
  console.log(
    `[seed] admin: admin@luxfabricshop.uz (parol: ${process.env.ADMIN_PASSWORD ? "ADMIN_PASSWORD" : "demo"})`
  );

  const defaults: Record<string, string> = {
    app_domain: "https://luxfabricshop.uz",
    app_name: "LUXFABRIC",
    instagram_username: "luxfabricshop.uz",
    instagram_verify_token: "luxfabric_verify",
    instagram_page_token: "",
    instagram_app_secret: "",
    instagram_enabled: "false",
    instagram_dm_welcome:
      "Assalomu alaykum! LUXFABRIC AI yordamchi. Narx, o‘lcham yoki yetkazib berish haqida so‘rang 👋",
    instagram_auto_reply_price:
      "Nice Print Futbolka — 129 000 so‘m. Shop Now: /product/nice-print-futbolka?from=instagram",
    instagram_auto_reply_size: "Hozir omborda: S / M / L / XL / XXL. Qaysi o‘lcham kerak?",
    instagram_auto_reply_delivery:
      "Butun O‘zbekiston bo‘ylab 1–2 kun. Eng yaqin ombordan jo‘natamiz.",
    instagram_auto_reply_default:
      "Salom! Narx, o‘lcham, yetkazib berish yoki buyurtma havolasini so‘rashingiz mumkin.",
    telegram_bot_token: "",
    click_merchant_id: "",
    click_service_id: "",
    click_secret_key: "",
    payme_merchant_id: "",
    support_phone: "+998900000000",
  };
  for (const [key, value] of Object.entries(defaults)) {
    await prisma.systemSetting.create({ data: { key, value } });
  }

  const customer = await prisma.customer.create({
    data: {
      name: "Demo Mijoz",
      phone: "+998901234567",
      city: "Toshkent",
      address: "Chilonzor, 12-mavze",
    },
  });

  const product = await prisma.product.findFirst({ include: { variants: true } });
  const central = warehouses.find((w) => w.isCentral)!;
  if (product) {
    const variant = product.variants[0];
    await prisma.order.create({
      data: {
        orderNumber: "LF-080963",
        status: "ON_THE_WAY",
        paymentMethod: "CLICK",
        paymentStatus: "PAID",
        subtotal: product.price,
        deliveryFee: 15000,
        total: product.price + 15000,
        customerName: customer.name!,
        customerPhone: customer.phone,
        city: "Toshkent",
        address: "Chilonzor, 12-mavze, 45-uy",
        source: "INSTAGRAM",
        customerId: customer.id,
        warehouseId: central.id,
        items: {
          create: [{ quantity: 1, price: product.price, productId: product.id, variantId: variant.id }],
        },
        events: {
          create: [
            { status: "NEW", title: "Buyurtma qabul qilindi", note: "Instagram Shop Now" },
            { status: "PICKING", title: "Omborda yig‘ilmoqda", note: "Toshkent markaziy" },
            { status: "PACKED", title: "Qadoqlandi", note: "QR skan" },
            { status: "WITH_COURIER", title: "Kuryerga topshirildi", note: "BTS" },
            { status: "ON_THE_WAY", title: "Yo‘lda", note: "GPS tracking", lat: 41.285, lng: 69.203 },
          ],
        },
      },
    });
  }

  console.log(`Seed OK: ${warehouses.length} ombor (Toshkent + 12 viloyat + Qoraqalpog‘iston)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
