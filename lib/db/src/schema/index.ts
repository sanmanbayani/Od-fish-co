import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------- */
/*                                   Enums                                    */
/* -------------------------------------------------------------------------- */

export const soldByEnum = pgEnum("sold_by", ["PACK", "PIECE"]);

export const orderStatusEnum = pgEnum("order_status", [
  "PENDING_PAYMENT",
  "PLACED",
  "CONFIRMED",
  "PACKED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "FAILED",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "COD",
  "UPI",
  "CARD",
  "NETBANKING",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
]);

export const staffRoleEnum = pgEnum("staff_role", ["ADMIN", "OPS", "RIDER"]);

export const actorTypeEnum = pgEnum("actor_type", [
  "CUSTOMER",
  "STAFF",
  "RIDER",
  "SYSTEM",
]);

/* -------------------------------------------------------------------------- */
/*                                 Customers                                  */
/* -------------------------------------------------------------------------- */

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: varchar("phone", { length: 10 }).notNull().unique(),
  fullName: text("full_name"),
  email: text("email"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Short-lived login challenges. The code is stored in plain text because it is
 * a 6-digit throwaway that expires in minutes; the row is deleted on use.
 */
export const otpChallenges = pgTable(
  "otp_challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: varchar("phone", { length: 10 }).notNull(),
    code: varchar("code", { length: 6 }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("otp_challenges_phone_idx").on(table.phone)],
);

export const customerSessions = pgTable(
  "customer_sessions",
  {
    token: text("token").primaryKey(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("customer_sessions_customer_idx").on(table.customerId)],
);

/**
 * Where a customer's order updates are pushed.
 *
 * One row per install, keyed by the Expo push token because that is what the
 * push service addresses. The same phone can be signed into a different
 * account tomorrow, so the token — not the customer — is unique: re-registering
 * moves it, it never fans a stranger's notifications out to an old owner.
 */
export const pushDevices = pgTable(
  "push_devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    platform: varchar("platform", { length: 16 }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("push_devices_customer_idx").on(table.customerId)],
);

export const addresses = pgTable(
  "addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    label: text("label"),
    receiverName: text("receiver_name").notNull(),
    receiverPhone: varchar("receiver_phone", { length: 10 }).notNull(),
    line1: text("line1").notNull(),
    line2: text("line2"),
    area: text("area").notNull(),
    city: text("city").notNull().default("Mumbai"),
    state: text("state").notNull().default("Maharashtra"),
    pincode: varchar("pincode", { length: 6 }).notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("addresses_customer_idx").on(table.customerId)],
);

/* -------------------------------------------------------------------------- */
/*                                 Catalogue                                  */
/* -------------------------------------------------------------------------- */

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  nameLocal: text("name_local"),
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    nameLocal: text("name_local"),
    shortDesc: text("short_desc"),
    longDesc: text("long_desc"),
    origin: text("origin"),
    bestFor: text("best_for")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    imageUrls: text("image_urls")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    isActive: boolean("is_active").notNull().default(true),
    isFeatured: boolean("is_featured").notNull().default(false),
    isTodaysCatch: boolean("is_todays_catch").notNull().default(false),
    popularity: integer("popularity").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("products_category_idx").on(table.categoryId)],
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text("sku").notNull().unique(),
    cutType: text("cut_type").notNull(),
    soldBy: soldByEnum("sold_by").notNull().default("PACK"),
    packLabel: text("pack_label").notNull(),
    grossWeightG: integer("gross_weight_g"),
    netWeightMinG: integer("net_weight_min_g"),
    netWeightMaxG: integer("net_weight_max_g"),
    pieceCount: integer("piece_count"),
    mrpPaise: integer("mrp_paise").notNull(),
    pricePaise: integer("price_paise").notNull(),
    stockQty: integer("stock_qty").notNull().default(0),
    lowStockAt: integer("low_stock_at").notNull().default(5),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("product_variants_product_idx").on(table.productId)],
);

/* -------------------------------------------------------------------------- */
/*                            Delivery & service area                         */
/* -------------------------------------------------------------------------- */

export const deliverySlots = pgTable("delivery_slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  label: text("label").notNull(),
  /** HH:MM in IST */
  startTime: varchar("start_time", { length: 5 }).notNull(),
  endTime: varchar("end_time", { length: 5 }).notNull(),
  cutoffTime: varchar("cutoff_time", { length: 5 }).notNull(),
  capacity: integer("capacity").notNull().default(40),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const servicePincodes = pgTable("service_pincodes", {
  pincode: varchar("pincode", { length: 6 }).primaryKey(),
  areaName: text("area_name").notNull(),
  codEnabled: boolean("cod_enabled").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
});

export const waitlistEntries = pgTable("waitlist_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  pincode: varchar("pincode", { length: 6 }).notNull(),
  phone: varchar("phone", { length: 10 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Emails captured by the "app launching soon" call to action on the website.
 * Kept apart from `waitlist_entries` on purpose: that table answers "we do not
 * deliver to your pincode yet", this one answers "tell me when the app ships".
 */
export const appWaitlistEntries = pgTable("app_waitlist_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 254 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* -------------------------------------------------------------------------- */
/*                                    Cart                                    */
/* -------------------------------------------------------------------------- */

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("cart_items_customer_variant_key").on(
      table.customerId,
      table.variantId,
    ),
  ],
);

/* -------------------------------------------------------------------------- */
/*                                   Staff                                    */
/* -------------------------------------------------------------------------- */

export const staff = pgTable("staff", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  phone: varchar("phone", { length: 10 }),
  role: staffRoleEnum("role").notNull().default("OPS"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const staffSessions = pgTable(
  "staff_sessions",
  {
    token: text("token").primaryKey(),
    staffId: uuid("staff_id")
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("staff_sessions_staff_idx").on(table.staffId)],
);

/* -------------------------------------------------------------------------- */
/*                                   Orders                                   */
/* -------------------------------------------------------------------------- */

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderNumber: text("order_number").notNull().unique(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    status: orderStatusEnum("status").notNull().default("PLACED"),
    paymentMethod: paymentMethodEnum("payment_method").notNull(),
    paymentStatus: paymentStatusEnum("payment_status")
      .notNull()
      .default("PENDING"),
    paymentReference: text("payment_reference"),

    /**
     * Cash-on-delivery reconciliation. Written once, at the door, when the
     * rider confirms the handover — never by the customer and never at
     * checkout. Null on a prepaid order, and null on a cash order that has
     * not been delivered yet.
     */
    cashCollectedPaise: integer("cash_collected_paise"),
    cashCollectedAt: timestamp("cash_collected_at", { withTimezone: true }),

    // Address snapshot: the order must not change when the address record does.
    addressLabel: text("address_label"),
    receiverName: text("receiver_name").notNull(),
    receiverPhone: varchar("receiver_phone", { length: 10 }).notNull(),
    line1: text("line1").notNull(),
    line2: text("line2"),
    area: text("area").notNull(),
    city: text("city").notNull(),
    state: text("state"),
    pincode: varchar("pincode", { length: 6 }).notNull(),

    slotId: uuid("slot_id").references(() => deliverySlots.id),
    slotLabel: text("slot_label").notNull(),
    /** YYYY-MM-DD in IST */
    deliveryDate: varchar("delivery_date", { length: 10 }).notNull(),

    subtotalPaise: integer("subtotal_paise").notNull(),
    deliveryFeePaise: integer("delivery_fee_paise").notNull().default(0),
    handlingFeePaise: integer("handling_fee_paise").notNull().default(0),
    discountPaise: integer("discount_paise").notNull().default(0),
    totalPaise: integer("total_paise").notNull(),

    deliveryOtp: varchar("delivery_otp", { length: 4 }).notNull(),
    otpAttempts: integer("otp_attempts").notNull().default(0),

    riderId: uuid("rider_id").references(() => staff.id),
    customerNote: text("customer_note"),
    cancellationReason: text("cancellation_reason"),
    flaggedUnreachable: boolean("flagged_unreachable").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  },
  (table) => [
    index("orders_customer_idx").on(table.customerId),
    index("orders_status_idx").on(table.status),
    index("orders_rider_idx").on(table.riderId),
    index("orders_created_idx").on(table.createdAt),
    // Checkout counts a slot's bookings while holding a lock on that slot row,
    // so this count sits directly in the path of every order placed.
    index("orders_slot_date_idx").on(table.slotId, table.deliveryDate),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => productVariants.id),
    productName: text("product_name").notNull(),
    productNameLocal: text("product_name_local"),
    cutType: text("cut_type").notNull(),
    packLabel: text("pack_label").notNull(),
    imageUrl: text("image_url"),
    grossWeightG: integer("gross_weight_g"),
    unitPricePaise: integer("unit_price_paise").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotalPaise: integer("line_total_paise").notNull(),
  },
  (table) => [index("order_items_order_idx").on(table.orderId)],
);

export const orderEvents = pgTable(
  "order_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    note: text("note"),
    actorType: actorTypeEnum("actor_type").notNull().default("SYSTEM"),
    actorId: uuid("actor_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("order_events_order_idx").on(table.orderId)],
);

/* -------------------------------------------------------------------------- */
/*                              Store settings                                */
/* -------------------------------------------------------------------------- */

export const storeSettings = pgTable("store_settings", {
  id: integer("id").primaryKey().default(1),
  storeOpen: boolean("store_open").notNull().default(true),
  codEnabled: boolean("cod_enabled").notNull().default(true),
  deliveryFeePaise: integer("delivery_fee_paise").notNull().default(3900),
  freeDeliveryThresholdPaise: integer("free_delivery_threshold_paise")
    .notNull()
    .default(69900),
  handlingFeePaise: integer("handling_fee_paise").notNull().default(1500),
  codMaxOrderPaise: integer("cod_max_order_paise").notNull().default(500000),
  supportPhone: text("support_phone").notNull().default("+912249601234"),
  supportWhatsapp: text("support_whatsapp"),
  fssaiLicenseNo: text("fssai_license_no").notNull().default("11524998000123"),
});

/* -------------------------------------------------------------------------- */
/*                                 Relations                                  */
/* -------------------------------------------------------------------------- */

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  variants: many(productVariants),
}));

export const productVariantsRelations = relations(
  productVariants,
  ({ one }) => ({
    product: one(products, {
      fields: [productVariants.productId],
      references: [products.id],
    }),
  }),
);

export const customersRelations = relations(customers, ({ many }) => ({
  addresses: many(addresses),
  orders: many(orders),
  cartItems: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  variant: one(productVariants, {
    fields: [cartItems.variantId],
    references: [productVariants.id],
  }),
  customer: one(customers, {
    fields: [cartItems.customerId],
    references: [customers.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  rider: one(staff, { fields: [orders.riderId], references: [staff.id] }),
  items: many(orderItems),
  events: many(orderEvents),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));

export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, {
    fields: [orderEvents.orderId],
    references: [orders.id],
  }),
}));

export const staffRelations = relations(staff, ({ many }) => ({
  deliveries: many(orders),
}));
