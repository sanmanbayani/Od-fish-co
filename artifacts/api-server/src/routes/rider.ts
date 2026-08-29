import { VerifyDeliveryOtpBody } from "@workspace/api-zod";
import { customers, db, orders } from "@workspace/db";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { badRequest, conflict, notFound, parseBody, unauthorized } from "../lib/http";
import {
  loadOrderBundles,
  MAX_DELIVERY_OTP_ATTEMPTS,
  recordOrderEvent,
  serializeRiderOrder,
} from "../lib/orders";
import { requireStaff } from "../middlewares/auth";

const router: IRouter = Router();

router.use(requireStaff("RIDER", "ADMIN"));

/** Rupees for a doorstep message: ₹2,562 — and ₹2,562.50 only when it matters. */
function formatPaise(paise: number): string {
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString("en-IN", {
    minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

async function serializeForRider(orderRows: (typeof orders.$inferSelect)[]) {
  const bundles = await loadOrderBundles(orderRows);
  if (bundles.length === 0) return [];

  const customerRows = await db
    .select()
    .from(customers)
    .where(inArray(customers.id, orderRows.map((row) => row.customerId)));
  const byId = new Map(customerRows.map((row) => [row.id, row]));

  return bundles.map((bundle) =>
    serializeRiderOrder(
      bundle,
      {
        fullName: byId.get(bundle.order.customerId)?.fullName ?? null,
        phone: byId.get(bundle.order.customerId)?.phone ?? "",
      },
      MAX_DELIVERY_OTP_ATTEMPTS,
    ),
  );
}

/** The rider only ever sees their own runs: today's packed and out-for-delivery work. */
router.get("/orders", async (req, res) => {
  const rider = req.staff!;

  const rows = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.riderId, rider.id),
        sql`${orders.status} in ('PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED')`,
      ),
    )
    .orderBy(asc(orders.deliveryDate), asc(orders.createdAt))
    .limit(60);

  res.json(await serializeForRider(rows));
});

router.post("/orders/:id/verify-otp", async (req, res) => {
  const body = parseBody(VerifyDeliveryOtpBody, req.body);
  const rider = req.staff!;
  const id = String(req.params.id);

  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) throw notFound("That delivery is not on your list.");
  if (order.riderId !== rider.id && rider.role !== "ADMIN") {
    throw unauthorized("That delivery is assigned to another rider.");
  }
  if (order.status !== "OUT_FOR_DELIVERY") {
    throw conflict(
      "Mark the order out for delivery before confirming it at the door.",
      "not_out_for_delivery",
    );
  }
  if (order.otpAttempts >= MAX_DELIVERY_OTP_ATTEMPTS) {
    throw conflict(
      "Too many wrong codes. Call the operations desk to complete this delivery.",
      "otp_locked",
    );
  }

  // Cash first, code second. A delivered COD order with no money recorded is
  // indistinguishable from a delivered prepaid one at the end of the day, so
  // the rider has to say the cash is in hand before the order can close.
  const collectsCash =
    order.paymentMethod === "COD" && order.paymentStatus !== "PAID";
  if (collectsCash && body.cashCollected !== true) {
    throw badRequest(
      `Collect ${formatPaise(order.totalPaise)} in cash before confirming this delivery.`,
      "cash_not_collected",
    );
  }

  // Same reassignment window as dispatch: pin the rider into the write.
  const ownedByRider = rider.role === "ADMIN" ? undefined : eq(orders.riderId, rider.id);

  if (order.deliveryOtp !== body.otp.trim()) {
    const [bumped] = await db
      .update(orders)
      .set({ otpAttempts: sql`${orders.otpAttempts} + 1` })
      .where(eq(orders.id, id))
      .returning();

    const remaining = Math.max(
      0,
      MAX_DELIVERY_OTP_ATTEMPTS - (bumped?.otpAttempts ?? MAX_DELIVERY_OTP_ATTEMPTS),
    );
    throw conflict(
      `That code does not match. ${remaining} attempt${remaining === 1 ? "" : "s"} left.`,
      "otp_mismatch",
    );
  }

  const delivered = await db.transaction(async (tx) => {
    // Two taps on Confirm at a doorstep with bad signal is the normal case, so
    // pin the write to the status we checked and let the loser find out.
    const [row] = await tx
      .update(orders)
      .set({
        status: "DELIVERED",
        deliveredAt: new Date(),
        paymentStatus: "PAID",
        flaggedUnreachable: false,
        // The amount is the total the server itself computed, never a number
        // the handset sent.
        ...(collectsCash
          ? { cashCollectedPaise: order.totalPaise, cashCollectedAt: new Date() }
          : {}),
      })
      .where(and(eq(orders.id, id), eq(orders.status, "OUT_FOR_DELIVERY"), ownedByRider))
      .returning();

    if (!row) {
      throw conflict(
        "This delivery was already closed, or has been reassigned to another rider.",
        "already_delivered",
      );
    }

    await recordOrderEvent(
      {
        orderId: id,
        fromStatus: order.status,
        toStatus: "DELIVERED",
        note: collectsCash
          ? `Confirmed at the door by ${rider.fullName} · ${formatPaise(order.totalPaise)} cash collected`
          : `Confirmed at the door by ${rider.fullName}`,
        actorType: "RIDER",
        actorId: rider.id,
      },
      tx,
    );

    return row;
  });

  req.log.info(
    {
      orderId: id,
      riderId: rider.id,
      cashCollectedPaise: collectsCash ? order.totalPaise : null,
    },
    "Delivery confirmed by OTP",
  );

  const [serialized] = await serializeForRider([delivered]);
  res.json(serialized);
});

/**
 * A rider setting out with an order they were assigned. This exists because the
 * ops status endpoint refuses a rider outright, which left the rider screen's
 * only dispatch button calling a door it is not allowed through.
 */
router.post("/orders/:id/start", async (req, res) => {
  const rider = req.staff!;
  const id = String(req.params.id);

  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) throw notFound("That delivery is not on your list.");
  if (order.riderId !== rider.id && rider.role !== "ADMIN") {
    throw unauthorized("That delivery is assigned to another rider.");
  }
  if (order.status !== "PACKED") {
    throw conflict("Only a packed order can leave the counter.", "not_packed");
  }

  // Checking the assignment above is not enough: the desk can reassign the
  // order in the moment between that read and this write, and the old rider
  // would still take it out. Carry the ownership into the write itself.
  const ownedByCaller = rider.role === "ADMIN" ? undefined : eq(orders.riderId, rider.id);

  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(orders)
      .set({ status: "OUT_FOR_DELIVERY" })
      .where(and(eq(orders.id, id), eq(orders.status, "PACKED"), ownedByCaller))
      .returning();

    if (!row) {
      throw conflict(
        "This order is no longer yours to take out - it was reassigned or has already left the counter.",
        "stale_status",
      );
    }

    await recordOrderEvent(
      {
        orderId: id,
        fromStatus: "PACKED",
        toStatus: "OUT_FOR_DELIVERY",
        note: `Picked up by ${rider.fullName}`,
        actorType: "RIDER",
        actorId: rider.id,
      },
      tx,
    );

    return row;
  });

  const [serialized] = await serializeForRider([updated]);
  res.json(serialized);
});

router.post("/orders/:id/unreachable", async (req, res) => {
  const rider = req.staff!;
  const id = String(req.params.id);

  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) throw notFound("That delivery is not on your list.");
  if (order.riderId !== rider.id && rider.role !== "ADMIN") {
    throw unauthorized("That delivery is assigned to another rider.");
  }

  const [updated] = await db
    .update(orders)
    .set({ flaggedUnreachable: true })
    .where(eq(orders.id, id))
    .returning();

  await recordOrderEvent({
    orderId: id,
    fromStatus: order.status,
    toStatus: order.status,
    note: "Customer not reachable at the door",
    actorType: "RIDER",
    actorId: rider.id,
  });

  const [serialized] = await serializeForRider([updated!]);
  res.json(serialized);
});

export default router;
