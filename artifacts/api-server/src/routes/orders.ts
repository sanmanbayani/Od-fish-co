import { CancelOrderBody, CreateOrderBody, PayOrderBody } from "@workspace/api-zod";
import {
  addresses,
  cartItems,
  db,
  deliverySlots,
  orderItems,
  orders,
  productVariants,
  products,
  servicePincodes,
} from "@workspace/db";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { IS_DEVELOPMENT, PAYMENTS_MOCK_ENABLED } from "../lib/env";
import { badRequest, conflict, notFound, notImplemented, parseBody } from "../lib/http";
import {
  customerCanCancel,
  type Executor,
  loadOrderBundles,
  recordOrderEvent,
  serializeCustomerOrder,
} from "../lib/orders";
import { notifyOrderStatus } from "../lib/push";
import { newOrderNumber, numericCode } from "../lib/security";
import { computeBill, getStoreSettings } from "../lib/store";
import { istDateString, upcomingSlots } from "../lib/time";
import { requireCustomer } from "../middlewares/auth";
import { buildCart, MAX_LINE_QUANTITY } from "./cart";

const router: IRouter = Router();

router.use(requireCustomer);

router.get("/", async (req, res) => {
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.customerId, req.customer!.id))
    .orderBy(desc(orders.createdAt))
    .limit(50);

  const bundles = await loadOrderBundles(rows);
  res.json(bundles.map(serializeCustomerOrder));
});

router.post("/", async (req, res) => {
  const body = parseBody(CreateOrderBody, req.body);
  const customer = req.customer!;
  const settings = await getStoreSettings();

  if (!settings.storeOpen) {
    throw conflict("The store is closed right now. Please try again shortly.", "store_closed");
  }

  const [address] = await db
    .select()
    .from(addresses)
    .where(and(eq(addresses.id, body.addressId), eq(addresses.customerId, customer.id)))
    .limit(1);

  if (!address) throw notFound("Choose a delivery address saved to your account.");

  const [area] = await db
    .select()
    .from(servicePincodes)
    .where(
      and(
        eq(servicePincodes.pincode, address.pincode),
        eq(servicePincodes.isActive, true),
      ),
    )
    .limit(1);

  if (!area) {
    throw badRequest(
      `We do not deliver to ${address.pincode} yet. Pick another address or join the waitlist.`,
      "not_serviceable",
    );
  }

  const slotRows = await db
    .select()
    .from(deliverySlots)
    .where(eq(deliverySlots.isActive, true))
    .orderBy(asc(deliverySlots.sortOrder));

  // Match on the date as well as the id. `upcomingSlots` expands each slot
  // definition across the next few days, so several candidates share one id and
  // matching by id alone silently returns the earliest — scheduling a delivery
  // the customer never asked for, and counting its capacity against the wrong
  // day.
  const slot = upcomingSlots(slotRows, { storeOpen: settings.storeOpen }).find(
    (candidate) =>
      candidate.id === body.slotId &&
      candidate.deliveryDate === body.deliveryDate,
  );

  if (!slot) {
    throw conflict(
      "That delivery slot just closed. Please pick another one.",
      "slot_closed",
    );
  }

  const cart = await buildCart(customer.id);
  if (cart.items.length === 0) {
    throw badRequest("Your basket is empty.", "empty_cart");
  }

  if (body.paymentMethod === "COD") {
    if (!settings.codEnabled || !area.codEnabled) {
      throw badRequest("Cash on delivery is not available for this address.", "cod_unavailable");
    }
    if (cart.bill.totalPaise > settings.codMaxOrderPaise) {
      throw badRequest(
        "This order is above the cash-on-delivery limit. Please pay online.",
        "cod_limit",
      );
    }
  }

  const bill = computeBill(cart.items, settings);
  const isPrepaid = body.paymentMethod !== "COD";
  const deliveryOtp = numericCode(4);

  const created = await db.transaction(async (tx) => {
    // Consume the basket first, and make that the point everything serialises
    // on. A double-tap on "Place order" (or a retried request) sends two
    // concurrent transactions; only one can delete these rows, so only one can
    // create an order. The loser is told the order already went through instead
    // of quietly charging the customer twice.
    const consumed = await tx
      .delete(cartItems)
      .where(eq(cartItems.customerId, customer.id))
      .returning({ variantId: cartItems.variantId, quantity: cartItems.quantity });

    if (consumed.length === 0) {
      throw conflict(
        "This basket has already been placed. Check your orders before trying again.",
        "already_placed",
      );
    }

    // The basket may also have changed between pricing it and locking it. Bail
    // rather than bill someone for a total we no longer stand behind.
    const pricedQty = new Map(cart.items.map((item) => [item.variantId, item.quantity]));
    const changed =
      consumed.length !== pricedQty.size ||
      consumed.some((row) => pricedQty.get(row.variantId) !== row.quantity);

    if (changed) {
      throw conflict(
        "Your basket changed while you were checking out. Please review it and try again.",
        "cart_changed",
      );
    }

    // Slot capacity is a real operational limit, not a display figure: there
    // are only so many fish the counter can cut, pack and dispatch in one
    // window. Lock the slot row so two checkouts racing for its last place
    // serialise here instead of both reading the same free space and both
    // being accepted.
    const [lockedSlot] = await tx
      .select({ capacity: deliverySlots.capacity })
      .from(deliverySlots)
      .where(eq(deliverySlots.id, slot.id))
      .for("update");

    if (!lockedSlot) {
      throw conflict("That delivery slot just closed. Please pick another one.", "slot_closed");
    }

    const [booked] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(
        and(
          eq(orders.slotId, slot.id),
          eq(orders.deliveryDate, slot.deliveryDate),
          // A cancelled or failed order has already given its stock back, so it
          // must give its place in the van back too — otherwise an abandoned
          // card payment silently costs the slot a delivery for the rest of the
          // day.
          sql`${orders.status} NOT IN ('CANCELLED', 'FAILED')`,
        ),
      );

    if ((booked?.count ?? 0) >= lockedSlot.capacity) {
      throw conflict(
        "That delivery slot is fully booked. Please pick another one.",
        "slot_full",
      );
    }

    // Take the stock next: if two people race for the last pack, the loser
    // finds out here rather than at the door.
    for (const item of cart.items) {
      const claimed = await tx
        .update(productVariants)
        .set({ stockQty: sql`${productVariants.stockQty} - ${item.quantity}` })
        .where(
          and(
            eq(productVariants.id, item.variantId),
            sql`${productVariants.stockQty} >= ${item.quantity}`,
          ),
        )
        .returning({ id: productVariants.id });

      if (claimed.length === 0) {
        throw conflict(
          `${item.productName} sold out while you were checking out. Please review your basket.`,
          "out_of_stock",
        );
      }
    }

    const [order] = await tx
      .insert(orders)
      .values({
        orderNumber: newOrderNumber(istDateString()),
        customerId: customer.id,
        status: isPrepaid ? "PENDING_PAYMENT" : "PLACED",
        paymentMethod: body.paymentMethod,
        paymentStatus: "PENDING",
        addressLabel: address.label,
        receiverName: address.receiverName,
        receiverPhone: address.receiverPhone,
        line1: address.line1,
        line2: address.line2,
        area: address.area,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        slotId: slot.id,
        slotLabel: slot.label,
        deliveryDate: slot.deliveryDate,
        subtotalPaise: bill.subtotalPaise,
        deliveryFeePaise: bill.deliveryFeePaise,
        handlingFeePaise: bill.handlingFeePaise,
        discountPaise: bill.discountPaise,
        totalPaise: bill.totalPaise,
        deliveryOtp,
        customerNote: body.customerNote ?? null,
      })
      .returning();

    if (!order) throw new Error("Order insert returned no row");

    await tx.insert(orderItems).values(
      cart.items.map((item) => ({
        orderId: order.id,
        variantId: item.variantId,
        productName: item.productName,
        productNameLocal: item.productNameLocal,
        cutType: item.cutType,
        packLabel: item.packLabel,
        imageUrl: item.imageUrl,
        grossWeightG: null,
        unitPricePaise: item.unitPricePaise,
        quantity: item.quantity,
        lineTotalPaise: item.lineTotalPaise,
      })),
    );

    return order;
  });

  await recordOrderEvent({
    orderId: created.id,
    fromStatus: null,
    toStatus: created.status,
    note: isPrepaid ? "Awaiting online payment" : "Placed with cash on delivery",
    actorType: "CUSTOMER",
    actorId: customer.id,
  });

  // A cash order is live the moment it is placed, so it is worth a push. A
  // prepaid one is still PENDING_PAYMENT here and gets its notification when
  // the payment settles.
  notifyOrderStatus(created);

  const [bundle] = await loadOrderBundles([created]);
  res.status(201).json(serializeCustomerOrder(bundle!));
});

async function loadOwnOrder(customerId: string, orderId: string) {
  const [row] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.customerId, customerId)))
    .limit(1);
  if (!row) throw notFound("We could not find that order.");
  return row;
}

router.get("/:id", async (req, res) => {
  const order = await loadOwnOrder(req.customer!.id, String(req.params.id));
  const [bundle] = await loadOrderBundles([order]);
  res.json(serializeCustomerOrder(bundle!));
});

/**
 * Test-mode settlement.
 *
 * A real gateway tells US the payment succeeded, over a signed server-to-server
 * webhook. It is never the buyer's word. Until that gateway is wired (blocked on
 * KYC) this endpoint stands in for it.
 *
 * It is therefore available only in development, or on an environment that has
 * deliberately set `PAYMENTS_MOCK=true` for a demo. Anywhere else a customer
 * marking their own order paid is a free checkout, so we refuse rather than
 * degrade.
 */
router.post("/:id/pay", async (req, res) => {
  if (!IS_DEVELOPMENT && !PAYMENTS_MOCK_ENABLED) {
    throw notImplemented(
      "Online payment is not switched on yet. Please choose cash on delivery.",
      "gateway_not_configured",
    );
  }

  const body = parseBody(PayOrderBody, req.body);
  const order = await loadOwnOrder(req.customer!.id, String(req.params.id));

  if (order.status !== "PENDING_PAYMENT") {
    throw conflict("This order is not waiting for payment.", "not_payable");
  }

  const succeeded = body.outcome === "SUCCESS";

  const updated = await db.transaction(async (tx) => {
    // Conditional update: whoever gets there first wins, a second concurrent
    // call finds no row and is told the order already moved on.
    const [row] = await tx
      .update(orders)
      .set({
        status: succeeded ? "PLACED" : "FAILED",
        paymentStatus: succeeded ? "PAID" : "FAILED",
        paymentReference: body.reference ?? null,
      })
      .where(and(eq(orders.id, order.id), eq(orders.status, "PENDING_PAYMENT")))
      .returning();

    if (!row) {
      throw conflict("This order is not waiting for payment.", "not_payable");
    }

    if (!succeeded) {
      await restoreStock(order.id, tx);
    }

    await recordOrderEvent(
      {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: succeeded ? "PLACED" : "FAILED",
        note: succeeded
          ? `Payment received via ${order.paymentMethod} (test mode)`
          : "Online payment did not go through",
        actorType: "CUSTOMER",
        actorId: req.customer!.id,
      },
      tx,
    );

    return row;
  });

  // Only a successful settlement is worth a message: the order has just become
  // real. A failed one is already on the screen the customer is looking at.
  notifyOrderStatus(updated);

  const [bundle] = await loadOrderBundles([updated]);
  res.json(serializeCustomerOrder(bundle!));
});

router.post("/:id/cancel", async (req, res) => {
  const body = parseBody(CancelOrderBody, req.body);
  const order = await loadOwnOrder(req.customer!.id, String(req.params.id));

  if (!customerCanCancel(order.status)) {
    throw conflict(
      "This order is already being prepared and can no longer be cancelled online. Call support and we will help.",
      "not_cancellable",
    );
  }

  const updated = await db.transaction(async (tx) => {
    // Pin the update to the status we validated. A double-tap on Cancel would
    // otherwise restore the stock twice and invent inventory we do not have.
    const [row] = await tx
      .update(orders)
      .set({
        status: "CANCELLED",
        cancellationReason: body.reason,
        paymentStatus: order.paymentStatus === "PAID" ? "REFUNDED" : order.paymentStatus,
      })
      .where(and(eq(orders.id, order.id), eq(orders.status, order.status)))
      .returning();

    if (!row) {
      throw conflict(
        "This order just changed status. Refresh to see where it is now.",
        "not_cancellable",
      );
    }

    await restoreStock(order.id, tx);
    await recordOrderEvent(
      {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: "CANCELLED",
        note: body.reason,
        actorType: "CUSTOMER",
        actorId: req.customer!.id,
      },
      tx,
    );

    return row;
  });

  const [bundle] = await loadOrderBundles([updated]);
  res.json(serializeCustomerOrder(bundle!));
});

router.post("/:id/reorder", async (req, res) => {
  const customerId = req.customer!.id;
  const order = await loadOwnOrder(customerId, String(req.params.id));

  const previous = await db
    .select({ item: orderItems, variant: productVariants, product: products })
    .from(orderItems)
    .innerJoin(productVariants, eq(orderItems.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(eq(orderItems.orderId, order.id));

  for (const row of previous) {
    if (!row.variant.isActive || !row.product.isActive || row.variant.stockQty <= 0) {
      continue;
    }
    const quantity = Math.min(
      row.item.quantity,
      row.variant.stockQty,
      MAX_LINE_QUANTITY,
    );
    await db
      .insert(cartItems)
      .values({ customerId, variantId: row.variant.id, quantity })
      .onConflictDoUpdate({
        target: [cartItems.customerId, cartItems.variantId],
        set: { quantity },
      });
  }

  res.json(await buildCart(customerId));
});

/**
 * Put reserved stock back when an order never reaches the customer.
 *
 * Always call this inside the same transaction as the status change that caused
 * it. If the terminal status commits and the restore then fails, the state
 * machine will reject every retry and that stock is stranded for good — the
 * fish exists, but the shop will never sell it.
 */
export async function restoreStock(orderId: string, tx: Executor = db): Promise<void> {
  const items = await tx
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  for (const item of items) {
    if (!item.variantId) continue;
    await tx
      .update(productVariants)
      .set({ stockQty: sql`${productVariants.stockQty} + ${item.quantity}` })
      .where(eq(productVariants.id, item.variantId));
  }
}

export default router;
