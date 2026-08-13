import { cookies } from "next/headers";
import { StoreShell } from "@/components/StoreShell";
import { TrackOrderGate } from "@/components/TrackOrderGate";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE, readSessionToken } from "@/lib/admin-session";
import {
  toPublicTrackOrder,
  trackOrderInclude,
  type TrackOrderRow,
} from "@/lib/order-access";
import { normalizeOrderNumber } from "@/lib/order-device-token";

export const dynamic = "force-dynamic";

export default async function TrackPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber: raw } = await params;
  const orderNumber = normalizeOrderNumber(decodeURIComponent(raw));

  const jar = await cookies();
  const admin = await readSessionToken(jar.get(ADMIN_COOKIE)?.value);

  let initialOrder = null;
  if (admin && orderNumber) {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: trackOrderInclude,
    });
    if (order) {
      initialOrder = toPublicTrackOrder(order as TrackOrderRow);
    }
  }

  return (
    <StoreShell>
      <TrackOrderGate orderNumber={orderNumber || raw} initialOrder={initialOrder} />
    </StoreShell>
  );
}
