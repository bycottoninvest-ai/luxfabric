import { PrismaClient } from "@prisma/client";
import { UZ_COURIERS } from "../src/lib/couriers";

const prisma = new PrismaClient();

async function main() {
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
      },
    });
  }
  console.log("couriers:", await prisma.courierPartner.count());
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
