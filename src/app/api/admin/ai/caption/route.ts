import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { formatSom } from "@/lib/utils";
import { buildIgTemplateCaption, productBuyUrl } from "@/lib/ig-caption";
import { getSetting } from "@/lib/settings";

const schema = z.object({
  productId: z.string().min(1),
});

function openaiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function openaiModel() {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

/** Kalit bor-yo‘qligini ko‘rsatadi — kalitning o‘zini hech qachon qaytarmaydi. */
export async function GET() {
  const configured = openaiConfigured();
  return NextResponse.json({
    ok: true,
    configured,
    model: configured ? openaiModel() : null,
  });
}

/** Mahsulotga qarab Reel sarlavha + caption. OPENAI_API_KEY bo‘lsa ChatGPT, aks holda smart shablon. */
export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const product = await prisma.product.findUnique({
      where: { id: body.productId },
      include: {
        category: { select: { name: true } },
        variants: { select: { color: true, size: true }, take: 40 },
      },
    });
    if (!product) {
      return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 });
    }

    const colors = [...new Set(product.variants.map((v) => v.color))].slice(0, 6);
    const sizes = [...new Set(product.variants.map((v) => v.size))].slice(0, 8);
    const price = formatSom(product.price);
    const configured = openaiConfigured();
    const model = openaiModel();

    const tracks = await prisma.instagramMusic.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      select: { id: true, title: true, artist: true },
    });
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim();
    const productKey = normalize(product.name);
    const words = productKey.split(/\s+/).filter((w) => w.length >= 3);
    const suggestedMusicId =
      tracks.find((t) => {
        const title = normalize(t.title);
        const artist = normalize(t.artist);
        if (productKey && (title.includes(productKey) || productKey.includes(title))) return true;
        return words.some((w) => title.includes(w) || artist.includes(w));
      })?.id ||
      tracks[0]?.id ||
      null;

    const openaiKey = process.env.OPENAI_API_KEY?.trim();
    if (openaiKey) {
      try {
        const prompt = `Sen luxfabric brendi uchun Instagram Reel matn yozasan. O‘zbek tilida, qisqa, sotuvga yo‘naltirilgan.
Mahsulot: ${product.name}
Kategoriya: ${product.category?.name || "tekstil"}
Narx: ${price}
Mato: ${product.fabric || "—"}
Tavsif: ${product.description?.slice(0, 400) || "—"}
Ranglar: ${colors.join(", ") || "—"}
O‘lchamlar: ${sizes.join(", ") || "—"}

JSON qaytar (faqat JSON): {"title":"...","caption":"..."}
title: 3–7 so‘z. caption: BIRINCHI qator — qisqa hook (1 jumla). IKKINCHI qator — «🛒 Sotib olish» chorlovi (URL yozma). Keyin ixtiyoriy rang/o‘lcham. Soft sell, emoji.`;

        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            temperature: 0.7,
            messages: [
              { role: "system", content: "Faqat valid JSON qaytar." },
              { role: "user", content: prompt },
            ],
            response_format: { type: "json_object" },
          }),
        });
        const data = await res.json();
        if (res.ok) {
          const raw = data.choices?.[0]?.message?.content || "{}";
          const parsed = JSON.parse(raw) as { title?: string; caption?: string };
          if (parsed.title && parsed.caption) {
            return NextResponse.json({
              ok: true,
              source: "openai",
              configured: true,
              model,
              title: String(parsed.title).slice(0, 80),
              caption: String(parsed.caption).slice(0, 500),
              suggestedMusicId,
            });
          }
        }
      } catch {
        /* fallback below */
      }
    }

    const domain = await getSetting("app_domain", "");
    const buyUrl = productBuyUrl(domain || null, product.slug);
    const title = `${product.name} · yangi`.slice(0, 60);
    const caption = buildIgTemplateCaption({
      name: product.name,
      priceLabel: price,
      description: product.description,
      fabric: product.fabric,
      colors,
      sizes,
      buyUrl,
    });

    return NextResponse.json({
      ok: true,
      source: configured ? "template-fallback" : "template",
      configured,
      model: configured ? model : null,
      title,
      caption,
      suggestedMusicId,
      hint: configured
        ? "ChatGPT javob bermadi — mahsulot shabloni ishlatildi"
        : ".env ga OPENAI_API_KEY qo‘shib, npm run dev ni qayta ishga tushiring",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI xatosi" },
      { status: 400 }
    );
  }
}
