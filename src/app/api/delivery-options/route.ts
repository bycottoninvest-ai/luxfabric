import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Checkout uchun faol kuryerlar */
export async function GET() {
  const couriers = await prisma.courierPartner.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      code: true,
      nameUz: true,
      name: true,
      supportsCod: true,
      notes: true,
    },
  });

  const pickups = await prisma.warehouse.findMany({
    where: { isActive: true },
    orderBy: { isCentral: "desc" },
    select: {
      id: true,
      name: true,
      city: true,
      address: true,
      phone: true,
      region: { select: { nameUz: true } },
    },
  });

  return NextResponse.json({ couriers, pickups });
}
