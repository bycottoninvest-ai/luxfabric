import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE, readSessionToken } from "@/lib/admin-session";
import {
  authorizeOrderAccess,
  cookieNameForOrder,
  normalizeTrackPhone,
  toPublicTrackOrder,
  trackOrderInclude,
  type TrackOrderRow,
} from "@/lib/order-access";
import { normalizeOrderNumber } from "@/lib/order-device-token";
import { checkRateLimit, clientIpFromRequest } from "@/lib/rate-limit";

/**
 * Mijoz uchun — faqat telefon yoki device token bilan.
 * Admin session bo‘lsa to‘liq (legacy) javob.
 */
export async function GET(req: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber: raw } = await params;
  const orderNumber = normalizeOrderNumber(decodeURIComponent(raw));
  const jar = await cookies();
  const admin = await readSessionToken(jar.get(ADMIN_COOKIE)?.value);

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: admin
      ? {
          events: { orderBy: { createdAt: "asc" as const } },
          warehouse: true,
          items: {
            include: { product: { include: { images: true } }, variant: true },
          },
        }
      : trackOrderInclude,
  });
  if (!order) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  if (admin) return NextResponse.json(order);

  const ip = clientIpFromRequest(req);
  const rl = checkRateLimit(`track:get:${ip}`, 30, 15 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Juda ko‘p urinish" }, { status: 429 });
  }

  const url = new URL(req.url);
  const phone = normalizeTrackPhone(url.searchParams.get("phone") || "");
  const deviceToken =
    url.searchParams.get("deviceToken") ||
    jar.get(cookieNameForOrder(orderNumber))?.value ||
    null;

  if (!phone && !deviceToken) {
    return NextResponse.json(
      { error: "Telefon yoki qurilma tokeni kerak", needPhone: true },
      { status: 401 }
    );
  }

  if (!authorizeOrderAccess(order, { phone, deviceToken })) {
    return NextResponse.json({ error: "Telefon yoki buyurtma topilmadi" }, { status: 404 });
  }

  return NextResponse.json({ order: toPublicTrackOrder(order as TrackOrderRow) });
}
