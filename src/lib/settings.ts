import { prisma } from "@/lib/prisma";

export async function getSetting(key: string, fallback = "") {
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  return row?.value ?? fallback;
}

export async function getSettings(keys: string[]) {
  const rows = await prisma.systemSetting.findMany({ where: { key: { in: keys } } });
  const map: Record<string, string> = {};
  for (const k of keys) map[k] = "";
  for (const r of rows) map[r.key] = r.value;
  return map;
}

export async function setSettings(data: Record<string, string>) {
  for (const [key, value] of Object.entries(data)) {
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
}

export async function getAppUrl() {
  if (process.env.NODE_ENV === "development") {
    return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  }
  const domain = await getSetting("app_domain", process.env.NEXT_PUBLIC_PROD_DOMAIN || "https://luxfabricshop.uz");
  return domain.replace(/\/$/, "");
}

