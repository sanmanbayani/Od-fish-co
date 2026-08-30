import {
  AdminLoginBody,
  AssignRiderBody,
  CreateAdminSlotBody,
  CreatePincodeBody,
  CreateProductBody,
  CreateStaffBody,
  CreateVariantBody,
  SetAdminSlotOpenBody,
  UpdateAdminOrderStatusBody,
  UpdateAdminSlotBody,
  UpdateInventoryBody,
  UpdateProductBody,
  UpdateSettingsBody,
  UpdateStaffBody,
  UpdateVariantBody,
} from "@workspace/api-zod";
import {
  categories,
  customers,
  db,
  deliverySlots,
  orderItems,
  orders,
  productVariants,
  products,
  servicePincodes,
  staff,
} from "@workspace/db";
import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { loadProducts, serializeVariant } from "../lib/catalogue";
import { badRequest, conflict, forbidden, notFound, parseBody, unauthorized } from "../lib/http";
import { notifyOrderStatus } from "../lib/push";
import {
  canTransition,
  loadOrderBundles,
  ORDER_TRANSITIONS,
  recordOrderEvent,
  serializeAdminOrder,
  type OrderStatus,
} from "../lib/orders";
import { hashPassword, slugify, verifyPassword } from "../lib/security";
import {
  getStoreSettings,
  serializeSettings,
  updateStoreSettings,
} from "../lib/store";
import { addDays, istDateString, upcomingSlots } from "../lib/time";
import {
  clearStaffSession,
  issueStaffSession,
  requireStaff,
} from "../middlewares/auth";
import { restoreStock } from "./orders";

const router: IRouter = Router();

/** Rupees for an audit note: ₹1,861 - and ₹1,861.50 only when it matters. */
const rupeesOf = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

type StaffRow = typeof staff.$inferSelect;

function serializeStaff(row: StaffRow, deliveriesToday = 0) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    fullName: row.fullName,
    phone: row.phone,
    isActive: row.isActive,
    deliveriesToday,
  };
}

/* --------------------------------- auth ---------------------------------- */

router.post("/login", async (req, res) => {
  const body = parseBody(AdminLoginBody, req.body);
  const email = body.email.trim().toLowerCase();

  const [member] = await db
    .select()
    .from(staff)
    .where(eq(staff.email, email))
    .limit(1);

  if (!member || !member.isActive) {
    throw unauthorized("That email and password do not match an active account.");
  }

  const ok = await verifyPassword(body.password, member.passwordHash);
  if (!ok) {
    throw unauthorized("That email and password do not match an active account.");
  }

  const token = await issueStaffSession(res, member.id);
  res.json({ token, staff: serializeStaff(member) });
});

router.post("/logout", async (req, res) => {
  await clearStaffSession(req, res);
  res.json({ ok: true });
});

router.get("/me", requireStaff(), (req, res) => {
  res.json(serializeStaff(req.staff!));
});

/* Everything past this point is staff-only. Riders are deliberately excluded. */
const requireOps = requireStaff("ADMIN", "OPS");
const requireAdmin = requireStaff("ADMIN");

/* ------------------------------- dashboard -------------------------------- */

router.get("/dashboard", requireOps, async (_req, res) => {
  const settings = await getStoreSettings();
  const today = istDateString();
  const trendStart = addDays(today, -6);

  const [
    statusRows,
    todayRows,
    placedTodayRows,
    trendRows,
    lowStockRows,
    slotRows,
    activeOrderRows,
    cashRows,
  ] = await Promise.all([
    db
      .select({ status: orders.status, count: sql<number>`count(*)::int` })
      .from(orders)
      .groupBy(orders.status),
    db
      .select({
        count: sql<number>`count(*)::int`,
        revenue: sql<number>`coalesce(sum(${orders.totalPaise}), 0)::int`,
      })
      .from(orders)
      .where(
        and(
          gte(orders.deliveryDate, today),
          lte(orders.deliveryDate, today),
          sql`${orders.status} not in ('CANCELLED', 'FAILED')`,
        ),
      ),
    // What actually came in today, keyed on when the order was placed. That is
    // the question the owner is really asking; the delivery figures describe a
    // different day's work and the two are rarely the same number.
    db
      .select({
        count: sql<number>`count(*)::int`,
        revenue: sql<number>`coalesce(sum(${orders.totalPaise}), 0)::int`,
      })
      .from(orders)
      .where(
        and(
          sql`to_char(${orders.createdAt} at time zone 'Asia/Kolkata', 'YYYY-MM-DD') = ${today}`,
          sql`${orders.status} not in ('CANCELLED', 'FAILED')`,
        ),
      ),
    db
      .select({
        date: orders.deliveryDate,
        revenue: sql<number>`coalesce(sum(${orders.totalPaise}), 0)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(orders)
      .where(
        and(
          gte(orders.deliveryDate, trendStart),
          lte(orders.deliveryDate, today),
          sql`${orders.status} not in ('CANCELLED', 'FAILED')`,
        ),
      )
      .groupBy(orders.deliveryDate),
    db
      .select({ variant: productVariants, product: products, category: categories })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(
        and(
          eq(productVariants.isActive, true),
          sql`${productVariants.stockQty} <= ${productVariants.lowStockAt}`,
        ),
      )
      .orderBy(asc(productVariants.stockQty)),
    db
      .select()
      .from(deliverySlots)
      .where(eq(deliverySlots.isActive, true))
      .orderBy(asc(deliverySlots.sortOrder)),
    db
      .select()
      .from(orders)
      .where(sql`${orders.status} in ('PLACED', 'CONFIRMED', 'PACKED')`)
      .orderBy(asc(orders.createdAt))
      .limit(10),
    // Today's cash position. Collected is keyed on when the money changed
    // hands, not on the delivery date — an order placed today for tomorrow is
    // still cash the counter has to account for on the day it arrives.
    // Pending is keyed on the delivery date, because that is the run the money
    // is expected from.
    db
      .select({
        collected: sql<number>`coalesce(sum(${orders.cashCollectedPaise}) filter (
          where to_char(${orders.cashCollectedAt} at time zone 'Asia/Kolkata', 'YYYY-MM-DD') = ${today}
        ), 0)::int`,
        pending: sql<number>`coalesce(sum(${orders.totalPaise}) filter (
          where ${orders.deliveryDate} = ${today}
            and ${orders.paymentMethod} = 'COD'
            and ${orders.paymentStatus} <> 'PAID'
            and ${orders.status} not in ('CANCELLED', 'FAILED')
        ), 0)::int`,
      })
      .from(orders)
      .where(
        sql`${orders.deliveryDate} = ${today}
          or to_char(${orders.cashCollectedAt} at time zone 'Asia/Kolkata', 'YYYY-MM-DD') = ${today}`,
      ),
  ]);

  const needsActionBundles = await loadOrderBundles(activeOrderRows);
  const customerRows =
    activeOrderRows.length > 0
      ? await db
          .select()
          .from(customers)
          .where(inArray(customers.id, activeOrderRows.map((row) => row.customerId)))
      : [];
  const customerById = new Map(customerRows.map((row) => [row.id, row]));

  // The board lists the next few slot *instances*, and one slot definition
  // recurs across several days, so a count keyed by slot id alone would show
  // today's bookings against tomorrow's row. Key on the (slot, date) pair.
  //
  // Cancelled and failed orders are excluded to match what checkout counts when
  // it enforces capacity — otherwise the board disagrees with the door about
  // whether a slot is full.
  const slotWindow = upcomingSlots(slotRows, {
    storeOpen: settings.storeOpen,
    limit: 4,
  });
  const slotInstanceKey = (slotId: string, deliveryDate: string) =>
    `${slotId}|${deliveryDate}`;
  const slotDates = [...new Set(slotWindow.map((slot) => slot.deliveryDate))];
  const slotCounts = slotDates.length
    ? await db
        .select({
          slotId: orders.slotId,
          deliveryDate: orders.deliveryDate,
          count: sql<number>`count(*)::int`,
        })
        .from(orders)
        .where(
          and(
            inArray(orders.deliveryDate, slotDates),
            sql`${orders.status} NOT IN ('CANCELLED', 'FAILED')`,
          ),
        )
        .groupBy(orders.slotId, orders.deliveryDate)
    : [];
  const slotCountByInstance = new Map(
    slotCounts.flatMap((row) =>
      // An order whose slot definition was deleted keeps its delivery date but
      // loses the link, so it can never match an upcoming instance. Leaving it
      // out here is what keeps the map keys non-null.
      row.slotId
        ? ([[slotInstanceKey(row.slotId, row.deliveryDate), row.count]] as const)
        : [],
    ),
  );

  const statusBreakdown = statusRows.map((row) => ({
    status: row.status,
    count: row.count,
  }));

  const trendByDate = new Map(trendRows.map((row) => [row.date, row]));
  const revenueTrend = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(trendStart, index);
    const row = trendByDate.get(date);
    return {
      date,
      revenuePaise: row?.revenue ?? 0,
      orders: row?.count ?? 0,
    };
  });

  const ordersToday = todayRows[0]?.count ?? 0;
  const revenueTodayPaise = todayRows[0]?.revenue ?? 0;
  const ordersPlacedToday = placedTodayRows[0]?.count ?? 0;
  const revenuePlacedTodayPaise = placedTodayRows[0]?.revenue ?? 0;

  // Counted from the status breakdown rather than from the needs-action list,
  // which is capped at ten rows. On a busy morning that cap would quietly
  // under-report the backlog the tile exists to warn about.
  const backlogStatuses = new Set(["PLACED", "CONFIRMED", "PACKED"]);
  const pendingActionCount = statusRows
    .filter((row) => backlogStatuses.has(row.status))
    .reduce((sum, row) => sum + row.count, 0);
  const outForDeliveryCount =
    statusRows.find((row) => row.status === "OUT_FOR_DELIVERY")?.count ?? 0;

  res.json({
    storeOpen: settings.storeOpen,
    ordersToday,
    revenueTodayPaise,
    ordersPlacedToday,
    revenuePlacedTodayPaise,
    averageOrderValuePaise: ordersToday > 0 ? Math.round(revenueTodayPaise / ordersToday) : 0,
    pendingActionCount,
    lowStockCount: lowStockRows.length,
    outForDeliveryCount,
    cashCollectedTodayPaise: cashRows[0]?.collected ?? 0,
    cashPendingTodayPaise: cashRows[0]?.pending ?? 0,
    statusBreakdown,
    revenueTrend,
    needsAction: needsActionBundles.map((bundle) =>
      serializeAdminOrder(bundle, {
        fullName: customerById.get(bundle.order.customerId)?.fullName ?? null,
        phone: customerById.get(bundle.order.customerId)?.phone ?? "",
      }),
    ),
    lowStock: lowStockRows.slice(0, 12).map((row) => serializeInventoryRow(row)),
    slotLoad: slotWindow.map((slot) => ({
      slotId: slot.id,
      deliveryDate: slot.deliveryDate,
      label: slot.label,
      orders: slotCountByInstance.get(slotInstanceKey(slot.id, slot.deliveryDate)) ?? 0,
      capacity: slot.capacity,
    })),
  });
});

/* --------------------------------- orders --------------------------------- */

async function bundleWithCustomers(orderRows: (typeof orders.$inferSelect)[]) {
  const bundles = await loadOrderBundles(orderRows);
  if (bundles.length === 0) return [];

  const customerRows = await db
    .select()
    .from(customers)
    .where(inArray(customers.id, orderRows.map((row) => row.customerId)));
  const byId = new Map(customerRows.map((row) => [row.id, row]));

  return bundles.map((bundle) =>
    serializeAdminOrder(bundle, {
      fullName: byId.get(bundle.order.customerId)?.fullName ?? null,
      phone: byId.get(bundle.order.customerId)?.phone ?? "",
    }),
  );
}

router.get("/orders", requireOps, async (req, res) => {
  const filters = [];
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const deliveryDate =
    typeof req.query.deliveryDate === "string" ? req.query.deliveryDate : undefined;
  const slotId = typeof req.query.slotId === "string" ? req.query.slotId : undefined;
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

  if (status && status in ORDER_TRANSITIONS) {
    filters.push(eq(orders.status, status as OrderStatus));
  }
  if (deliveryDate) filters.push(eq(orders.deliveryDate, deliveryDate));
  if (slotId) filters.push(eq(orders.slotId, slotId));
  if (search) {
    const term = `%${search}%`;
    filters.push(
      or(
        ilike(orders.orderNumber, term),
        ilike(orders.receiverName, term),
        ilike(orders.receiverPhone, term),
        ilike(orders.area, term),
        ilike(orders.pincode, term),
      )!,
    );
  }

  const rows = await db
    .select()
    .from(orders)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(120);

  res.json(await bundleWithCustomers(rows));
});

router.get("/orders/:id", requireOps, async (req, res) => {
  const [row] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, String(req.params.id)))
    .limit(1);
  if (!row) throw notFound("That order does not exist.");

  const [serialized] = await bundleWithCustomers([row]);
  res.json(serialized);
});

router.post("/orders/:id/status", requireOps, async (req, res) => {
  const body = parseBody(UpdateAdminOrderStatusBody, req.body);
  const id = String(req.params.id);

  const [row] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!row) throw notFound("That order does not exist.");

  const next = body.status as OrderStatus;
  if (!canTransition(row.status, next)) {
    throw conflict(
      `An order that is ${row.status.toLowerCase().replaceAll("_", " ")} cannot move to ${next
        .toLowerCase()
        .replaceAll("_", " ")}.`,
      "illegal_transition",
    );
  }

  if (next === "OUT_FOR_DELIVERY" && !row.riderId) {
    throw badRequest("Assign a rider before sending this order out.", "rider_required");
  }

  // The customer's handover code is the proof that the order arrived, and on a
  // cash order it is also what puts the money on the books. Closing an order
  // from the desk skips both, so it stays possible - a rider's phone does die -
  // but only as a written exception, never as a button tapped out of habit.
  const overrideReason = body.overrideReason?.trim() ?? "";
  if (next === "DELIVERED" && overrideReason.length < 5) {
    throw badRequest(
      "Deliveries are completed on the rider's screen with the customer's handover code. To close this one from here, give a reason.",
      "handover_required",
    );
  }

  // Cash counts only when someone says it came in. A desk-closed cash order
  // with nothing confirmed stays unpaid, so the day's takings never gain money
  // that nobody is holding.
  const collectsCash = row.paymentMethod === "COD" && row.paymentStatus !== "PAID";
  const cashCameIn = collectsCash && body.cashCollected === true;


  // Two ops staff on the same order is normal in a busy kitchen. Pinning the
  // update to the status we validated means the second one is told to refresh
  // instead of silently overwriting the first, and stock is only ever restored
  // by the transition that actually happened.
  const updated = await db.transaction(async (tx) => {
    const [changed] = await tx
      .update(orders)
      .set({
        status: next,
        ...(next === "DELIVERED"
          ? {
              deliveredAt: new Date(),
              ...(collectsCash
                ? cashCameIn
                  ? {
                      paymentStatus: "PAID" as const,
                      // Server's own total, never a number the desk typed.
                      cashCollectedPaise: row.totalPaise,
                      cashCollectedAt: new Date(),
                    }
                  : {}
                : { paymentStatus: "PAID" as const }),
            }
          : {}),
        ...(next === "CANCELLED" ? { cancellationReason: body.note ?? "Cancelled by staff" } : {}),
      })
      .where(and(eq(orders.id, id), eq(orders.status, row.status)))
      .returning();

    if (!changed) {
      throw conflict(
        "Someone else just moved this order. Refresh to see its current status.",
        "stale_status",
      );
    }

    if (next === "CANCELLED" || next === "FAILED") {
      await restoreStock(id, tx);
    }

    await recordOrderEvent(
      {
        orderId: id,
        fromStatus: row.status,
        toStatus: next,
        note:
          next === "DELIVERED"
            ? `Closed at the desk without a handover code: ${overrideReason}` +
              (collectsCash
                ? cashCameIn
                  ? ` · ${rupeesOf(row.totalPaise)} cash collected`
                  : " · cash NOT collected, order still owing"
                : "")
            : (body.note ?? null),
        actorType: "STAFF",
        actorId: req.staff!.id,
      },
      tx,
    );

    return changed;
  });

  // Confirmed, packed, out for delivery, delivered: each one is news the
  // customer would otherwise have to open the app to find. Cancellations and
  // failures are deliberately left to the phone call that accompanies them.
  notifyOrderStatus(updated);

  const [serialized] = await bundleWithCustomers([updated]);
  res.json(serialized);
});

/**
 * Cash that turns up after the delivery closed - typically a desk-closed order
 * whose rider handed the notes over at the end of the shift. DELIVERED is a
 * terminal status, so without this the order would sit owing forever.
 */
router.post("/orders/:id/record-cash", requireOps, async (req, res) => {
  const id = String(req.params.id);

  const [row] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!row) throw notFound("That order does not exist.");
  if (row.status !== "DELIVERED") {
    throw conflict("Cash is banked once the order has been delivered.", "not_delivered");
  }
  if (row.paymentMethod !== "COD") {
    throw conflict("That order was not a cash order.", "not_cash_order");
  }
  if (row.paymentStatus === "PAID") {
    throw conflict("This order is already settled.", "already_paid");
  }

  const updated = await db.transaction(async (tx) => {
    // Pinned to the unpaid state so two people at the desk cannot bank the
    // same notes twice.
    const [changed] = await tx
      .update(orders)
      .set({
        paymentStatus: "PAID",
        cashCollectedPaise: row.totalPaise,
        cashCollectedAt: new Date(),
      })
      .where(
        and(
          eq(orders.id, id),
          eq(orders.status, "DELIVERED"),
          sql`${orders.paymentStatus} <> 'PAID'`,
        ),
      )
      .returning();

    if (!changed) {
      throw conflict("Someone else just banked this cash.", "already_paid");
    }

    await recordOrderEvent(
      {
        orderId: id,
        fromStatus: "DELIVERED",
        toStatus: "DELIVERED",
        note: `${rupeesOf(row.totalPaise)} cash banked at the desk`,
        actorType: "STAFF",
        actorId: req.staff!.id,
      },
      tx,
    );

    return changed;
  });

  const [serialized] = await bundleWithCustomers([updated]);
  res.json(serialized);
});

router.post("/orders/:id/assign-rider", requireOps, async (req, res) => {
  const body = parseBody(AssignRiderBody, req.body);
  const id = String(req.params.id);

  const [rider] = await db
    .select()
    .from(staff)
    .where(and(eq(staff.id, body.riderId), eq(staff.role, "RIDER")))
    .limit(1);
  if (!rider) throw notFound("That rider does not exist.");
  if (!rider.isActive) throw badRequest("That rider account is disabled.");

  const [updated] = await db
    .update(orders)
    .set({ riderId: rider.id, flaggedUnreachable: false })
    .where(eq(orders.id, id))
    .returning();
  if (!updated) throw notFound("That order does not exist.");

  await recordOrderEvent({
    orderId: id,
    fromStatus: updated.status,
    toStatus: updated.status,
    note: `Assigned to ${rider.fullName}`,
    actorType: "STAFF",
    actorId: req.staff!.id,
  });

  const [serialized] = await bundleWithCustomers([updated]);
  res.json(serialized);
});

/* -------------------------------- products -------------------------------- */

router.get("/products", requireOps, async (_req, res) => {
  res.json(await loadProducts({ includeInactive: true, limit: 500 }));
});

router.post("/products", requireOps, async (req, res) => {
  const body = parseBody(CreateProductBody, req.body);

  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, body.categoryId))
    .limit(1);
  if (!category) throw badRequest("Pick a category that exists.");

  const baseSlug = slugify(body.name);
  const [clash] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.slug, baseSlug))
    .limit(1);

  const [created] = await db
    .insert(products)
    .values({
      slug: clash ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug,
      name: body.name,
      nameLocal: body.nameLocal ?? null,
      shortDesc: body.shortDesc ?? null,
      longDesc: body.longDesc ?? null,
      origin: body.origin ?? null,
      bestFor: body.bestFor ?? [],
      imageUrls: body.imageUrls ?? [],
      categoryId: body.categoryId,
      isActive: body.isActive ?? true,
    })
    .returning();

  const [product] = await loadProducts({
    productSlug: created!.slug,
    includeInactive: true,
  });
  res.status(201).json(product);
});

router.patch("/products/:id", requireOps, async (req, res) => {
  const body = parseBody(UpdateProductBody, req.body);
  const id = String(req.params.id);

  const [updated] = await db
    .update(products)
    .set({
      ...(body.name === undefined ? {} : { name: body.name }),
      ...(body.nameLocal === undefined ? {} : { nameLocal: body.nameLocal }),
      ...(body.shortDesc === undefined ? {} : { shortDesc: body.shortDesc }),
      ...(body.longDesc === undefined ? {} : { longDesc: body.longDesc }),
      ...(body.origin === undefined ? {} : { origin: body.origin }),
      ...(body.bestFor === undefined ? {} : { bestFor: body.bestFor }),
      ...(body.imageUrls === undefined ? {} : { imageUrls: body.imageUrls }),
      ...(body.categoryId === undefined ? {} : { categoryId: body.categoryId }),
      ...(body.isActive === undefined ? {} : { isActive: body.isActive }),
    })
    .where(eq(products.id, id))
    .returning();

  if (!updated) throw notFound("That product does not exist.");

  const [product] = await loadProducts({
    productSlug: updated.slug,
    includeInactive: true,
  });
  res.json(product);
});

router.delete("/products/:id", requireOps, async (req, res) => {
  const [updated] = await db
    .update(products)
    .set({ isActive: false })
    .where(eq(products.id, String(req.params.id)))
    .returning();
  if (!updated) throw notFound("That product does not exist.");
  res.json({ ok: true });
});

router.post("/products/:id/variants", requireOps, async (req, res) => {
  const body = parseBody(CreateVariantBody, req.body);
  const productId = String(req.params.id);

  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  if (!product) throw notFound("That product does not exist.");

  const [created] = await db
    .insert(productVariants)
    .values({
      productId,
      sku: `${product.slug.toUpperCase().replaceAll("-", "")}-${slugify(body.packLabel).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
      cutType: body.cutType,
      soldBy: body.soldBy ?? "PACK",
      packLabel: body.packLabel,
      grossWeightG: body.grossWeightG ?? null,
      netWeightMinG: body.netWeightMinG ?? null,
      netWeightMaxG: body.netWeightMaxG ?? null,
      pieceCount: body.pieceCount ?? null,
      mrpPaise: body.mrpPaise,
      pricePaise: body.pricePaise,
      stockQty: body.stockQty ?? 0,
      lowStockAt: body.lowStockAt ?? 5,
      isActive: body.isActive ?? true,
    })
    .returning();

  res.status(201).json(serializeVariant(created!));
});

router.patch("/variants/:id", requireOps, async (req, res) => {
  const body = parseBody(UpdateVariantBody, req.body);

  const [updated] = await db
    .update(productVariants)
    .set({
      ...(body.cutType === undefined ? {} : { cutType: body.cutType }),
      ...(body.soldBy === undefined ? {} : { soldBy: body.soldBy }),
      ...(body.packLabel === undefined ? {} : { packLabel: body.packLabel }),
      ...(body.grossWeightG === undefined ? {} : { grossWeightG: body.grossWeightG }),
      ...(body.netWeightMinG === undefined ? {} : { netWeightMinG: body.netWeightMinG }),
      ...(body.netWeightMaxG === undefined ? {} : { netWeightMaxG: body.netWeightMaxG }),
      ...(body.pieceCount === undefined ? {} : { pieceCount: body.pieceCount }),
      ...(body.mrpPaise === undefined ? {} : { mrpPaise: body.mrpPaise }),
      ...(body.pricePaise === undefined ? {} : { pricePaise: body.pricePaise }),
      ...(body.stockQty === undefined ? {} : { stockQty: body.stockQty }),
      ...(body.lowStockAt === undefined ? {} : { lowStockAt: body.lowStockAt }),
      ...(body.isActive === undefined ? {} : { isActive: body.isActive }),
    })
    .where(eq(productVariants.id, String(req.params.id)))
    .returning();

  if (!updated) throw notFound("That pack does not exist.");
  res.json(serializeVariant(updated));
});

/**
 * Deleting a pack has to respect what has already been sold. `order_items`
 * points at a variant without a cascade, so removing a pack that has ever been
 * ordered would either fail on the constraint or destroy the record of what a
 * customer actually bought. Those are archived instead.
 *
 * A pack nobody has ordered — the mistyped one an admin created a minute ago —
 * is deleted outright, and its cart rows cascade away with it. Archiving that
 * one is what made the console feel broken: the pack the admin was trying to
 * get rid of stayed on the list for ever, just greyed out.
 */
router.delete("/variants/:id", requireOps, async (req, res) => {
  const id = String(req.params.id);

  const outcome = await db.transaction(async (tx) => {
    // The check and the delete have to be one indivisible step, or a checkout
    // landing between them turns "archive it" into a foreign-key crash.
    //
    // `FOR UPDATE` is what makes that safe. Inserting an order_items row takes
    // a KEY SHARE lock on the pack it references, and KEY SHARE conflicts with
    // FOR UPDATE — so a checkout already in flight must commit before this
    // transaction reads (and is then seen below, giving an archive), and one
    // arriving later must wait for this transaction to finish.
    const [variant] = await tx
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(eq(productVariants.id, id))
      .for("update");
    if (!variant) return null;

    const [ordered] = await tx
      .select({ id: orderItems.id })
      .from(orderItems)
      .where(eq(orderItems.variantId, id))
      .limit(1);

    if (ordered) {
      await tx
        .update(productVariants)
        .set({ isActive: false })
        .where(eq(productVariants.id, id));
      return { deleted: false };
    }

    await tx.delete(productVariants).where(eq(productVariants.id, id));
    return { deleted: true };
  });

  if (!outcome) throw notFound("That pack does not exist.");
  res.json({ ok: true, deleted: outcome.deleted });
});

/* ------------------------------- inventory -------------------------------- */

type InventoryJoin = {
  variant: typeof productVariants.$inferSelect;
  product: typeof products.$inferSelect;
  category: typeof categories.$inferSelect;
};

function serializeInventoryRow(row: InventoryJoin) {
  const stockState =
    row.variant.stockQty <= 0
      ? "OUT"
      : row.variant.stockQty <= row.variant.lowStockAt
        ? "LOW"
        : "OK";

  return {
    variantId: row.variant.id,
    productId: row.product.id,
    productName: row.product.name,
    productNameLocal: row.product.nameLocal,
    categoryName: row.category.name,
    cutType: row.variant.cutType,
    packLabel: row.variant.packLabel,
    sku: row.variant.sku,
    pricePaise: row.variant.pricePaise,
    mrpPaise: row.variant.mrpPaise,
    stockQty: row.variant.stockQty,
    lowStockAt: row.variant.lowStockAt,
    stockState,
    isActive: row.variant.isActive,
  };
}

async function loadInventory(variantIds?: string[]) {
  const rows = await db
    .select({ variant: productVariants, product: products, category: categories })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(variantIds ? inArray(productVariants.id, variantIds) : undefined)
    .orderBy(asc(categories.sortOrder), asc(products.name), asc(productVariants.sortOrder));

  return rows.map(serializeInventoryRow);
}

router.get("/inventory", requireOps, async (_req, res) => {
  res.json(await loadInventory());
});

router.patch("/inventory", requireOps, async (req, res) => {
  const body = parseBody(UpdateInventoryBody, req.body);
  if (body.updates.length === 0) throw badRequest("Nothing to update.");

  for (const update of body.updates) {
    await db
      .update(productVariants)
      .set({
        ...(update.stockQty === undefined ? {} : { stockQty: update.stockQty }),
        ...(update.pricePaise === undefined ? {} : { pricePaise: update.pricePaise }),
        ...(update.isActive === undefined ? {} : { isActive: update.isActive }),
      })
      .where(eq(productVariants.id, update.variantId));
  }

  req.log.info(
    { staffId: req.staff!.id, count: body.updates.length },
    "Inventory updated",
  );

  res.json(await loadInventory(body.updates.map((update) => update.variantId)));
});

/* --------------------------------- staff ---------------------------------- */

router.get("/staff", requireAdmin, async (_req, res) => {
  const today = istDateString();
  const [rows, deliveries] = await Promise.all([
    db.select().from(staff).orderBy(asc(staff.fullName)),
    db
      .select({ riderId: orders.riderId, count: sql<number>`count(*)::int` })
      .from(orders)
      .where(and(eq(orders.status, "DELIVERED"), eq(orders.deliveryDate, today)))
      .groupBy(orders.riderId),
  ]);

  const byRider = new Map(deliveries.map((row) => [row.riderId, row.count]));
  res.json(rows.map((row) => serializeStaff(row, byRider.get(row.id) ?? 0)));
});

router.post("/staff", requireAdmin, async (req, res) => {
  const body = parseBody(CreateStaffBody, req.body);
  const email = body.email.trim().toLowerCase();

  const [clash] = await db
    .select({ id: staff.id })
    .from(staff)
    .where(eq(staff.email, email))
    .limit(1);
  if (clash) throw conflict("Someone already uses that email address.", "email_taken");

  const [created] = await db
    .insert(staff)
    .values({
      email,
      passwordHash: await hashPassword(body.password),
      fullName: body.fullName,
      phone: body.phone ?? null,
      role: body.role,
    })
    .returning();

  res.status(201).json(serializeStaff(created!));
});

/**
 * Editing a staff account can lock the whole team out of the dashboard, and
 * there is no way back in from the app: switch off the only admin, or demote
 * yourself by accident, and administration is gone. Both invariants are
 * enforced here rather than in the browser, because the browser is not the only
 * thing that can call this.
 */
router.patch("/staff/:id", requireAdmin, async (req, res) => {
  const body = parseBody(UpdateStaffBody, req.body);
  const id = String(req.params.id);

  const updated = await db.transaction(async (tx) => {
    // Lock the active admins before reading them, always in the same order.
    // Two admins switching each other off at the same moment would otherwise
    // both see "there are two of us" and both succeed, leaving zero.
    const activeAdmins = await tx
      .select({ id: staff.id })
      .from(staff)
      .where(and(eq(staff.role, "ADMIN"), eq(staff.isActive, true)))
      .orderBy(asc(staff.id))
      .for("update");

    const [current] = await tx
      .select()
      .from(staff)
      .where(eq(staff.id, id))
      .limit(1)
      .for("update");
    if (!current) throw notFound("That staff account does not exist.");

    const beingSwitchedOff = body.isActive === false && current.isActive;
    const beingMoved = body.role !== undefined && body.role !== current.role;

    if (current.id === req.staff!.id && (beingSwitchedOff || beingMoved)) {
      throw forbidden(
        "You cannot change your own role or switch off your own account. Ask another admin to do it.",
      );
    }

    const givingUpTheLastAdminSeat =
      current.role === "ADMIN" &&
      current.isActive &&
      (beingSwitchedOff || (beingMoved && body.role !== "ADMIN"));

    if (givingUpTheLastAdminSeat && activeAdmins.length <= 1) {
      throw conflict(
        "This is the last active admin. Make someone else an admin first.",
        "last_admin",
      );
    }

    const [row] = await tx
      .update(staff)
      .set({
        ...(body.fullName === undefined ? {} : { fullName: body.fullName }),
        ...(body.phone === undefined ? {} : { phone: body.phone }),
        ...(body.role === undefined ? {} : { role: body.role }),
        ...(body.isActive === undefined ? {} : { isActive: body.isActive }),
        ...(body.password === undefined
          ? {}
          : { passwordHash: await hashPassword(body.password) }),
      })
      .where(eq(staff.id, id))
      .returning();

    return row!;
  });

  res.json(serializeStaff(updated));
});

/* ---------------------------------- slots --------------------------------- */

/**
 * A delivery window has to run forwards.
 *
 * Cutoff is deliberately *not* constrained against the window: an early slot
 * legitimately closes the previous evening — the 7 AM slot cuts off at 23:00 —
 * so a cutoff later than the start time is normal here, not a typo.
 */
function assertSlotWindow(startTime: string, endTime: string) {
  if (startTime >= endTime) {
    throw badRequest("A delivery slot has to end after it starts.", "invalid_slot_window");
  }
}

async function serializeAdminSlot(row: typeof deliverySlots.$inferSelect) {
  const today = istDateString();
  const [load] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(
      and(
        eq(orders.slotId, row.id),
        eq(orders.deliveryDate, today),
        sql`${orders.status} <> 'CANCELLED'`,
      ),
    );
  return {
    id: row.id,
    label: row.label,
    startTime: row.startTime,
    endTime: row.endTime,
    cutoffTime: row.cutoffTime,
    capacity: row.capacity,
    isOpen: row.isActive,
    sortOrder: row.sortOrder,
    ordersToday: load?.count ?? 0,
  };
}

router.get("/slots", requireOps, async (_req, res) => {
  const rows = await db.select().from(deliverySlots).orderBy(asc(deliverySlots.sortOrder));
  res.json(await Promise.all(rows.map(serializeAdminSlot)));
});

router.post("/slots", requireAdmin, async (req, res) => {
  const body = parseBody(CreateAdminSlotBody, req.body);
  assertSlotWindow(body.startTime, body.endTime);
  const [last] = await db
    .select({ sortOrder: deliverySlots.sortOrder })
    .from(deliverySlots)
    .orderBy(desc(deliverySlots.sortOrder))
    .limit(1);
  const [created] = await db
    .insert(deliverySlots)
    .values({
      label: body.label,
      startTime: body.startTime,
      endTime: body.endTime,
      cutoffTime: body.cutoffTime,
      capacity: body.capacity,
      isActive: body.isOpen ?? true,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    })
    .returning();
  res.status(201).json(await serializeAdminSlot(created!));
});

router.patch("/slots/:id", requireAdmin, async (req, res) => {
  const body = parseBody(UpdateAdminSlotBody, req.body);

  // Validate the window the slot will *end up* with, not just the fields in
  // this request — moving only the start time can still invert an otherwise
  // valid window. Read and write under one lock so two partial edits (one
  // raising the start, one lowering the end) cannot each validate against the
  // old row and then commit a combined window that runs backwards.
  const updated = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(deliverySlots)
      .where(eq(deliverySlots.id, String(req.params.id)))
      .for("update")
      .limit(1);
    if (!existing) throw notFound("That delivery slot does not exist.");
    assertSlotWindow(body.startTime ?? existing.startTime, body.endTime ?? existing.endTime);

    const [row] = await tx
      .update(deliverySlots)
      .set({
        ...(body.label === undefined ? {} : { label: body.label }),
        ...(body.startTime === undefined ? {} : { startTime: body.startTime }),
        ...(body.endTime === undefined ? {} : { endTime: body.endTime }),
        ...(body.cutoffTime === undefined ? {} : { cutoffTime: body.cutoffTime }),
        ...(body.capacity === undefined ? {} : { capacity: body.capacity }),
        ...(body.isOpen === undefined ? {} : { isActive: body.isOpen }),
      })
      .where(eq(deliverySlots.id, String(req.params.id)))
      .returning();
    return row;
  });
  if (!updated) throw notFound("That delivery slot does not exist.");
  res.json(await serializeAdminSlot(updated));
});

router.post("/slots/:id/open", requireAdmin, async (req, res) => {
  const body = parseBody(SetAdminSlotOpenBody, req.body);
  const [updated] = await db
    .update(deliverySlots)
    .set({ isActive: body.isOpen })
    .where(eq(deliverySlots.id, String(req.params.id)))
    .returning();
  if (!updated) throw notFound("That delivery slot does not exist.");
  res.json(await serializeAdminSlot(updated));
});

/* -------------------------------- settings -------------------------------- */

router.get("/settings", requireOps, async (_req, res) => {
  res.json(serializeSettings(await getStoreSettings()));
});

router.patch("/settings", requireAdmin, async (req, res) => {
  const body = parseBody(UpdateSettingsBody, req.body);
  const updated = await updateStoreSettings({
    ...(body.storeOpen === undefined ? {} : { storeOpen: body.storeOpen }),
    ...(body.codEnabled === undefined ? {} : { codEnabled: body.codEnabled }),
    ...(body.deliveryFeePaise === undefined ? {} : { deliveryFeePaise: body.deliveryFeePaise }),
    ...(body.freeDeliveryThresholdPaise === undefined
      ? {}
      : { freeDeliveryThresholdPaise: body.freeDeliveryThresholdPaise }),
    ...(body.handlingFeePaise === undefined ? {} : { handlingFeePaise: body.handlingFeePaise }),
    ...(body.codMaxOrderPaise === undefined ? {} : { codMaxOrderPaise: body.codMaxOrderPaise }),
    ...(body.supportPhone === undefined ? {} : { supportPhone: body.supportPhone }),
    ...(body.supportWhatsapp === undefined ? {} : { supportWhatsapp: body.supportWhatsapp }),
    ...(body.fssaiLicenseNo === undefined ? {} : { fssaiLicenseNo: body.fssaiLicenseNo }),
  });
  res.json(serializeSettings(updated));
});

/* -------------------------------- pincodes -------------------------------- */

router.get("/pincodes", requireOps, async (_req, res) => {
  const rows = await db
    .select()
    .from(servicePincodes)
    .orderBy(asc(servicePincodes.areaName));
  res.json(rows);
});

router.post("/pincodes", requireAdmin, async (req, res) => {
  const body = parseBody(CreatePincodeBody, req.body);
  const [created] = await db
    .insert(servicePincodes)
    .values({
      pincode: body.pincode,
      areaName: body.areaName,
      codEnabled: body.codEnabled ?? true,
    })
    .onConflictDoUpdate({
      target: servicePincodes.pincode,
      set: {
        areaName: body.areaName,
        codEnabled: body.codEnabled ?? true,
        isActive: true,
      },
    })
    .returning();

  res.status(201).json(created);
});

router.delete("/pincodes/:pincode", requireAdmin, async (req, res) => {
  const [updated] = await db
    .update(servicePincodes)
    .set({ isActive: false })
    .where(eq(servicePincodes.pincode, String(req.params.pincode)))
    .returning();
  if (!updated) throw notFound("That pincode is not in the service list.");
  res.json({ ok: true });
});

export default router;
