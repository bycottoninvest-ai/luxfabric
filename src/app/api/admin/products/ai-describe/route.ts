import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { ADMIN_COOKIE, readSessionToken } from "@/lib/admin-session";
import { describeProductFromImage } from "@/lib/product-ai-describe";
import { PRODUCT_CATEGORY_SLUGS } from "@/lib/product-categories";

async function requireAdmin() {
  const jar = await cookies();
  return readSessionToken(jar.get(ADMIN_COOKIE)?.value);
}

const schema = z.object({
  imageUrl: z.string().min(1),
  imageBase64: z.string().optional().nullable(),
  gender: z.enum(["WOMEN", "MEN", "KIDS"]).optional(),
  nameHint: z.string().max(120).optional().nullable(),
});

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const configured = Boolean(process.env.OPENAI_API_KEY?.trim());
  return NextResponse.json({
    ok: true,
    configured,
    model: configured ? process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini" : null,
    categories: PRODUCT_CATEGORY_SLUGS.length,
  });
}

/** Rasmdan kategoriya + tavsif/material/parvarish (OPENAI_API_KEY yoki shablon). */
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = schema.parse(await req.json());
    const result = await describeProductFromImage({
      imageUrl: body.imageUrl,
      imageBase64: body.imageBase64,
      gender: body.gender,
      nameHint: body.nameHint || undefined,
    });

    return NextResponse.json({
      ok: true,
      ...result,
      hint:
        result.source === "openai"
          ? undefined
          : result.source === "template-fallback"
            ? "ChatGPT javob bermadi — shablon ishlatildi"
            : ".env / Vercel ga OPENAI_API_KEY qo‘ying — rasmdan to‘liq AI ishlaydi",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI xatosi" },
      { status: 400 }
    );
  }
}
