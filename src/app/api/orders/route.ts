import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber, formatSom, isValidUzPhone, maskUzPhone } from "@/lib/utils";
import { pickWarehouseForCity } from "@/lib/warehouse";
import { notifyOrderCreated, notifyDirector } from "@/lib/notify";
import { buildClickPayUrlForOrder } from "@/lib/click";
import {
  formatBranchLabel,
  getUzCourierByCode,
  getUzCourierById,
  UZ_COURIERS,
} from "@/lib/uz-couriers";
import { computeDeliveryPromise } from "@/lib/delivery-promise";
import { defaultHandoffForRegion, shopDefaultCourierCode } from "@/lib/carrier-matrix";
import { matchUzFromGeoText } from "@/lib/uzbekistan-regions";

const schema = z.object({
  name: z.string().min(2),
  phone: z
    .string()
    .transform((v) => maskUzPhone(v))
    .refine((v) => isValidUzPhone(v), "Telefon +998XXXXXXXXX formatida bo‘lishi kerak (12 raqam)"),
  city: z.string().min(2),
  address: z.string().min(3),
  regionCode: z.string().optional().nullable(),
  paymentMethod: z.enum(["CLICK", "PAYME", "CARD", "COD"]),
  source: z.enum(["STORE", "INSTAGRAM", "TELEGRAM", "ADMIN"]).optional(),
  deliveryType: z.enum(["SHOP_DELIVERY", "COURIER_CHOICE", "PICKUP"]).default("SHOP_DELIVERY"),
  /** HOME | PVZ | WAREHOUSE */
  handoffMode: z.enum(["HOME", "PVZ", "WAREHOUSE"]).optional().nullable(),
  preferredCourierId: z.string().optional().nullable(),
  /** Katalog id yoki code: bts / BTS */
  courierCompanyId: z.string().optional().nullable(),
  courierBranchId: z.string().optional().nullable(),
  courierBranchLabel: z.string().optional().nullable(),
  pickupWarehouseId: z.string().optional().nullable(),
  notifyChannel: z.enum(["SMS", "TELEGRAM", "BOTH", "NONE"]).default("SMS"),
  telegramUsername: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        variantId: z.string(),
        quantity: z.number().int().positive(),
        price: z.number().int().positive(),
      })
    )
    .min(1),
});

function deliveryLabel(
  type: string,
  courierName?: string | null,
  pickupName?: string | null,
  branchLabel?: string | null
) {
  if (type === "PICKUP") return pickupName ? `O‘zi olib ketish: ${pickupName}` : "O‘zi olib ketish";
  if (type === "COURIER_CHOICE") {
    const base = courierName ? `Kuryer: ${courierName}` : "Tanlangan kuryer";
    return branchLabel ? `${base} · ${branchLabel}` : base;
  }
  return "Do‘kon yetkazib beradi (avtomatik)";
}

async function ensureCourierPartner(code: string) {
  const catalog = UZ_COURIERS.find((c) => c.code === code);
  if (!catalog) return null;
  return prisma.courierPartner.upsert({
    where: { code: catalog.code },
    update: {
      name: catalog.name,
      nameUz: catalog.nameUz,
      phone: catalog.phone,
      website: catalog.website,
      notes: catalog.notes,
      sortOrder: catalog.sortOrder,
      isActive: true,
    },
    create: {
      code: catalog.code,
      name: catalog.name,
      nameUz: catalog.nameUz,
      phone: catalog.phone,
      website: catalog.website,
      apiBaseUrl: catalog.apiBaseUrl,
      supportsCod: catalog.supportsCod,
      notes: catalog.notes,
      sortOrder: catalog.sortOrder,
      isActive: true,
    },
    select: { id: true, code: true, nameUz: true, name: true },
  });
}

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());

    const companyKey = (body.courierCompanyId || "").trim();
    if (body.deliveryType === "COURIER_CHOICE" && !companyKey && !body.preferredCourierId) {
      return NextResponse.json(
        { error: "Kuryerni tanlang yoki «do‘kon o‘zi yuboradi»ni belgilang" },
        { status: 400 }
      );
    }

    const deliveryFee = body.deliveryType === "PICKUP" ? 0 : 15000;
    const subtotal = body.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const total = subtotal + deliveryFee;

    let warehouse =
      body.deliveryType === "PICKUP" && body.pickupWarehouseId
        ? await prisma.warehouse.findFirst({
            where: { id: body.pickupWarehouseId, isActive: true },
          })
        : null;

    if (!warehouse) {
      warehouse = await pickWarehouseForCity(
        body.city,
        body.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity }))
      );
    }

    if (!warehouse) {
      return NextResponse.json({ error: "Tanlangan variantlar omborda yetarli emas" }, { status: 400 });
    }

    let preferredCourier = null as {
      id: string;
      code: string;
      nameUz: string;
      name: string;
    } | null;
    let courierCompanyId: string | null = null;
    let courierBranchId: string | null = null;
    let courierBranchLabel: string | null = null;

    if (body.deliveryType === "COURIER_CHOICE") {
      const catalog =
        getUzCourierById(companyKey) ||
        getUzCourierByCode(companyKey) ||
        (body.preferredCourierId
          ? getUzCourierByCode(body.preferredCourierId) || getUzCourierById(body.preferredCourierId)
          : undefined);

      if (catalog) {
        preferredCourier = await ensureCourierPartner(catalog.code);
        courierCompanyId = catalog.id;
        if (body.courierBranchId) {
          const branch = catalog.branches.find((b) => b.id === body.courierBranchId);
          if (branch) {
            courierBranchId = branch.id;
            courierBranchLabel = body.courierBranchLabel?.trim() || formatBranchLabel(branch);
          }
        } else if (body.courierBranchLabel?.trim()) {
          courierBranchLabel = body.courierBranchLabel.trim();
        }
      } else if (body.preferredCourierId) {
        const row = await prisma.courierPartner.findFirst({
          where: { id: body.preferredCourierId, isActive: true },
          select: { id: true, code: true, nameUz: true, name: true },
        });
        if (!row) {
          return NextResponse.json({ error: "Kuryer topilmadi" }, { status: 400 });
        }
        preferredCourier = row;
        courierCompanyId = row.code.toLowerCase();
      } else {
        return NextResponse.json({ error: "Kuryer topilmadi" }, { status: 400 });
      }
    }

    const customer = await prisma.customer.upsert({
      where: { phone: body.phone },
      update: { name: body.name, city: body.city, address: body.address },
      create: {
        phone: body.phone,
        name: body.name,
        city: body.city,
        address: body.address,
      },
    });

    const orderNumber = generateOrderNumber();
    // Click/Payme: PAID faqat webhook (Click) yoki keyingi integratsiyada; COD — yetkazishgacha
    const paymentStatus =
      body.paymentMethod === "COD" ||
      body.paymentMethod === "CLICK" ||
      body.paymentMethod === "PAYME"
        ? "PENDING"
        : "PAID";
    const initialStatus = paymentStatus === "PAID" ? "PAID" : "NEW";
    const source = body.source || "STORE";
    const label = deliveryLabel(
      body.deliveryType,
      preferredCourier?.nameUz || preferredCourier?.name,
      warehouse.name,
      courierBranchLabel
    );

    const regionCode =
      (body.regionCode || "").trim().toUpperCase() ||
      matchUzFromGeoText(body.city)?.regionCode ||
      "TAS";

    const courierKeyForPromise =
      preferredCourier?.code ||
      (body.deliveryType === "SHOP_DELIVERY" ? shopDefaultCourierCode(regionCode) : null);

    let handoffMode =
      body.handoffMode ||
      (body.deliveryType === "PICKUP"
        ? "WAREHOUSE"
        : defaultHandoffForRegion(regionCode, courierCompanyId || preferredCourier?.code));

    if (body.deliveryType === "PICKUP") handoffMode = "WAREHOUSE";
    // Punktsiz uyga — branch bo‘lmasa HOME
    if (
      body.deliveryType === "COURIER_CHOICE" &&
      handoffMode === "PVZ" &&
      !courierBranchId &&
      (preferredCourier?.code || "").toUpperCase() === "YANDEX"
    ) {
      handoffMode = "HOME";
    }

    const promise = computeDeliveryPromise({
      regionCode,
      deliveryType: body.deliveryType,
      courierKey: courierKeyForPromise,
      handoffMode,
    });

    const order = await prisma.$transaction(async (tx) => {
      // Stock faqat tekshiriladi — haqiqiy yechish QR skanerda (omborda)
      for (const item of body.items) {
        const stock = await tx.warehouseStock.findUnique({
          where: {
            warehouseId_variantId: { warehouseId: warehouse!.id, variantId: item.variantId },
          },
        });
        if (!stock || stock.quantity < item.quantity) {
          throw new Error("Stock yetarli emas");
        }
      }

      const events =
        initialStatus === "PAID"
          ? [
              {
                status: "NEW",
                title: "Buyurtma qabul qilindi",
                note: `${source} · ${warehouse!.name} · ${label} · ${body.paymentMethod}`,
              },
              {
                status: "PAID",
                title: "To‘lov tasdiqlandi",
                note: `${body.paymentMethod} · va’da: ${promise.label}`,
              },
            ]
          : [
              {
                status: "NEW",
                title: "Buyurtma qabul qilindi",
                note: `${source} · ${warehouse!.name} · ${label} · ${body.paymentMethod} · ${promise.label} · Stock QR skanda yečiladi`,
              },
            ];

      return tx.order.create({
        data: {
          orderNumber,
          status: initialStatus,
          paymentMethod: body.paymentMethod,
          paymentStatus,
          subtotal,
          deliveryFee,
          total,
          customerName: body.name,
          customerPhone: body.phone,
          city: body.city,
          address: body.address,
          regionCode,
          handoffMode,
          promisedBy: promise.promisedBy,
          shipBy: promise.shipBy,
          promiseLabel: promise.label,
          source,
          deliveryType: body.deliveryType,
          notifyChannel: body.notifyChannel,
          telegramUsername: body.telegramUsername || null,
          preferredCourierId: preferredCourier?.id || null,
          courierCompanyId,
          courierBranchId,
          courierBranchLabel,
          courierCode: preferredCourier?.code || null,
          courierLabel: label,
          customerId: customer.id,
          warehouseId: warehouse!.id,
          stockDeducted: false,
          items: {
            create: body.items.map((i) => ({
              productId: i.productId,
              variantId: i.variantId,
              quantity: i.quantity,
              price: i.price,
              pickedQty: 0,
            })),
          },
          events: { create: events },
        },
      });
    });

    const notify = await notifyOrderCreated({
      phone: body.phone,
      telegramUsername: body.telegramUsername,
      channel: body.notifyChannel,
      orderNumber: order.orderNumber,
      totalLabel: formatSom(total),
      deliveryLabel: label,
    });

    // Har bir zakaz — direktorga majburiy xabar
    let director: unknown = null;
    try {
      director = await notifyDirector({ orderId: order.id, event: "NEW" });
    } catch (e) {
      console.error("[DIRECTOR-TG] xato", e);
      director = { error: e instanceof Error ? e.message : "fail" };
    }

    let paymentUrl: string | null = null;
    if (body.paymentMethod === "CLICK") {
      try {
        paymentUrl = await buildClickPayUrlForOrder(order.orderNumber, total);
      } catch (e) {
        console.error("[CLICK] pay url", e);
      }
    }

    return NextResponse.json({
      orderNumber: order.orderNumber,
      id: order.id,
      warehouse: warehouse.name,
      deliveryType: body.deliveryType,
      deliveryLabel: label,
      promisedBy: order.promisedBy,
      promiseLabel: order.promiseLabel,
      paymentStatus: order.paymentStatus,
      paymentUrl,
      notify,
      director,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server xatosi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      warehouse: { include: { region: true } },
      preferredCourier: true,
      courier: true,
      items: { include: { product: true, variant: true } },
    },
  });
  return NextResponse.json(orders);
}
