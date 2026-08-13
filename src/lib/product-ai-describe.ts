import { readFile } from "fs/promises";
import path from "path";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_SLUGS,
  categoryNameForSlug,
  isProductCategorySlug,
} from "@/lib/product-categories";

export type ProductAiDescribeResult = {
  category: string;
  name: string;
  description: string;
  material: string;
  care: string;
  confidence: number;
  source: "openai" | "template" | "template-fallback";
  model: string | null;
};

function openaiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function openaiModel() {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

function genderLabel(gender?: string) {
  if (gender === "MEN") return "erkaklar";
  if (gender === "KIDS") return "bolalar";
  if (gender === "WOMEN") return "ayollar";
  return "unisex / umumiy";
}

/** Relativ /uploads → lokal fayl base64; http(s) → URL. */
export async function resolveImageContent(
  imageUrl: string,
  imageBase64?: string | null
): Promise<{ type: "image_url"; image_url: { url: string } }> {
  if (imageBase64?.startsWith("data:image/")) {
    return { type: "image_url", image_url: { url: imageBase64 } };
  }

  if (/^https?:\/\//i.test(imageUrl)) {
    return { type: "image_url", image_url: { url: imageUrl } };
  }

  let rel = imageUrl;
  if (imageUrl.startsWith("/uploads/")) {
    rel = imageUrl;
  } else {
    try {
      rel = new URL(imageUrl).pathname;
    } catch {
      /* keep */
    }
  }

  if (rel.startsWith("/uploads/")) {
    const full = path.join(process.cwd(), "public", rel.replace(/^\//, ""));
    const uploadsRoot = path.join(process.cwd(), "public", "uploads");
    if (full.startsWith(uploadsRoot)) {
      const buf = await readFile(full);
      const ext = path.extname(full).toLowerCase().replace(".", "") || "jpeg";
      const mime =
        ext === "png"
          ? "image/png"
          : ext === "webp"
            ? "image/webp"
            : ext === "gif"
              ? "image/gif"
              : "image/jpeg";
      return {
        type: "image_url",
        image_url: { url: `data:${mime};base64,${buf.toString("base64")}` },
      };
    }
  }

  throw new Error("Rasm URL ochilmadi — qayta yuklang yoki to‘liq https URL bering");
}

export function templateProductDescribe(opts: {
  gender?: string;
  nameHint?: string;
  categoryHint?: string;
}): ProductAiDescribeResult {
  const slug = isProductCategorySlug(opts.categoryHint || "")
    ? (opts.categoryHint as string)
    : "futbolkalar";
  const catName = categoryNameForSlug(slug);
  const g = genderLabel(opts.gender);
  const name =
    opts.nameHint?.trim() ||
    `LUXFABRIC ${catName}${g !== "unisex / umumiy" ? ` · ${g}` : ""}`.slice(0, 80);

  return {
    category: slug,
    name,
    description: `${name} — LUXFABRIC kolleksiyasidan zamonaviy, kundalik kiyim uchun qulay model. Sifatli mato, toza tikuv va qulay fason. ${g} uchun mos.`,
    material: "Premium paxta aralashmasi / sifatli tekstil",
    care: "30°C da yumshoq rejimda yuvish; dazmol o‘rtacha; quritgichda quritmang",
    confidence: 0.35,
    source: "template",
    model: null,
  };
}

type AiJson = {
  category?: string;
  name?: string;
  description?: string;
  material?: string;
  care?: string;
  confidence?: number;
};

export async function describeProductFromImage(opts: {
  imageUrl: string;
  imageBase64?: string | null;
  gender?: string;
  nameHint?: string;
}): Promise<ProductAiDescribeResult> {
  const fallback = templateProductDescribe({
    gender: opts.gender,
    nameHint: opts.nameHint,
  });

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (!openaiKey) {
    return { ...fallback, source: "template", model: null };
  }

  const model = openaiModel();
  try {
    const imagePart = await resolveImageContent(opts.imageUrl, opts.imageBase64);
    const catalog = PRODUCT_CATEGORIES.map((c) => `${c.slug} (${c.name})`).join(", ");

    const prompt = `Sen LUXFABRIC (O‘zbekiston) premium tekstil brendi uchun mahsulot kartochkasini to‘ldirasan.
Rasmdan kiyim/aksessuarni aniqlab, o‘zbek tilida chiroyli, sotuvga yo‘naltirilgan matn yoz.

Jins konteksti: ${genderLabel(opts.gender)}
${opts.nameHint ? `Nom uchun ishora: ${opts.nameHint}` : ""}

Ruxsat etilgan category slug lar (faqat shulardan birini tanla):
${catalog}

JSON qaytar (faqat JSON):
{
  "category": "<slug>",
  "name": "<qisqa chiroyli nom, 3–8 so‘z>",
  "description": "<2–4 jumla, o‘zbekcha, premium tone>",
  "material": "<mato/material qisqa>",
  "care": "<parvarish qisqa>",
  "confidence": <0..1>
}

Agar ishonchsiz bo‘lsa category=futbolkalar yoki boshqa, confidence past qo‘y.`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.45,
        max_tokens: 700,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Faqat valid JSON qaytar. Matnlar o‘zbek tilida.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              imagePart,
            ],
          },
        ],
      }),
    });

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };

    if (!res.ok) {
      return {
        ...fallback,
        source: "template-fallback",
        model,
      };
    }

    const raw = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw) as AiJson;
    const slug = String(parsed.category || "").trim();
    const category = PRODUCT_CATEGORY_SLUGS.includes(slug) ? slug : "futbolkalar";
    const confidence =
      typeof parsed.confidence === "number"
        ? Math.min(1, Math.max(0, parsed.confidence))
        : 0.7;

    return {
      category,
      name: String(parsed.name || fallback.name).trim().slice(0, 100),
      description: String(parsed.description || fallback.description).trim().slice(0, 1200),
      material: String(parsed.material || fallback.material).trim().slice(0, 200),
      care: String(parsed.care || fallback.care).trim().slice(0, 200),
      confidence,
      source: "openai",
      model,
    };
  } catch {
    return {
      ...fallback,
      source: openaiConfigured() ? "template-fallback" : "template",
      model: openaiConfigured() ? model : null,
    };
  }
}
