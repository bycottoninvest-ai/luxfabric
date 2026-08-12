import { formatSom } from "@/lib/utils";
import { getAppUrl, getSetting } from "@/lib/settings";

export type ShopReplyContext = {
  productName?: string | null;
  productSlug?: string | null;
  price?: number | null;
  sizes?: string[];
  fabric?: string | null;
};

function openaiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function openaiModel() {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

/** Oddiy kalit so‘z shabloni — OPENAI bo‘lmasa yoki xato bo‘lsa. */
export function templateShopReply(text: string, ctx: ShopReplyContext = {}) {
  const buyHint = ctx.productSlug
    ? `Sotib olish: /i/${ctx.productSlug}`
    : "Katalog: /instagram yoki luxfabricshop.uz";
  const priceHint =
    typeof ctx.price === "number"
      ? `Narx: ${formatSom(ctx.price)}.`
      : "Narxlar mahsulot sahifasida.";
  const sizeHint =
    ctx.sizes && ctx.sizes.length > 0
      ? `O‘lchamlar: ${ctx.sizes.join(", ")}.`
      : "O‘lchamlar: S–XXL (mavjudligi sahifada).";

  if (/narx|price|qancha|summa/i.test(text)) {
    return `${priceHint} ${buyHint}`.trim();
  }
  if (/olcham|o‘lcham|size|\bm\b|\bl\b|xl|xxl/i.test(text)) {
    return `${sizeHint} Qulay o‘lchamni tanlab, «Sotib olish» bosing. ${buyHint}`.trim();
  }
  if (/yetkaz|dostavka|qachon|delivery|kuryer/i.test(text)) {
    return "Yetkazib berish O‘zbekiston bo‘ylab 1–2 kun. To‘lov: Click yoki naqd. Savollar bo‘lsa yozing!";
  }
  if (/qaytar|vozvrat|garanti|almashtir/i.test(text)) {
    return "14 kun ichida qaytarish/almashtirish mumkin (etiketka saqlangan bo‘lsa).";
  }
  if (/mato|material|sifat|original/i.test(text)) {
    return ctx.fabric
      ? `Mato: ${ctx.fabric}. LUXFABRIC — sifatli to‘qimachilik. ${buyHint}`
      : `LUXFABRIC — sifatli to‘qimachilik. ${buyHint}`;
  }
  if (/salom|assalom|hello|hi\b/i.test(text)) {
    return `Assalomu alaykum! LUXFABRIC yordamchisiman. ${priceHint} ${buyHint}`;
  }
  if (/operator|odam|manager|admin/i.test(text)) {
    return "Operatorga ulayman — tez orada javob beramiz. Rahmat!";
  }

  const name = ctx.productName ? `«${ctx.productName}»` : "mahsulotimiz";
  return `Rahmat! ${name} haqida: ${priceHint} ${sizeHint} ${buyHint} Savolingiz bo‘lsa yozing.`.replace(
    /\s+/g,
    " "
  );
}

/** Instagram izoh / DM / sharh savoli uchun AI yoki shablon javob. */
export async function generateShopReply(
  userText: string,
  ctx: ShopReplyContext = {}
): Promise<{ reply: string; source: "openai" | "template" }> {
  const trimmed = userText.trim().slice(0, 800);
  if (!trimmed) {
    return { reply: templateShopReply("salom", ctx), source: "template" };
  }

  const domain =
    ((await getSetting("app_domain")) || (await getAppUrl()) || "https://www.luxfabricshop.uz").replace(
      /\/$/,
      ""
    );
  const buyUrl = ctx.productSlug ? `${domain}/i/${ctx.productSlug}` : `${domain}/instagram`;

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    try {
      const system = `Sen LUXFABRIC onlayn do‘konining o‘zbek tilidagi yordamchisisan.
Qisqa (1–3 kelima/jumla), do‘stona, sotuvga yo‘naltirilgan javob ber.
Spam/emoji ortiqchalik qilma. Havola kerak bo‘lsa: ${buyUrl}
Faktlar:
- Brend: LUXFABRIC (luxfabricshop.uz)
- Yetkazish: 1–2 kun, O‘zbekiston
- Qaytarish: 14 kun
- To‘lov: Click / naqd
${ctx.productName ? `- Mahsulot: ${ctx.productName}` : ""}
${typeof ctx.price === "number" ? `- Narx: ${formatSom(ctx.price)}` : ""}
${ctx.sizes?.length ? `- O‘lchamlar: ${ctx.sizes.join(", ")}` : ""}
${ctx.fabric ? `- Mato: ${ctx.fabric}` : ""}
Agar savol umumiy bo‘lsa ham yordam ber. Operator so‘ralsa — odamga uzatishini ayt.`;

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: openaiModel(),
          temperature: 0.55,
          max_tokens: 220,
          messages: [
            { role: "system", content: system },
            { role: "user", content: trimmed },
          ],
        }),
      });
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content?.trim();
      if (res.ok && content) {
        return { reply: content.slice(0, 900), source: "openai" };
      }
    } catch {
      /* template */
    }
  }

  return { reply: templateShopReply(trimmed, ctx), source: "template" };
}

export { openaiConfigured };
