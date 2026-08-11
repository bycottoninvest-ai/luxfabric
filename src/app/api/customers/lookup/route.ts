import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidUzPhone, maskUzPhone } from "@/lib/utils";

/** Telefon bo‘yicha mijoz profilini qaytarish (checkout autofill) */
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("phone") || "";
  const phone = maskUzPhone(raw);

  if (!isValidUzPhone(phone)) {
    return NextResponse.json({ error: "Telefon noto‘g‘ri" }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({
    where: { phone },
    select: {
      name: true,
      phone: true,
      city: true,
      address: true,
      orders: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          customerName: true,
          city: true,
          address: true,
          deliveryType: true,
          notifyChannel: true,
          telegramUsername: true,
          preferredCourierId: true,
        },
      },
    },
  });

  if (!customer) {
    return NextResponse.json({ found: false, phone });
  }

  const last = customer.orders[0];

  return NextResponse.json({
    found: true,
    phone: customer.phone,
    name: customer.name || last?.customerName || "",
    city: customer.city || last?.city || "",
    address: customer.address || last?.address || "",
    deliveryType: last?.deliveryType || null,
    notifyChannel: last?.notifyChannel || null,
    telegramUsername: last?.telegramUsername || null,
    preferredCourierId: last?.preferredCourierId || null,
  });
}
