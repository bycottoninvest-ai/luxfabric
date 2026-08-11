import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const defaults: Record<string, string> = {
    instagram_dm_welcome:
      "Assalomu alaykum! LUXFABRIC AI yordamchi. Narx, o‘lcham yoki yetkazib berish haqida so‘rang",
    instagram_auto_reply_price:
      "Nice Print Futbolka — 129 000 so‘m. Shop Now: /product/nice-print-futbolka?from=instagram",
    instagram_auto_reply_size: "Hozir omborda: S / M / L / XL / XXL. Qaysi o‘lcham kerak?",
    instagram_auto_reply_delivery:
      "Butun O‘zbekiston bo‘ylab 1–2 kun. Eng yaqin ombordan jo‘natamiz.",
    instagram_auto_reply_default:
      "Salom! Narx, o‘lcham, yetkazib berish yoki buyurtma havolasini so‘rashingiz mumkin.",
  };
  for (const [key, value] of Object.entries(defaults)) {
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
  console.log("instagram dm settings ok");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
