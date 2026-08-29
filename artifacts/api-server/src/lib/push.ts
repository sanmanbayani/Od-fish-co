/**
 * Order-status push notifications, delivered through Expo's push service.
 *
 * The phone registers an Expo push token after signing in; every status the
 * customer would otherwise have to open the app to discover is pushed to the
 * tokens that belong to them.
 *
 * Two rules shape everything here:
 *
 * 1. A notification must never fail an order. Expo is a third party over the
 *    public internet, and "the fish left the counter" is not something to roll
 *    back because a push server was slow. Sending is therefore fire-and-forget:
 *    it runs after the transaction has committed, off the request's critical
 *    path, and every failure is logged rather than thrown.
 * 2. A token that the push service says is dead gets deleted. Otherwise every
 *    uninstalled app keeps costing a round trip on every order, forever.
 */
import { and, eq, inArray } from "drizzle-orm";
import { db, pushDevices } from "@workspace/db";
import { logger } from "./logger";
import type { OrderRow, OrderStatus } from "./orders";
import { relativeDayLabel } from "./time";

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";

/** Expo refuses batches larger than this. */
const MAX_MESSAGES_PER_REQUEST = 100;

/** A slow push service must not hold a connection open indefinitely. */
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * The five moments a customer is told about. Every other status change is
 * either invisible to them (PENDING_PAYMENT) or something they did themselves
 * and are already looking at (CANCELLED), so pushing it would be noise.
 */
const NOTIFIABLE_STATUSES = [
  "PLACED",
  "CONFIRMED",
  "PACKED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const;

export type NotifiableStatus = (typeof NOTIFIABLE_STATUSES)[number];

export function isNotifiableStatus(status: OrderStatus): status is NotifiableStatus {
  return (NOTIFIABLE_STATUSES as readonly string[]).includes(status);
}

type PushCopy = { title: string; body: string };

/**
 * What each update actually says.
 *
 * Written the way the shop would say it out loud, and always answering the one
 * question the customer has at that moment: when is my fish arriving. The
 * delivery window travels in the body because a notification is often the only
 * thing they read.
 */
function copyFor(order: OrderRow, status: NotifiableStatus): PushCopy {
  const when = `${relativeDayLabel(order.deliveryDate)}, ${order.slotLabel}`;

  switch (status) {
    case "PLACED":
      return {
        title: `Order ${order.orderNumber} placed`,
        body: `We have your order. Arriving ${when}.`,
      };
    case "CONFIRMED":
      return {
        title: "Order confirmed",
        body: `${order.orderNumber} is confirmed at the dock for ${when}.`,
      };
    case "PACKED":
      return {
        title: "Cleaned, cut and packed",
        body: `${order.orderNumber} is packed and waiting for its ${order.slotLabel} run.`,
      };
    case "OUT_FOR_DELIVERY":
      return {
        title: "Out for delivery",
        body: `${order.orderNumber} is on its way. Keep your handover code ready.`,
      };
    case "DELIVERED":
      return {
        title: "Delivered",
        body: `${order.orderNumber} has been handed over. Enjoy the catch.`,
      };
  }
}

type ExpoTicket =
  | { status: "ok"; id?: string }
  | { status: "error"; message?: string; details?: { error?: string } };

type DeviceRow = { token: string; platform: string | null };

/**
 * Post one batch and act on what comes back.
 *
 * Expo answers with one ticket per message, in the order they were sent, so a
 * ticket is matched to its token by position. `DeviceNotRegistered` means the
 * app was uninstalled or the token was reissued: that row is dead and is
 * removed. Any other error is logged and left alone — a transient push-service
 * problem is not a reason to forget a working phone.
 */
async function sendBatch(devices: DeviceRow[], copy: PushCopy, order: OrderRow): Promise<void> {
  const messages = devices.map((device) => ({
    to: device.token,
    title: copy.title,
    body: copy.body,
    sound: "default" as const,
    // Android needs a channel that the app created at startup, or the
    // notification arrives silent and unsorted.
    channelId: "orders",
    priority: "high" as const,
    // What the app reads when the customer taps the notification.
    data: { orderId: order.id, orderNumber: order.orderNumber, status: order.status },
  }));

  const accessToken = process.env.EXPO_ACCESS_TOKEN?.trim();

  const response = await fetch(EXPO_PUSH_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(messages),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    logger.warn(
      { orderId: order.id, status: response.status },
      "Expo push service rejected the batch",
    );
    return;
  }

  const payload = (await response.json()) as { data?: ExpoTicket[] };
  const tickets = payload.data ?? [];
  const dead: string[] = [];

  tickets.forEach((ticket, index) => {
    if (ticket.status === "ok") return;
    const token = devices[index]?.token;
    if (!token) return;

    if (ticket.details?.error === "DeviceNotRegistered") {
      dead.push(token);
      return;
    }
    logger.warn(
      { orderId: order.id, error: ticket.details?.error, message: ticket.message },
      "Expo push ticket reported an error",
    );
  });

  if (dead.length > 0) {
    await db.delete(pushDevices).where(inArray(pushDevices.token, dead));
    logger.info({ count: dead.length }, "Removed push tokens the device no longer accepts");
  }
}

async function sendOrderStatusPush(order: OrderRow, status: NotifiableStatus): Promise<void> {
  const devices = await db
    .select({ token: pushDevices.token, platform: pushDevices.platform })
    .from(pushDevices)
    .where(eq(pushDevices.customerId, order.customerId));

  if (devices.length === 0) return;

  const copy = copyFor(order, status);

  for (let i = 0; i < devices.length; i += MAX_MESSAGES_PER_REQUEST) {
    await sendBatch(devices.slice(i, i + MAX_MESSAGES_PER_REQUEST), copy, order);
  }

  logger.info(
    { orderId: order.id, status, devices: devices.length },
    "Order status pushed to the customer's devices",
  );
}

/**
 * Tell the customer where their order is.
 *
 * Deliberately returns nothing and never rejects: call it straight after the
 * status write has committed and carry on answering the request. A push that
 * does not go out is a missed message, not a failed order, so it belongs in the
 * log rather than in the response.
 */
export function notifyOrderStatus(order: OrderRow): void {
  if (!isNotifiableStatus(order.status)) return;
  const status = order.status;

  void sendOrderStatusPush(order, status).catch((error: unknown) => {
    logger.error({ err: error, orderId: order.id, status }, "Order status push failed");
  });
}

/* ------------------------------- device rows ------------------------------ */

/**
 * Remember a phone.
 *
 * Keyed on the token: if this handset was signed into another account before,
 * the row moves to the customer signing in now instead of leaving two owners
 * pointing at one device.
 */
export async function registerPushDevice(input: {
  customerId: string;
  token: string;
  platform?: string | null;
}): Promise<void> {
  await db
    .insert(pushDevices)
    .values({
      customerId: input.customerId,
      token: input.token,
      platform: input.platform ?? null,
    })
    .onConflictDoUpdate({
      target: pushDevices.token,
      set: {
        customerId: input.customerId,
        platform: input.platform ?? null,
        lastSeenAt: new Date(),
      },
    });
}

/**
 * Forget a phone — on sign-out, so the next person to use the handset does not
 * receive a stranger's order updates.
 */
export async function forgetPushDevice(customerId: string, token: string): Promise<void> {
  await db
    .delete(pushDevices)
    .where(and(eq(pushDevices.token, token), eq(pushDevices.customerId, customerId)));
}
