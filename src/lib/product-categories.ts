/** LUXFABRIC tekstil / apparel kategoriyalari — forma + API umumiy manba. */

export type ProductCategory = {
  slug: string;
  name: string;
};

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  { slug: "futbolkalar", name: "Futbolkalar" },
  { slug: "polo", name: "Polo" },
  { slug: "hoodie", name: "Hoodie" },
  { slug: "svitshot", name: "Svitshot" },
  { slug: "sviter", name: "Sviter" },
  { slug: "kardigan", name: "Kardigan" },
  { slug: "kofta", name: "Ko‘fta" },
  { slug: "top", name: "Top" },
  { slug: "tunika", name: "Tunika" },
  { slug: "bluzka", name: "Bluzka" },
  { slug: "koylak", name: "Ko‘ylak" },
  { slug: "platye", name: "Platye" },
  { slug: "yubka", name: "Yubka" },
  { slug: "kombinezon", name: "Kombinezon" },
  { slug: "shortlar", name: "Shortlar" },
  { slug: "shim", name: "Shim" },
  { slug: "jinsi", name: "Jinsi" },
  { slug: "leggins", name: "Leggins" },
  { slug: "sport-shim", name: "Sport shim" },
  { slug: "kostyum", name: "Kostyum" },
  { slug: "sport-kostyum", name: "Sport kostyum" },
  { slug: "blazer", name: "Blazer" },
  { slug: "pidjak", name: "Pidjak" },
  { slug: "jilet", name: "Jilet" },
  { slug: "kurtka", name: "Kurtka" },
  { slug: "palto", name: "Palto" },
  { slug: "plash", name: "Plash" },
  { slug: "sport", name: "Sport kiyim" },
  { slug: "trening", name: "Trening" },
  { slug: "ichki-kiyim", name: "Ichki kiyim" },
  { slug: "pijama", name: "Pijama" },
  { slug: "xalat", name: "Xalat" },
  { slug: "paypoq", name: "Paypoq" },
  { slug: "kolgotki", name: "Kolgotki" },
  { slug: "poyabzal", name: "Poyabzal" },
  { slug: "krossovka", name: "Krossovka" },
  { slug: "sumka", name: "Sumka" },
  { slug: "ryukzak", name: "Ryukzak" },
  { slug: "shlyapa", name: "Shlyapa" },
  { slug: "kepka", name: "Kepka" },
  { slug: "sharf", name: "Sharf" },
  { slug: "romol", name: "Ro‘mol" },
  { slug: "hijob", name: "Hijob" },
  { slug: "belbog", name: "Belbog‘" },
  { slug: "qolqop", name: "Qo‘lqop" },
  { slug: "aksessuar", name: "Aksessuar" },
  { slug: "boshqa", name: "Boshqa" },
];

export const PRODUCT_CATEGORY_SLUGS = PRODUCT_CATEGORIES.map((c) => c.slug);

const bySlug = new Map(PRODUCT_CATEGORIES.map((c) => [c.slug, c]));

export function isProductCategorySlug(slug: string): boolean {
  return bySlug.has(slug);
}

export function categoryNameForSlug(slug: string): string {
  return bySlug.get(slug)?.name || slug;
}

export function findCategoryBySlug(slug: string): ProductCategory | undefined {
  return bySlug.get(slug);
}
