import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  authorizeOrderAccess,
  cookieNameForOrder,
  normalizeTrackPhone,
  toPublicTrackOrder,
  trackOrderInclude,
  type TrackOrderRow,
} from "@/lib/order-access";
import {
  generateDeviceOrderToken,
  hashDeviceOrderToken,
  isLikelyOrderNumber,
  normalizeOrderNumber,
  verifyDeviceOrderToken,
} from "@/lib/order-device-token";
import { checkRateLimit, clientIpFromRequest } from "@/lib/rate-limit";

const bodySchema = z.object({
  phone: z.string().optional().nullable(),
  orderNumber: z.string().optional().nullable(),
  deviceToken: z.string().optional().nullable(),
  /** Shu qurilmadagi tokenlar — «mening buyurtmalarim» */
  deviceTokens: z
    .array(
      z.object({
        orderNumber: z.string().min(3),
        token: z.string().min(16),
      })
    )
    .max(40)
    .optional()
    .nullable(),
});

const DENY = "Telefon yoki buyurtma topilmadi";

export async function POST(req: Request) {
  const ip = clientIpFromRequest(req);
  const rl = checkRateLimit(`track:${ip}`, 20, 15 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Juda ko‘p urinish. Birozdan keyin qayta urinib ko‘ring." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Noto‘g‘ri so‘rov" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Noto‘g‘ri ma’lumot" }, { status: 400 });
  }

  const phone = parsed.data.phone ? normalizeTrackPhone(parsed.data.phone) : null;
  const orderNumber = parsed.data.orderNumber
    ? normalizeOrderNumber(parsed.data.orderNumber)
    : "";
  const deviceToken = parsed.data.deviceToken?.trim() || null;
  const pairs = (parsed.data.deviceTokens || [])
    .map((p) => ({
      orderNumber: normalizeOrderNumber(p.orderNumber),
      token: p.token.trim(),
    }))
    .filter((p) => p.orderNumber && p.token);

  // Phone+order brute-force: qattiqroq limit
  if (phone && orderNumber) {
    const rl2 = checkRateLimit(`track:po:${ip}:${phone}`, 8, 15 * 60 * 1000);
    if (!rl2.ok) {
      return NextResponse.json(
        { error: "Juda ko‘p urinish. Birozdan keyin qayta urinib ko‘ring." },
        { status: 429, headers: { "Retry-After": String(rl2.retryAfterSec) } }
      );
    }
  }

  // 1) Bitta buyurtma: telefon + LF (yoki device token)
  if (orderNumber) {
    if (!isLikelyOrderNumber(orderNumber)) {
      return NextResponse.json({ error: DENY }, { status: 404 });
    }
    if (!phone && !deviceToken) {
      return NextResponse.json(
        { error: "Telefon yoki qurilma tokeni kerak", needPhone: true },
        { status: 401 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: trackOrderInclude,
    });
    if (!order) {
      return NextResponse.json({ error: DENY }, { status: 404 });
    }

    const ok = authorizeOrderAccess(order, { phone, deviceToken });
    if (!ok) {
      return NextResponse.json({ error: DENY }, { status: 404 });
    }

    // Telefon bilan ochganda shu qurilmaga yangi device token beriladi
    let issuedToken: string | null = null;
    if (phone && !deviceToken) {
      issuedToken = generateDeviceOrderToken();
      await prisma.order.update({
        where: { id: order.id },
        data: { deviceTokenHash: hashDeviceOrderToken(issuedToken) },
      });
    }

    const res = NextResponse.json({
      order: toPublicTrackOrder(order as TrackOrderRow),
      deviceOrderToken: issuedToken,
    });
    if (issuedToken) {
      res.cookies.set(cookieNameForOrder(order.orderNumber), issuedToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 90 * 24 * 60 * 60,
      });
    }
    return res;
  }

  // 2) Qurilma tokenlari bo‘yicha ro‘yxat
  if (pairs.length > 0) {
    const numbers = [...new Set(pairs.map((p) => p.orderNumber))];
    const orders = await prisma.order.findMany({
      where: { orderNumber: { in: numbers } },
      include: trackOrderInclude,
      orderBy: { createdAt: "desc" },
      take: 40,
    });
    const byNo = new Map(orders.map((o) => [o.orderNumber, o]));
    const allowed: TrackOrderRow[] = [];
    for (const p of pairs) {
      const o = byNo.get(p.orderNumber);
      if (!o) continue;
      if (verifyPair(o, p.token)) allowed.push(o as TrackOrderRow);
    }
    // Dedup
    const seen = new Set<string>();
    const unique = allowed.filter((o) => {
      if (seen.has(o.id)) return false;
      seen.add(o.id);
      return true;
    });
    return NextResponse.json({
      orders: unique.map((o) => toPublicTrackOrder(o)),
    });
  }

  // 3) Faqat telefon — ro‘yxat berilmaydi (OTP yo‘q; guessing oldini olish)
  if (phone) {
    return NextResponse.json(
      {
        error:
          "Boshqa qurilmada buyurtma raqamini (LF-…) ham kiriting. Shu telefonda buyurtma bergan bo‘lsangiz — avtomatik ko‘rinadi.",
        needOrderNumber: true,
      },
      { status: 401 }
    );
  }

  return NextResponse.json(
    { error: "Telefon + buyurtma raqami yoki qurilma tokeni kerak", needPhone: true },
    { status: 401 }
  );
}

function verifyPair(
  order: { deviceTokenHash: string | null },
  token: string
): boolean {
  return verifyDeviceOrderToken(token, order.deviceTokenHash);
}
