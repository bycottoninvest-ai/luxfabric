/** LUXFABRIC QR payload formatlari — telefonda ochiladigan web URL */

export type QrKind = "sku" | "order" | "warehouse";

export type ParsedQr =
  | { kind: "sku"; barcode: string; raw: string }
  | { kind: "order"; orderNumber: string; raw: string }
  | { kind: "warehouse"; warehouseId: string; raw: string }
  | { kind: "unknown"; raw: string };

export function encodeSkuQr(barcode: string, appUrl?: string) {
  const base = (appUrl || "").replace(/\/$/, "");
  if (base) return `${base}/q/sku/${encodeURIComponent(barcode)}`;
  return `luxfabric://sku/${barcode}`;
}

/** Telefon kamerasi ochadi: /card/LF-xxxxx */
export function encodeOrderQr(orderNumber: string, appUrl?: string) {
  const base = (appUrl || "").replace(/\/$/, "");
  if (base) return `${base}/card/${encodeURIComponent(orderNumber)}`;
  return `luxfabric://order/${orderNumber}`;
}

export function encodeWarehouseQr(warehouseId: string, appUrl?: string) {
  const base = (appUrl || "").replace(/\/$/, "");
  if (base) return `${base}/q/warehouse/${encodeURIComponent(warehouseId)}`;
  return `luxfabric://warehouse/${warehouseId}`;
}

export function parseQrPayload(rawInput: string): ParsedQr {
  const raw = rawInput.trim();
  if (!raw) return { kind: "unknown", raw };

  const lux = raw.match(/^luxfabric:\/\/(sku|order|warehouse)\/(.+)$/i);
  if (lux) {
    const kind = lux[1].toLowerCase() as QrKind;
    const value = decodeURIComponent(lux[2]).trim();
    if (kind === "sku") return { kind: "sku", barcode: value, raw };
    if (kind === "order") return { kind: "order", orderNumber: value.toUpperCase(), raw };
    return { kind: "warehouse", warehouseId: value, raw };
  }

  // https://.../card/LF-123  yoki /q/sku/...
  try {
    const asUrl = raw.includes("://") ? new URL(raw) : null;
    const path = asUrl?.pathname || raw;
    const card = path.match(/\/card\/(LF-[A-Za-z0-9\-]+)/i);
    if (card) return { kind: "order", orderNumber: card[1].toUpperCase(), raw };
    const sku = path.match(/\/q\/sku\/([^/?#]+)/i);
    if (sku) return { kind: "sku", barcode: decodeURIComponent(sku[1]), raw };
    const wh = path.match(/\/q\/warehouse\/([^/?#]+)/i);
    if (wh) return { kind: "warehouse", warehouseId: decodeURIComponent(wh[1]), raw };
    const orderPath = path.match(/\/q\/order\/(LF-[A-Za-z0-9\-]+)/i);
    if (orderPath) return { kind: "order", orderNumber: orderPath[1].toUpperCase(), raw };
  } catch {
    /* ignore */
  }

  if (/^LF-\d{4,}$/i.test(raw)) {
    return { kind: "order", orderNumber: raw.toUpperCase(), raw };
  }

  if (/^[A-Za-z0-9\-_]{6,64}$/.test(raw)) {
    return { kind: "sku", barcode: raw, raw };
  }

  return { kind: "unknown", raw };
}
