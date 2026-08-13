import { NextResponse } from "next/server";
import { getClickConfig, isClickConfigured } from "@/lib/click";
import { getPaymeConfig, isPaymeConfigured } from "@/lib/payme";

/** To‘lov integratsiyasi holati (sirlar yo‘q) */
export async function GET() {
  const click = await getClickConfig();
  const payme = await getPaymeConfig();
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
  });
}
