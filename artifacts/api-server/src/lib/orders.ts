import {
  db,
  orderEvents,
  orderItems,
  orders,
  staff,
} from "@workspace/db";
import { asc, inArray } from "drizzle-orm";

export type OrderRow = typeof orders.$inferSelect;
export type OrderItemRow = typeof orderItems.$inferSelect;
export type OrderEventRow = typeof orderEvents.$inferSelect;
export type OrderStatus = OrderRow["status"];

/**
 * The only legal moves. Anything not listed here is rejected, so an order can
 * never jump from PLACED straight to DELIVERED because someone clicked twice.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["PLACED", "CANCELLED", "FAILED"],
  PLACED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PACKED", "CANCELLED"],
  PACKED: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "FAILED"],
  DELIVERED: [],
  CANCELLED: [],
  FAILED: [],
};

const CUSTOMER_CANCELLABLE: OrderStatus[] = [
  "PENDING_PAYMENT",
  "PLACED",
  "CONFIRMED",
];

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export function customerCanCancel(status: OrderStatus): boolean {
  return CUSTOMER_CANCELLABLE.includes(status);
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  PLACED: "Order placed",
  CONFIRMED: "Confirmed at the dock",
  PACKED: "Cleaned, cut and packed",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  FAILED: "Failed",
};

/**
 * Either the pool handle or an open transaction. Helpers take this so a caller
 * can pull them into its own transaction: a status change, the stock it puts
 * back, and the audit row it writes must all commit or all fail together.
 */
export type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function recordOrderEvent(
  input: {
    orderId: string;
    fromStatus: string | null;
    toStatus: string;
    note?: string | null;
    actorType: OrderEventRow["actorType"];
    actorId?: string | null;
  },
  tx: Executor = db,
): Promise<void> {
  await tx.insert(orderEvents).values({
    orderId: input.orderId,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    note: input.note ?? null,
    actorType: input.actorType,
    actorId: input.actorId ?? null,
  });
}

function serializeAddress(order: OrderRow) {
  return {
    label: order.addressLabel,
    receiverName: order.receiverName,
    receiverPhone: order.receiverPhone,
    line1: order.line1,
    line2: order.line2,
    area: order.area,
    city: order.city,
    state: order.state,
    pincode: order.pincode,
  };
}

function serializeItem(item: OrderItemRow) {
  return {
    id: item.id,
    variantId: item.variantId ?? "",
    productName: item.productName,
    productNameLocal: item.productNameLocal,
    cutType: item.cutType,
    packLabel: item.packLabel,
    imageUrl: item.imageUrl,
    grossWeightG: item.grossWeightG,
    unitPricePaise: item.unitPricePaise,
    quantity: item.quantity,
    lineTotalPaise: item.lineTotalPaise,
  };
}

function serializeEvent(event: OrderEventRow) {
  return {
    id: event.id,
    fromStatus: event.fromStatus,
    toStatus: event.toStatus,
    note: event.note,
    actorType: event.actorType,
    createdAt: event.createdAt.toISOString(),
  };
}

export interface OrderBundle {
  order: OrderRow;
  items: OrderItemRow[];
  events: OrderEventRow[];
  riderName?: string | null;
  riderPhone?: string | null;
}

/** Fetch items + events + rider for a set of orders in three queries, not N. */
export async function loadOrderBundles(orderRows: OrderRow[]): Promise<OrderBundle[]> {
  if (orderRows.length === 0) return [];

  const ids = orderRows.map((row) => row.id);
  const [items, events, riders] = await Promise.all([
    db.select().from(orderItems).where(inArray(orderItems.orderId, ids)),
    db
      .select()
      .from(orderEvents)
      .where(inArray(orderEvents.orderId, ids))
      .orderBy(asc(orderEvents.createdAt)),
    db.select().from(staff),
  ]);

  const itemsByOrder = groupBy(items, (item) => item.orderId);
  const eventsByOrder = groupBy(events, (event) => event.orderId);
  const riderById = new Map(riders.map((rider) => [rider.id, rider]));

  return orderRows.map((order) => {
    const rider = order.riderId ? riderById.get(order.riderId) : undefined;
    return {
      order,
      items: itemsByOrder.get(order.id) ?? [],
      events: eventsByOrder.get(order.id) ?? [],
      riderName: rider?.fullName ?? null,
      riderPhone: rider?.phone ?? null,
    };
  });
}

/** Customer-facing order shape. The delivery OTP appears only when it is needed. */
export function serializeCustomerOrder(bundle: OrderBundle) {
  const { order } = bundle;
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    address: serializeAddress(order),
    slotLabel: order.slotLabel,
    deliveryDate: order.deliveryDate,
    items: bundle.items.map(serializeItem),
    subtotalPaise: order.subtotalPaise,
    deliveryFeePaise: order.deliveryFeePaise,
    handlingFeePaise: order.handlingFeePaise,
    discountPaise: order.discountPaise,
    totalPaise: order.totalPaise,
    deliveryOtp: order.status === "OUT_FOR_DELIVERY" ? order.deliveryOtp : null,
    riderName: bundle.riderName ?? null,
    riderPhone: bundle.riderPhone ?? null,
    customerNote: order.customerNote,
    cancellationReason: order.cancellationReason,
    canCancel: customerCanCancel(order.status),
    createdAt: order.createdAt.toISOString(),
    deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : null,
    events: bundle.events.map(serializeEvent),
  };
}

export function serializeAdminOrder(
  bundle: OrderBundle,
  customer: { fullName: string | null; phone: string },
) {
  const { order } = bundle;
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    customerName: customer.fullName?.trim() || "Guest",
    customerPhone: customer.phone,
    address: serializeAddress(order),
    slotId: order.slotId,
    slotLabel: order.slotLabel,
    deliveryDate: order.deliveryDate,
    items: bundle.items.map(serializeItem),
    subtotalPaise: order.subtotalPaise,
    deliveryFeePaise: order.deliveryFeePaise,
    handlingFeePaise: order.handlingFeePaise,
    totalPaise: order.totalPaise,
    itemCount: bundle.items.reduce((sum, item) => sum + item.quantity, 0),
    riderId: order.riderId,
    riderName: bundle.riderName ?? null,
    // The handover OTP is deliberately absent here. It is the customer's proof
    // that the right person reached their door; if staff can read it, staff can
    // close a delivery that never happened. It is compared server-side only.
    customerNote: order.customerNote,
    cancellationReason: order.cancellationReason,
    flaggedUnreachable: order.flaggedUnreachable,
    cashCollectedPaise: order.cashCollectedPaise,
    cashCollectedAt: order.cashCollectedAt
      ? order.cashCollectedAt.toISOString()
      : null,
    allowedTransitions: ORDER_TRANSITIONS[order.status],
    events: bundle.events.map(serializeEvent),
    createdAt: order.createdAt.toISOString(),
    deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : null,
  };
}

export function serializeRiderOrder(
  bundle: OrderBundle,
  customer: { fullName: string | null; phone: string },
  maxOtpAttempts: number,
) {
  const { order } = bundle;
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    customerName: customer.fullName?.trim() || "Guest",
    customerPhone: customer.phone,
    address: serializeAddress(order),
    slotLabel: order.slotLabel,
    deliveryDate: order.deliveryDate,
    itemCount: bundle.items.reduce((sum, item) => sum + item.quantity, 0),
    totalPaise: order.totalPaise,
    collectCashPaise:
      order.paymentMethod === "COD" && order.paymentStatus !== "PAID"
        ? order.totalPaise
        : 0,
    cashCollectedPaise: order.cashCollectedPaise,
    otpAttemptsRemaining: Math.max(0, maxOtpAttempts - order.otpAttempts),
    flaggedUnreachable: order.flaggedUnreachable,
    deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : null,
    items: bundle.items.map(serializeItem),
  };
}

export const MAX_DELIVERY_OTP_ATTEMPTS = 5;

/* ------------------------------- utilities ------------------------------- */

function groupBy<T, K>(rows: T[], key: (row: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const row of rows) {
    const bucket = map.get(key(row)) ?? [];
    bucket.push(row);
    map.set(key(row), bucket);
  }
  return map;
}
