import { prisma } from "@/lib/prisma";

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[''`]/g, "")
    .replace(/gʻ|ғ/gi, "g")
    .replace(/oʻ|ў/gi, "o")
    .trim();
}

/** Mijoz shahri / viloyati bo‘yicha eng mos omborni tanlash */
export async function pickWarehouseForCity(
  city: string,
  items: { variantId: string; quantity: number }[]
) {
  const warehouses = await prisma.warehouse.findMany({
    where: { isActive: true },
    include: { stocks: true, region: true },
    orderBy: { isCentral: "desc" },
  });

  const cityN = normalize(city);
  const tokens = cityN.split(/[,\s]+/).filter((t) => t.length > 2);

  const scored = warehouses
    .map((wh) => {
      const hay = normalize(`${wh.city} ${wh.region?.nameUz || ""} ${wh.region?.name || ""} ${wh.region?.code || ""}`);
      let score = 0;
      if (hay.includes(cityN) || cityN.includes(normalize(wh.city))) score += 100;
      for (const t of tokens) {
        if (hay.includes(t)) score += 25;
      }
      if (wh.isCentral) score += 10;
      const ok = items.every((item) => {
        const stock = wh.stocks.find((s) => s.variantId === item.variantId);
        return (stock?.quantity || 0) >= item.quantity;
      });
      if (!ok) score -= 1000;
      return { wh, score, ok };
    })
    .filter((x) => x.ok)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.wh || null;
}
