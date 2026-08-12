/** Instagram feed/Reel caption: CTA + URL early (preview ~125 belgi kesadi). */

const DEFAULT_PUBLIC_ORIGIN = "https://www.luxfabricshop.uz";

/** app_domain → absolute HTTPS origin (www bilan, trailing slash yo‘q). */
export function publicShopOrigin(domain?: string | null): string {
  let raw = (domain || "").trim().replace(/\/$/, "");
  if (!raw) return DEFAULT_PUBLIC_ORIGIN;
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  try {
    const u = new URL(raw);
    if (u.hostname === "luxfabricshop.uz") u.hostname = "www.luxfabricshop.uz";
    return u.origin;
  } catch {
    return DEFAULT_PUBLIC_ORIGIN;
  }
}

export function productBuyUrl(domain: string | null | undefined, slug: string): string {
  return `${publicShopOrigin(domain)}/i/${slug}`;
}

/** Eski shablon oxiridagi «Sotib olish» qatorlarini olib tashlash (URL publishda qo‘shiladi). */
function stripTrailingBuyCta(text: string): string {
  return text
    // emoji + «Sotib olish» (+ ixtiyoriy URL) oxirida
    .replace(/(?:\r?\n|\s)*(?:🛒|👇)\uFE0F?\s*Sotib olish(?:\s*:\s*\S+)?\s*[.…]?\s*$/giu, "")
    .replace(/(?:\r?\n|\s)*Sotib olish(?:\s*:\s*https?:\/\/\S+)?\s*[.…]?\s*$/giu, "")
    .trim();
}

/**
 * Hook (1–2 qator) → Sotib olish + HTTPS URL → qolgan matn.
 * URL allaqachon caption ichida bo‘lsa, qayta qo‘shilmaydi.
 */
export function buildIgPublishCaption(opts: {
  caption: string;
  buyUrl?: string | null;
  buyLabel?: string;
}): string {
  const label = (opts.buyLabel || "Sotib olish").trim() || "Sotib olish";
  const buyUrl = (opts.buyUrl || "").trim();
  let body = stripTrailingBuyCta((opts.caption || "").trim());

  if (!buyUrl) return body.slice(0, 2200);

  if (body.includes(buyUrl)) {
    return body.slice(0, 2200);
  }

  const ctaLine = `🛒 ${label}: ${buyUrl}`;
  const paragraphs = body.split(/\n+/).map((p) => p.trim()).filter(Boolean);

  let head: string;
  let rest: string;
  if (paragraphs.length === 0) {
    head = "";
    rest = "";
  } else if (paragraphs.length === 1) {
    const one = paragraphs[0];
    const sentenceBreak = one.search(/[.!?…](?:\s|$)/);
    if (sentenceBreak > 0 && sentenceBreak < 140) {
      head = one.slice(0, sentenceBreak + 1).trim();
      rest = one.slice(sentenceBreak + 1).trim();
    } else if (one.length > 120) {
      const cut = one.lastIndexOf(" ", 100);
      const at = cut > 40 ? cut : 100;
      head = one.slice(0, at).trim();
      rest = one.slice(at).trim();
    } else {
      head = one;
      rest = "";
    }
  } else {
    head = paragraphs.slice(0, Math.min(2, paragraphs.length)).join("\n");
    rest = paragraphs.slice(Math.min(2, paragraphs.length)).join("\n");
  }

  const parts = [head, ctaLine, rest].filter(Boolean);
  return parts.join("\n\n").slice(0, 2200);
}

/** AI/shablon caption: hook + CTA chorlovi yuqorida, rang/o‘lcham pastda. */
export function buildIgTemplateCaption(opts: {
  name: string;
  priceLabel: string;
  description?: string | null;
  fabric?: string | null;
  colors?: string[];
  sizes?: string[];
  buyUrl?: string | null;
}): string {
  const hook =
    opts.description?.trim().slice(0, 100) ||
    `${opts.name} — ${opts.fabric || "premium mato"}.`;
  const cta = opts.buyUrl
    ? `🛒 Sotib olish: ${opts.buyUrl}`
    : `👇 Sotib olish · narx ${opts.priceLabel}`;
  const details = [
    `Narx ${opts.priceLabel}.`,
    opts.colors?.length ? `Rang: ${opts.colors.join(", ")}.` : "",
    opts.sizes?.length ? `O‘lcham: ${opts.sizes.join(" / ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return [hook, cta, details].filter(Boolean).join("\n\n");
}
