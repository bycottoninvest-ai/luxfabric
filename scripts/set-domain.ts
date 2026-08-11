import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const updates: Record<string, string> = {
    app_domain: "https://luxfabricshop.uz",
    instagram_username: "luxfabric.shop",
  };
  for (const [key, value] of Object.entries(updates)) {
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
  console.log(
    await prisma.systemSetting.findMany({
      where: { key: { in: Object.keys(updates) } },
    })
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
