import type { Prisma } from "@prisma/client";
import { maskUzPhone, isValidUzPhone } from "@/lib/utils";
import {
  hashDeviceOrderToken,
  normalizeOrderNumber,
  verifyDeviceOrderToken,
} from "@/lib/order-device-token";
import {
  buildCustomerTimeline,
  buildCourierTrackingUrl,
  currentLocationLabel,
  deliveryTypeLabel,
  formatPromisedByLabel,
  handoffLabel,
  nextCustomerStep,
  resolveCourierMeta,
} from "@/lib/order-tracking";
import { normalizeStatus } from "@/lib/fulfillment";
import { ORDER_STATUS } from "@/lib/utils";

export const trackOrderInclude = {
  events: { orderBy: { createdAt: "asc" as const } },
  warehouse: true,
  courier: true,
  items: { include: { product: true, variant: true } },
} satisfies Prisma.OrderInclude;

export type TrackOrderRow = Prisma.OrderGetPayload<{ include: typeof trackOrderInclude }>;

export function normalizeTrackPhone(raw: string): string | null {
  const phone = maskUzPhone(raw || "");
  return isValidUzPhone(phone) ? phone : null;
}

export function phonesMatch(a: string, b: string): boolean {
  const na = normalizeTrackPhone(a);
  const nb = normalizeTrackPhone(b);
  return Boolean(na && nb && na === nb);
}

export type PublicTrackOrder = {
  orderNumber: string;
  status: string;
  statusLabel: string;
  statusColor: string;
  paymentStatus: string;
  paymentMethod: string;
  deliveryType: string;
  deliveryLabel: string;
  city: string;
  address: string;
  handoffMode: string | null;
  handoffLabel: string | null;
  promisedBy: string | null;
  promisedLabel: string | null;
  promiseLabel: string | null;
  location: string;
  nextStep: { title: string; hint?: string } | null;
  timeline: ReturnType<typeof buildCustomerTimeline>;
  courier: {
    name: string | null;
    tracking: string | null;
    trackUrl: string | null;
    branchLabel: string | null;
  };
  warehouse: {
    name: string;
    city: string;
    address: string;
    phone: string | null;
  } | null;
  items: Array<{
    id: string;
    name: string;
    color: string;
    size: string;
    quantity: number;
    lineTotal: number;
  }>;
  total: number;
  events: Array<{
    id: string;
    status: string;
    title: string;
    note: string | null;
    createdAt: string;
  }>;
  createdAt: string;
  /** Mijozga o‘z telefoni (maskasiz emas — faqat o‘ziniki) */
  customerPhoneMasked: string;
};

function maskPhoneOut(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length < 12) return "+998•••";
  return `+${d.slice(0, 3)} ${d.slice(3, 5)} ••• ${d.slice(8, 10)} ${d.slice(10)}`;
}

export function toPublicTrackOrder(order: TrackOrderRow): PublicTrackOrder {
  const statusKey = normalizeStatus(order.status);
  const st = ORDER_STATUS[statusKey] || ORDER_STATUS.NEW;
  const timeline = buildCustomerTimeline(order);
  const location = currentLocationLabel(order);
  const courierMeta = resolveCourierMeta(order);
  const trackUrl = buildCourierTrackingUrl(
    courierMeta?.code || order.courierCode || order.courierCompanyId,
    order.courierTracking
  );
  const next = nextCustomerStep(order.status, order.deliveryType, order.paymentStatus);
  const promisedLabel = formatPromisedByLabel(order.promisedBy);

  return {
    orderNumber: order.orderNumber,
    status: statusKey,
    statusLabel: st.label,
    statusColor: st.color,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    deliveryType: order.deliveryType,
    deliveryLabel: deliveryTypeLabel(order.deliveryType),
    city: order.city,
    address: order.address,
    handoffMode: order.handoffMode,
    handoffLabel: handoffLabel(order.handoffMode),
    promisedBy: order.promisedBy ? order.promisedBy.toISOString() : null,
    promisedLabel,
    promiseLabel: order.promiseLabel,
    location,
    nextStep: next,
    timeline,
    courier: {
      name: courierMeta?.name || order.courierLabel || null,
      tracking: order.courierTracking,
      trackUrl,
      branchLabel: order.courierBranchLabel,
    },
    warehouse: order.warehouse
      ? {
          name: order.warehouse.name,
          city: order.warehouse.city,
          address: order.warehouse.address,
          phone: order.warehouse.phone,
        }
      : null,
    items: order.items.map((item) => ({
      id: item.id,
      name: item.product.name,
      color: item.variant.color,
      size: item.variant.size,
      quantity: item.quantity,
      lineTotal: item.price * item.quantity,
    })),
    total: order.total,
    events: order.events.map((ev) => ({
      id: ev.id,
      status: ev.status,
      title: ev.title,
      note: ev.note,
      createdAt: ev.createdAt.toISOString(),
    })),
    createdAt: order.createdAt.toISOString(),
    customerPhoneMasked: maskPhoneOut(order.customerPhone),
  };
}

export type DeviceTokenPair = { orderNumber: string; token: string };

export function authorizeOrderAccess(
  order: { orderNumber: string; customerPhone: string; deviceTokenHash: string | null },
  opts: { phone?: string | null; deviceToken?: string | null }
): boolean {
  if (opts.deviceToken && verifyDeviceOrderToken(opts.deviceToken, order.deviceTokenHash)) {
    return true;
  }
  if (opts.phone && phonesMatch(opts.phone, order.customerPhone)) {
    return true;
  }
  return false;
}

export function cookieNameForOrder(orderNumber: string): string {
  return `lf_dot_${normalizeOrderNumber(orderNumber).replace(/[^A-Z0-9-]/gi, "")}`;
}

export { hashDeviceOrderToken, normalizeOrderNumber, verifyDeviceOrderToken };
