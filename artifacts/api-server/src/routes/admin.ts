import {
  AdminLoginBody,
  AssignRiderBody,
  CreatePincodeBody,
  CreateProductBody,
  CreateStaffBody,
  CreateVariantBody,
  UpdateAdminOrderStatusBody,
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
import { badRequest, conflict, notFound, parseBody, unauthorized } from "../lib/http";
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
    trendRows,
    lowStockRows,
    slotRows,
    activeOrderRows,
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
      .orderBy(asc(productVariants.stockQty))
      .limit(12),
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

  const slotCounts = await db
    .select({ slotId: orders.slotId, count: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(eq(orders.deliveryDate, today), sql`${orders.status} <> 'CANCELLED'`))
    .groupBy(orders.slotId);
  const slotCountById = new Map(slotCounts.map((row) => [row.slotId, row.count]));

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
  const outForDeliveryCount =
    statusRows.find((row) => row.status === "OUT_FOR_DELIVERY")?.count ?? 0;

  res.json({
    storeOpen: settings.storeOpen,
    ordersToday,
    revenueTodayPaise,
    averageOrderValuePaise: ordersToday > 0 ? Math.round(revenueTodayPaise / ordersToday) : 0,
    pendingActionCount: activeOrderRows.length,
    lowStockCount: lowStockRows.length,
    outForDeliveryCount,
    statusBreakdown,
    revenueTrend,
    needsAction: needsActionBundles.map((bundle) =>
      serializeAdminOrder(bundle, {
        fullName: customerById.get(bundle.order.customerId)?.fullName ?? null,
        phone: customerById.get(bundle.order.customerId)?.phone ?? "",
      }),
    ),
    lowStock: lowStockRows.map((row) => serializeInventoryRow(row)),
    slotLoad: upcomingSlots(slotRows, { storeOpen: settings.storeOpen, limit: 4 }).map(
      (slot) => ({
        slotId: slot.id,
        label: slot.label,
        orders: slotCountById.get(slot.id) ?? 0,
        capacity: slot.capacity,
      }),
    ),
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
              paymentStatus: "PAID" as const,
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
        note: body.note ?? null,
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

router.delete("/variants/:id", requireOps, async (req, res) => {
  const [updated] = await db
    .update(productVariants)
    .set({ isActive: false })
    .where(eq(productVariants.id, String(req.params.id)))
    .returning();
  if (!updated) throw notFound("That pack does not exist.");
  res.json({ ok: true });
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

router.patch("/staff/:id", requireAdmin, async (req, res) => {
  const body = parseBody(UpdateStaffBody, req.body);

  const [updated] = await db
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
    .where(eq(staff.id, String(req.params.id)))
    .returning();

  if (!updated) throw notFound("That staff account does not exist.");
  res.json(serializeStaff(updated));
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
