import { NextResponse } from "next/server";
import { z } from "zod";
import { isSmsConfigured, sendSms, getSmsFrom } from "@/lib/sms";
import { isValidUzPhone, maskUzPhone } from "@/lib/utils";

const schema = z.object({
  phone: z.string().min(9),
});

/** Admin: Eskiz orqali test SMS (kalitlarni UI da ko‘rsatmaydi) */
export async function POST(req: Request) {
  if (!isSmsConfigured()) {
    return NextResponse.json(
      {
        error:
          "SMS sozlanmagan. Vercel env: ESKIZ_EMAIL, ESKIZ_PASSWORD, ESKIZ_FROM — docs/SMS-ULASH.md",
      },
      { status: 400 }
    );
  }

  let phone: string;
  try {
    const body = schema.parse(await req.json());
    phone = maskUzPhone(body.phone);
  } catch {
    return NextResponse.json({ error: "Telefon kerak (+998...)" }, { status: 400 });
  }

  if (!isValidUzPhone(phone)) {
    return NextResponse.json({ error: "Telefon +998XXXXXXXXX formatida bo‘lishi kerak" }, { status: 400 });
  }

  const result = await sendSms({
    to: phone,
    text: `LUXFABRIC.shop: Test SMS. Sender: ${getSmsFrom()}. Agar kelgan bo‘lsa — SMS ulangan.`,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error || result.skipped || "SMS yuborilmadi", result },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, phone, id: result.id, from: getSmsFrom() });
}
