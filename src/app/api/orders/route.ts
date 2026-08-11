import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber, formatSom, isValidUzPhone, maskUzPhone } from "@/lib/utils";
import { pickWarehouseForCity } from "@/lib/warehouse";
import { notifyOrderCreated, notifyDirector } from "@/lib/notify";

const schema = z.object({
  name: z.string().min(2),
  phone: z
    .string()
    .transform((v) => maskUzPhone(v))
    .refine((v) => isValidUzPhone(v), "Telefon +998XXXXXXXXX formatida bo‘lishi kerak (12 raqam)"),
  city: z.string().min(2),
  address: z.string().min(3),
  paymentMethod: z.enum(["CLICK", "PAYME", "CARD", "COD"]),
  source: z.enum(["STORE", "INSTAGRAM", "TELEGRAM", "ADMIN"]).optional(),
  deliveryType: z.enum(["SHOP_DELIVERY", "COURIER_CHOICE", "PICKUP"]).default("SHOP_DELIVERY"),
  preferredCourierId: z.string().optional().nullable(),
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
  pickupName?: string | null
) {
  if (type === "PICKUP") return pickupName ? `O‘zi olib ketish: ${pickupName}` : "O‘zi olib ketish";
  if (type === "COURIER_CHOICE") return courierName ? `Kuryer: ${courierName}` : "Tanlangan kuryer";
  return "Do‘kon yetkazib beradi (avtomatik)";
}

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());

    if (body.deliveryType === "COURIER_CHOICE" && !body.preferredCourierId) {
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

    let preferredCourier = null as { id: string; nameUz: string; name: string } | null;
    if (body.preferredCourierId) {
      preferredCourier = await prisma.courierPartner.findFirst({
        where: { id: body.preferredCourierId, isActive: true },
        select: { id: true, nameUz: true, name: true },
      });
      if (!preferredCourier) {
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
    const paymentStatus = body.paymentMethod === "COD" ? "PENDING" : "PAID";
    const source = body.source || "STORE";
    const label = deliveryLabel(
      body.deliveryType,
      preferredCourier?.nameUz || preferredCourier?.name,
      warehouse.name
    );

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

      return tx.order.create({
        data: {
          orderNumber,
          status: "NEW",
          paymentMethod: body.paymentMethod,
          paymentStatus,
          subtotal,
          deliveryFee,
          total,
          customerName: body.name,
          customerPhone: body.phone,
          city: body.city,
          address: body.address,
          source,
          deliveryType: body.deliveryType,
          notifyChannel: body.notifyChannel,
          telegramUsername: body.telegramUsername || null,
          preferredCourierId: preferredCourier?.id || null,
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
          events: {
            create: [
              {
                status: "NEW",
                title: "Buyurtma qabul qilindi",
                note: `${source} · ${warehouse!.name} · ${label} · ${body.paymentMethod} · Stock QR skanda yečiladi`,
              },
            ],
          },
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

    return NextResponse.json({
      orderNumber: order.orderNumber,
      id: order.id,
      warehouse: warehouse.name,
      deliveryType: body.deliveryType,
      deliveryLabel: label,
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
