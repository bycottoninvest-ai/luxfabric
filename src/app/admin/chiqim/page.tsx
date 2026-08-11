import { prisma } from "@/lib/prisma";
import { QrScannerPanel } from "@/components/admin/QrScannerPanel";

export default async function AdminChiqimPage() {
  const [warehouses, recent] = await Promise.all([
    prisma.warehouse.findMany({
      where: { isActive: true },
      orderBy: { isCentral: "desc" },
      select: { id: true, name: true, city: true, isCentral: true },
    }),
    prisma.scanEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        variant: { include: { product: true } },
        order: { select: { orderNumber: true, status: true } },
        warehouse: { select: { name: true, city: true } },
      },
    }),
  ]);

  return (
    <div className="text-white">
      <div className="mb-4 hidden lg:block">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">Chiqim</h1>
        <p className="mt-1 text-sm text-white/60">
          Upakovka QR skanerlansa ombor soni avtomatik kamayadi. Kirim alohida sahifada.
        </p>
      </div>
      <QrScannerPanel warehouses={warehouses} initialRecent={recent} mode="OUT" />
    </div>
  );
}
