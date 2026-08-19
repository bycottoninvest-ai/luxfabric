import { NextResponse } from "next/server";
import { getClickConfig, isClickConfigured } from "@/lib/click";
import { getPaymeConfig, isPaymeConfigured } from "@/lib/payme";
import { getPaynetConfig, isPaynetConfigured } from "@/lib/paynet";

/** To‘lov integratsiyasi holati (sirlar yo‘q) */
export async function GET() {
  const click = await getClickConfig();
  const payme = await getPaymeConfig();
  const paynet = await getPaynetConfig();
  return NextResponse.json({
    ok: true,
    click: {
      configured: isClickConfigured(click),
      hasMerchantId: Boolean(click.merchantId),
      hasServiceId: Boolean(click.serviceId),
      hasSecret: Boolean(click.secretKey),
      prepareUrl: "https://www.luxfabricshop.uz/api/click/prepare",
      completeUrl: "https://www.luxfabricshop.uz/api/click/complete",
    },
    payme: {
      configured: isPaymeConfigured(payme),
      hasMerchantId: Boolean(payme.merchantId),
      hasKey: Boolean(payme.key),
      merchantApiUrl: "https://www.luxfabricshop.uz/api/payme",
    },
    paynet: {
      configured: isPaynetConfigured(paynet),
      hasUsername: Boolean(paynet.username),
      hasPassword: Boolean(paynet.password),
      hasServiceId: Boolean(paynet.serviceId),
      hasMerchantId: Boolean(paynet.merchantId),
      merchantApiUrl: "https://www.luxfabricshop.uz/api/paynet",
      fieldName: "order_id",
    },
  });
}
