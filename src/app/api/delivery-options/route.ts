import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UZ_COURIER_COMPANIES } from "@/lib/uz-couriers";

/** Checkout uchun kuryer katalogi + ombor pickup */
export async function GET() {
  const dbCouriers = await prisma.courierPartner.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      code: true,
      nameUz: true,
      name: true,
      supportsCod: true,
      notes: true,
      phone: true,
      website: true,
    },
  });

  const byCode = new Map(dbCouriers.map((c) => [c.code, c]));

  const couriers = UZ_COURIER_COMPANIES.map((c) => {
    const row = byCode.get(c.code);
    return {
      id: row?.id || c.id,
      code: c.code,
      companyId: c.id,
      nameUz: c.name,
      name: c.name,
      shortDesc: c.shortDesc,
      website: c.website,
      phone: c.phone,
      coverage: c.coverage,
      pickupNote: c.pickupNote,
      supportsCod: c.supportsCod,
      notes: c.notes || c.shortDesc,
      branches: c.branches,
    };
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
      region: { select: { nameUz: true, code: true } },
    },
  });

  return NextResponse.json({ couriers, pickups });
}
