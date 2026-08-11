import { prisma } from "@/lib/prisma";
import { CouriersPanel } from "@/components/admin/CouriersPanel";

export default async function AdminLogisticsPage() {
  const [couriers, readyOrders, warehouses] = await Promise.all([
    prisma.courierPartner.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { assignedOrders: true } } },
    }),
    prisma.order.findMany({
      where: { status: { in: ["PACKED", "PICKING", "NEW"] } },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        warehouse: true,
        items: { include: { product: true, variant: true } },
      },
    }),
    prisma.warehouse.findMany({
      where: { isActive: true },
      orderBy: { isCentral: "desc" },
      include: { region: true },
    }),
  ]);

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">
          Logistika / Dostavka
        </h1>
        <p className="mt-1 text-sm text-lf-muted">
          BTS, Fargo, UzPost, Yandex va boshqalar — ombordan kuryerga topshirish
        </p>
      </div>

      <CouriersPanel
        couriers={couriers.map((c) => ({
          id: c.id,
          code: c.code,
          nameUz: c.nameUz,
          name: c.name,
          phone: c.phone,
          website: c.website,
          isActive: c.isActive,
          supportsCod: c.supportsCod,
          notes: c.notes,
          ordersCount: c._count.assignedOrders,
        }))}
        orders={readyOrders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          city: o.city,
          address: o.address,
          customerName: o.customerName,
          customerPhone: o.customerPhone,
          warehouseName: o.warehouse?.name || "—",
          warehouseAddress: o.warehouse?.address || "",
          itemsLabel: o.items
            .map((i) => `${i.product.name} ${i.variant.size}/${i.variant.color}×${i.quantity}`)
            .join(", "),
        }))}
        warehouses={warehouses.map((w) => ({
          id: w.id,
          name: w.name,
          city: w.city,
          address: w.address,
          phone: w.phone,
          region: w.region?.nameUz || "",
        }))}
      />
    </div>
  );
}
