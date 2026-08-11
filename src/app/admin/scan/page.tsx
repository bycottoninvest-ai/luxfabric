import { prisma } from "@/lib/prisma";
import { QrScannerPanel } from "@/components/admin/QrScannerPanel";

/** Buyurtma yig‘ish — alohida oyna (Kirim/Chiqim emas) */
export default async function AdminScanPage() {
  const [warehouses, recent, openOrders] = await Promise.all([
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
    prisma.order.findMany({
      where: { status: { in: ["NEW", "PICKING", "PACKED"] } },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        customerPhone: true,
        city: true,
        address: true,
        status: true,
        warehouseId: true,
        warehouse: { select: { name: true, city: true } },
      },
    }),
  ]);

  return (
    <div className="text-white">
      <div className="mb-4 hidden lg:block">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">Buyurtma yig‘ish</h1>
        <p className="mt-1 text-sm text-white/60">
          Buyurtmani tanlang yoki LF skanerlang → manzil/ombor → mahsulot QR.
        </p>
      </div>
      <QrScannerPanel
        warehouses={warehouses}
        initialRecent={recent}
        openOrders={openOrders}
        mode="ORDER"
      />
    </div>
  );
}
