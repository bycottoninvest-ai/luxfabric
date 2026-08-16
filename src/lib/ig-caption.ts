/** Instagram feed/Reel caption: CTA + URL birinchi qator (preview ~125 belgi kesadi). */

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

/** Instagram / bio / caption — doim www + /i/{slug}?from=ig */
export function productBuyUrl(domain: string | null | undefined, slug: string): string {
  return `${publicShopOrigin(domain)}/i/${encodeURIComponent(slug)}?from=ig`;
}

/** Bio / QR uchun Reels kirish (katalog emas — qizil Sotib olish bor). */
export function instagramBioUrl(domain?: string | null): string {
  return `${publicShopOrigin(domain)}/instagram`;
}

/** Captiondagi eski «Sotib olish» / buy URL qatorlarini tozalash (qayta joylash uchun). */
export function stripIgBuyCta(text: string, buyUrl?: string | null): string {
  let t = (text || "").trim();
  if (buyUrl?.trim()) {
    t = t.split(buyUrl.trim()).join("");
  }
  t = t.replace(/https?:\/\/(?:www\.)?luxfabricshop\.uz\/i\/[^\s]+/gi, "");
  t = t.replace(/\(Havola Instagramga joylashda avtomatik qo['‘’]?shiladi\)/gi, "");
  t = t.replace(/^(?:🛒|👇)\uFE0F?\s*Sotib olish(?:\s*:\s*\S*)?\s*[.….]?\s*$/gimu, "");
  t = t.replace(/^Sotib olish(?:\s*:\s*https?:\/\/\S+)?\s*[.….]?\s*$/gimu, "");
  t = t.replace(/(?:\r?\n|\s)*(?:🛒|👇)\uFE0F?\s*Sotib olish(?:\s*:\s*\S+)?\s*[.…]?\s*$/giu, "");
  t = t.replace(/(?:\r?\n|\s)*Sotib olish(?:\s*:\s*https?:\/\/\S+)?\s*[.…]?\s*$/giu, "");
  return t.replace(/\n{3,}/g, "\n\n").replace(/[ \t]+\n/g, "\n").trim();
}

/** Instagramda birinchi chiqadigan qator — to‘liq bosiladigan URL. */
export function buildIgBuyCtaLine(buyUrl: string, buyLabel?: string): string {
  const label = (buyLabel || "Sotib olish").trim() || "Sotib olish";
  return `🛒 ${label}: ${buyUrl.trim()}`;
}

/**
 * 1-qator: Sotib olish + HTTPS URL (IG kesmasin, xaridor darhol bossin).
 * Keyin mahsulot matni — boshida savatcha/«Sotib olish» yo‘q.
 */
export function buildIgPublishCaption(opts: {
  caption: string;
  buyUrl?: string | null;
  buyLabel?: string;
}): string {
  const buyUrl = (opts.buyUrl || "").trim();
  const body = stripIgBuyCta(opts.caption || "", buyUrl);

  if (!buyUrl) return body.slice(0, 2200);

  const ctaLine = buildIgBuyCtaLine(buyUrl, opts.buyLabel);
  return [ctaLine, body].filter(Boolean).join("\n\n").slice(0, 2200);
}

/** Publishdan keyin birinchi izoh — caption 1-qatori bilan bir xil, bosiladigan URL. */
export function buildIgFirstComment(opts: {
  buyUrl: string;
  buyLabel?: string;
}): string {
  return buildIgBuyCtaLine(opts.buyUrl, opts.buyLabel).slice(0, 800);
}

/** AI/shablon caption: faqat mahsulot matni. Savatcha/URL publishda 1-qatorga qo‘shiladi. */
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
    opts.description?.trim().slice(0, 140) ||
    `${opts.name} — ${opts.fabric || "premium mato"}.`;
  const details = [
    `Narx ${opts.priceLabel}.`,
    opts.colors?.length ? `Rang: ${opts.colors.join(", ")}.` : "",
    opts.sizes?.length ? `O‘lcham: ${opts.sizes.join(" / ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return stripIgBuyCta([hook, details].filter(Boolean).join("\n\n"), opts.buyUrl);
}
