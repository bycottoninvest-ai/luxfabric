"use client";

import { DEVICE_TOKEN_STORAGE_KEY } from "@/lib/order-device-token";

export type DeviceTokenMap = Record<string, string>;

export function readDeviceOrderTokens(): DeviceTokenMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(DEVICE_TOKEN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: DeviceTokenMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string" && v.length > 10) out[k.toUpperCase()] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveDeviceOrderToken(orderNumber: string, token: string) {
  if (typeof window === "undefined" || !orderNumber || !token) return;
  const key = orderNumber.trim().toUpperCase();
  const map = readDeviceOrderTokens();
  map[key] = token;
  localStorage.setItem(DEVICE_TOKEN_STORAGE_KEY, JSON.stringify(map));
  try {
    document.cookie = `lf_dot_${key.replace(/[^A-Z0-9-]/gi, "")}=${encodeURIComponent(token)}; Path=/; Max-Age=${90 * 24 * 60 * 60}; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

export function getDeviceOrderToken(orderNumber: string): string | null {
  const key = orderNumber.trim().toUpperCase();
  return readDeviceOrderTokens()[key] || null;
}

export function listDeviceTokenPairs(): Array<{ orderNumber: string; token: string }> {
  return Object.entries(readDeviceOrderTokens()).map(([orderNumber, token]) => ({
    orderNumber,
    token,
  }));
}
