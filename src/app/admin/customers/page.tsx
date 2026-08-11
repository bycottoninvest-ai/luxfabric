import { prisma } from "@/lib/prisma";

export default async function AdminCustomersPage() {
  const customers = await prisma.customer.findMany({
    include: { _count: { select: { orders: true } }, orders: { take: 1, orderBy: { createdAt: "desc" } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6 pb-16">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">Mijozlar</h1>
      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-[0.12em] text-lf-muted">
            <tr>
              <th className="px-4 py-3">Mijoz</th>
              <th className="px-4 py-3">Telefon</th>
              <th className="px-4 py-3">Shahar</th>
              <th className="px-4 py-3">Buyurtmalar</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-t border-white/5">
                <td className="px-4 py-3 font-medium">{c.name || "—"}</td>
                <td className="px-4 py-3 text-lf-muted">{c.phone}</td>
                <td className="px-4 py-3 text-lf-muted">{c.city || "—"}</td>
                <td className="px-4 py-3">{c._count.orders}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
