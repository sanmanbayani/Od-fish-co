# OD Fish Co. — Master Build Prompt

**D2C seafood commerce · Mumbai · Consumer mobile app + Admin web + Landing page**

*Tagline: Elevating Fresh Seafish, Every Day.*

---

## How to use this document

Each **Phase** below is one paste-in prompt for the Replit agent. Do not paste the whole document at once — you will burn checkpoints and get a shallow build of everything instead of a working build of the important things.

Order of operations for every phase:

1. Paste **Section 0 (Context Block)** once at the start of the project. It is the shared brief.
2. Paste **one phase prompt**.
3. Run the **Checkpoint** verification at the end of that phase yourself. Do not move on until every box is ticked.
4. Only then paste the next phase.

Phases 0–4 are the shippable MVP. Phases 5–7 are launch. Anything in **V2** is explicitly out of scope for the first release — resist it.

---

# SECTION 0 — CONTEXT BLOCK

> Paste this once at the beginning. Re-paste the top half if the agent starts drifting.

```
PROJECT: OD Fish Co. — a direct-to-consumer seafood ordering app for Mumbai, India.
Customers order fresh fish, prawns and crab for next-morning or same-evening delivery.

SURFACES (one monorepo, three surfaces):
1. Consumer mobile app  — Expo (React Native) + TypeScript + expo-router. iOS + Android.
2. Admin + Rider web    — Next.js (App Router) + TypeScript + Tailwind, deployed to Vercel.
                          "/"        = public landing page
                          "/admin/*" = staff dashboard (auth-gated, role ADMIN or OPS)
                          "/rider/*" = mobile-first delivery view (auth-gated, role RIDER)
3. Backend              — Supabase (Postgres, Auth, Storage, RLS, Edge Functions, Realtime).

HOSTING IS INDEPENDENT OF REPLIT. Database and auth live in the client's own Supabase
project. Web deploys to the client's own Vercel account. Source lives in the client's
GitHub repo. Replit is the build environment only. Never introduce a Replit-hosted
database, a Replit-hosted API, or Replit object storage.

STACK — DO NOT SUBSTITUTE:
- Supabase JS v2 for all data access.
- Razorpay for online payments (UPI, cards, netbanking). COD handled in-app, no gateway.
- Expo Router for mobile navigation. NativeWind for mobile styling.
- Tailwind CSS for web. shadcn/ui for admin components.
- Zod for every input boundary (forms, Edge Function payloads, webhooks).
- TanStack Query for server state on both mobile and web.
- Expo Notifications for order push updates.

REPO STRUCTURE:
od-fish-co/
├─ apps/
│  ├─ mobile/            Expo app
│  └─ web/               Next.js app (landing + admin + rider)
├─ packages/
│  └─ shared/            types, zod schemas, price/weight utils, order state machine
└─ supabase/
   ├─ migrations/        numbered SQL migrations
   └─ functions/         Edge Functions (Deno)

NON-NEGOTIABLE ENGINEERING RULES:
1. MONEY IS INTEGER PAISE. Never a float, never a JS number for currency arithmetic
   beyond integers. Column names end in _paise. Format to rupees only at render time.
2. THE SERVER COMPUTES EVERY TOTAL. The client sends {variant_id, quantity} only.
   It never sends a price, a subtotal, a discount or a grand total. All pricing happens
   inside the create-order Edge Function reading live prices from the database.
3. ROW LEVEL SECURITY ON EVERY TABLE, from the first migration. No table ships without
   policies. The anon key is the only key the mobile app ever sees.
4. THE SERVICE ROLE KEY NEVER LEAVES THE SERVER. Not in the Expo app, not in a
   NEXT_PUBLIC_ var, not in a client component. Edge Functions and Next.js server
   actions only.
5. ORDER STATUS ONLY MOVES THROUGH THE STATE MACHINE in packages/shared. No arbitrary
   status writes from any client. Every transition writes an order_events row.
6. ALL TIMESTAMPS ARE timestamptz STORED IN UTC. Render in Asia/Kolkata. Slot cutoffs
   are evaluated in Asia/Kolkata.
7. NO MOCK DATA AND NO PLACEHOLDER ARRAYS after Phase 0. Everything reads from Supabase.
8. Every Edge Function is idempotent and validates its input with Zod before touching
   the database.

BRAND:
Name         OD Fish Co.
Logo         attached_assets/image_1787984066522.png (navy line-art fish forming O + D)
Voice        Confident, clean, appetite-first. Never cutesy. Never "aquarium".

COLOR TOKENS:
--navy-900   #14243B   primary text, headers, logo
--navy-700   #1E3557   pressed states, dark surfaces
--navy-100   #E3E9F1   borders, dividers
--cream-50   #FAF7F0   app background
--cream-100  #F1EADD   card / section background
--coral-500  #FF5A36   primary CTA, price, "Add" button, active states
--coral-100  #FFE7E0   CTA tint, badges
--fresh-500  #0E9F6E   in-stock, delivered, success
--amber-500  #F59E0B   low stock, out for delivery
--red-500    #E02424   sold out, cancelled, errors
--slate-500  #64748B   secondary text

TYPE:
Headings  Plus Jakarta Sans, 700 (mirrors the logo's geometric sans)
Body      Inter, 400/500/600
Numerals  tabular-nums everywhere a price or weight is displayed

UI VIBE — reference Licious and Zomato:
- Big, edge-to-edge, high-appetite product photography. Fish on ice, on slate, wet look.
- Cards with 16px radius, soft shadow, cream surface on cream background.
- A sticky bottom "Add" / "Go to Cart" bar. Never make the user hunt for the cart.
- Price is coral and heavy. Struck-through MRP in slate beside it.
- Every product card shows: photo, English name, local Marathi name, cut type,
  pack weight, net-weight-after-cleaning note, price, per-kg equivalent, stock pill.
- Delivery promise ("Tomorrow, 7–10 AM") sits at the top of the home screen, always.
- Skeleton loaders, not spinners. Optimistic cart updates. Haptics on add-to-cart.

MUMBAI CONTEXT — THIS IS NOT GENERIC ECOMMERCE:
- Show the local name alongside the English one. Surmai, Paplet, Bangda, Bombil,
  Rawas, Halwa, Ghol, Kolambi, Chimbori, Tisrya, Sungat, Mandeli. This is the single
  biggest trust signal for a Mumbai fish buyer. Do not skip it.
- Serviceability is by pincode. Out-of-area users see a waitlist capture, not an error.
- Delivery is slotted, not "anytime". Fish is perishable and arrives with the morning catch.
- Prices are ₹ (INR). Weights in grams and kg. Distances in km.
```

---

# PHASE 0 — Foundations, Schema, RLS

**Goal:** A repo, a live Supabase schema with RLS, seeded Mumbai catalogue data, and both apps booting to a blank authenticated shell. No features yet.

```
Build Phase 0 of OD Fish Co.

1. Scaffold the monorepo exactly as described in the context block. Use pnpm workspaces.
   Root scripts: dev:mobile, dev:web, db:push, db:seed, typecheck, lint.

2. Create packages/shared with:
   - src/types.ts        — types generated from the schema below
   - src/money.ts        — toPaise, toRupees, formatINR (₹1,240 style, Indian grouping:
                           ₹1,24,500 not ₹124,500), sumPaise
   - src/weight.ts       — formatWeight (450g / 1.2kg), perKgPrice(price_paise, grams)
   - src/order-state.ts  — the state machine, single source of truth
   - src/schemas.ts      — Zod schemas for every Edge Function payload

3. Write supabase/migrations/0001_init.sql with the full schema below. Then
   0002_rls.sql with policies. Then 0003_seed.sql with the seed data.

--- SCHEMA ---

create extension if not exists "pgcrypto";

create type sold_by        as enum ('PACK','PIECE');
create type staff_role     as enum ('ADMIN','OPS','RIDER');
create type payment_method as enum ('COD','UPI','CARD','NETBANKING','WALLET');
create type payment_status as enum ('PENDING','PAID','FAILED','REFUNDED');
create type order_status   as enum (
  'PENDING_PAYMENT','PLACED','CONFIRMED','PACKED',
  'OUT_FOR_DELIVERY','DELIVERED','CANCELLED','FAILED'
);

-- IDENTITY -------------------------------------------------------------
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  phone         text not null unique,          -- E.164, +91XXXXXXXXXX
  full_name     text,
  email         text,
  created_at    timestamptz not null default now()
);

create table staff (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  role          staff_role not null,
  full_name     text not null,
  phone         text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- SERVICEABILITY & SLOTS -----------------------------------------------
create table serviceable_pincodes (
  pincode       text primary key,             -- 6 digits
  area_name     text not null,                -- "Bandra West"
  cod_enabled   boolean not null default true,
  is_active     boolean not null default true
);

create table delivery_slots (
  id            uuid primary key default gen_random_uuid(),
  label         text not null,                -- "Tomorrow, 7:00 – 10:00 AM"
  start_time    time not null,
  end_time      time not null,
  cutoff_time   time not null,                -- last order time, Asia/Kolkata
  cutoff_day_offset int not null default 0,   -- 0 = same day, -1 = previous day
  max_orders    int not null default 100,
  is_active     boolean not null default true,
  sort_order    int not null default 0
);

create table addresses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  label         text not null default 'Home',  -- Home | Work | Other
  receiver_name text not null,
  receiver_phone text not null,
  line1         text not null,                 -- flat / building
  line2         text,                          -- street / landmark
  area          text not null,
  city          text not null default 'Mumbai',
  state         text not null default 'Maharashtra',
  pincode       text not null,
  latitude      numeric(10,7),
  longitude     numeric(10,7),
  is_default    boolean not null default false,
  created_at    timestamptz not null default now()
);
create index on addresses(user_id);

-- CATALOGUE ------------------------------------------------------------
create table categories (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,                 -- "Sea Water Fish"
  name_local    text,                          -- "समुद्री मासे"
  image_url     text,
  sort_order    int not null default 0,
  is_active     boolean not null default true
);

create table products (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid not null references categories(id),
  slug          text not null unique,
  name          text not null,                 -- "Kingfish"
  name_local    text,                          -- "Surmai"
  short_desc    text,                          -- "Firm, meaty, few bones. Best for tawa fry."
  long_desc     text,
  origin        text,                          -- "Arabian Sea, Sassoon Dock"
  best_for      text[],                        -- {'Tawa Fry','Curry','Grill'}
  image_urls    text[] not null default '{}',
  is_active     boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);
create index on products(category_id) where is_active;

-- THE CRITICAL TABLE. A "variant" is one buyable pack: a cut type at a pack size.
create table product_variants (
  id                uuid primary key default gen_random_uuid(),
  product_id        uuid not null references products(id) on delete cascade,
  sku               text not null unique,
  cut_type          text not null,             -- Whole Cleaned | Curry Cut | Steaks |
                                               -- Fillet | Boneless Cubes | Peeled & Deveined
  sold_by           sold_by not null default 'PACK',
  pack_label        text not null,             -- "500g" or "2 pcs (approx 400g)"
  gross_weight_g    int,                       -- weight before cleaning
  net_weight_min_g  int,                       -- honest post-cleaning range
  net_weight_max_g  int,
  piece_count       int,                       -- only when sold_by = 'PIECE'
  mrp_paise         int not null,
  price_paise       int not null,
  stock_qty         int not null default 0,    -- packs available, NOT kilograms
  low_stock_at      int not null default 5,
  is_active         boolean not null default true,
  sort_order        int not null default 0,
  constraint price_lte_mrp check (price_paise <= mrp_paise),
  constraint stock_non_negative check (stock_qty >= 0)
);
create index on product_variants(product_id) where is_active;

-- CART -----------------------------------------------------------------
create table carts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references profiles(id) on delete cascade,
  updated_at    timestamptz not null default now()
);

create table cart_items (
  id            uuid primary key default gen_random_uuid(),
  cart_id       uuid not null references carts(id) on delete cascade,
  variant_id    uuid not null references product_variants(id),
  quantity      int not null check (quantity > 0 and quantity <= 20),
  added_at      timestamptz not null default now(),
  unique (cart_id, variant_id)
);

-- ORDERS ---------------------------------------------------------------
create table orders (
  id                    uuid primary key default gen_random_uuid(),
  order_number          text not null unique,    -- ODF-260829-0041
  user_id               uuid not null references profiles(id),
  status                order_status not null default 'PENDING_PAYMENT',

  -- address is SNAPSHOTTED, never joined. The customer may edit or delete it later.
  address_snapshot      jsonb not null,
  slot_id               uuid references delivery_slots(id),
  slot_label            text not null,
  delivery_date         date not null,

  subtotal_paise        int not null,
  delivery_fee_paise    int not null default 0,
  handling_fee_paise    int not null default 0,
  discount_paise        int not null default 0,
  total_paise           int not null,

  payment_method        payment_method not null,
  payment_status        payment_status not null default 'PENDING',

  delivery_otp_hash     text,                    -- bcrypt/sha256, NEVER plaintext
  delivery_otp_expires_at timestamptz,
  delivered_at          timestamptz,
  assigned_rider_id     uuid references staff(user_id),

  customer_note         text,
  cancellation_reason   text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index on orders(user_id, created_at desc);
create index on orders(status, delivery_date);

create table order_items (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references orders(id) on delete cascade,
  variant_id        uuid not null references product_variants(id),
  -- everything below is SNAPSHOTTED at order time
  product_name      text not null,
  product_name_local text,
  cut_type          text not null,
  pack_label        text not null,
  image_url         text,
  unit_price_paise  int not null,
  quantity          int not null,
  line_total_paise  int not null
);
create index on order_items(order_id);

create table payments (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null references orders(id),
  provider              text not null default 'razorpay',
  razorpay_order_id     text unique,
  razorpay_payment_id   text unique,
  razorpay_signature    text,
  method                payment_method not null,
  amount_paise          int not null,
  status                payment_status not null default 'PENDING',
  failure_reason        text,
  raw_payload           jsonb,
  created_at            timestamptz not null default now()
);

create table order_events (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders(id) on delete cascade,
  from_status   order_status,
  to_status     order_status not null,
  note          text,
  actor_id      uuid,                          -- staff or customer
  actor_type    text not null default 'SYSTEM', -- SYSTEM | STAFF | CUSTOMER
  created_at    timestamptz not null default now()
);
create index on order_events(order_id, created_at);

create table app_settings (
  key           text primary key,
  value         jsonb not null,
  updated_at    timestamptz not null default now()
);
-- seed: free_delivery_threshold_paise, delivery_fee_paise, handling_fee_paise,
--       cod_max_order_paise, cod_enabled, store_open, fssai_license_no,
--       support_phone, support_whatsapp

--- RLS POLICIES ---

Enable RLS on every table. Then:

- profiles / addresses / carts / cart_items:
    customer can select/insert/update/delete WHERE auth.uid() owns the row.
- categories / products / product_variants / serviceable_pincodes / delivery_slots
  / app_settings:
    SELECT for anon and authenticated where is_active = true. No client writes at all.
- orders / order_items / payments / order_events:
    customer SELECT only, WHERE user_id = auth.uid(). NO client insert or update —
    orders are created exclusively by the create-order Edge Function using the
    service role.
- staff: SELECT only where user_id = auth.uid().
- Create a SECURITY DEFINER helper: is_staff(min_role staff_role) returns boolean.
  Admin-side reads and writes go through Next.js server actions using the service
  role after checking is_staff(). Never expose service role to the browser.

--- SEED DATA (0003_seed.sql) ---

Categories: Sea Water Fish, Fresh Water Fish, Prawns & Shrimp, Crab & Lobster,
Shellfish, Dried Fish, Ready to Cook.

At least 18 real Mumbai products with correct local names, each with 2–3 variants:
  Kingfish (Surmai)        — Steaks 500g, Curry Cut 500g, Whole Cleaned 1kg
  Silver Pomfret (Paplet)  — Whole Cleaned 2pcs, Whole Cleaned 1pc large
  Black Pomfret (Halwa)    — Whole Cleaned 500g, Curry Cut 500g
  Indian Salmon (Rawas)    — Steaks 500g, Fillet 400g, Curry Cut 500g
  Mackerel (Bangda)        — Whole Cleaned 500g, Butterfly Cut 500g
  Bombay Duck (Bombil)     — Cleaned 500g
  Croaker (Ghol)           — Curry Cut 500g, Steaks 500g
  Tiger Prawns (Kolambi)   — Peeled & Deveined 250g, Whole 500g
  Small Prawns             — Peeled & Deveined 250g
  Mud Crab (Chimbori)      — Whole Cleaned 500g, 1kg
  Clams (Tisrya)           — Cleaned 500g
  Oysters (Sungat)         — 6 pcs
  Anchovy (Mandeli)        — Cleaned 500g
  Rohu                     — Curry Cut 1kg
  Catla                    — Curry Cut 1kg
  Basa Fillet              — Fillet 500g
  Squid (Makul)            — Rings 300g
  Dried Bombil             — 100g

Every variant needs honest net-weight ranges. Example: Surmai Curry Cut,
gross 500g → net 380–420g. This copy appears on the product card. Do not invent
a single net weight; always a range.

Delivery slots:
  "Tomorrow, 7:00 – 10:00 AM"  start 07:00 end 10:00 cutoff 22:00 offset -1
  "Today, 4:00 – 7:00 PM"      start 16:00 end 19:00 cutoff 11:00 offset  0

Serviceable pincodes: 25 real Mumbai pincodes across Bandra, Khar, Santacruz,
Andheri, Powai, Lower Parel, Worli, Dadar, Colaba, Malad, Goregaon, Chembur.

app_settings: delivery_fee_paise 4900, free_delivery_threshold_paise 79900,
handling_fee_paise 900, cod_max_order_paise 300000, cod_enabled true,
store_open true.

4. Wire environment variables. Create .env.example in both apps, never commit real values.
   mobile: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
   web:    NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
           SUPABASE_SERVICE_ROLE_KEY (server only)
   edge:   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET

5. Both apps must boot: mobile shows a themed splash + empty home, web shows a
   themed empty landing. Design tokens from the context block wired into
   NativeWind and Tailwind configs. Logo imported from attached_assets.
```

### ✅ Checkpoint 0

- [ ] `pnpm typecheck` passes at the root with zero errors.
- [ ] All three migrations applied to the real Supabase project without error.
- [ ] In the Supabase dashboard, **every** table shows "RLS enabled".
- [ ] Seed data visible: 7 categories, 18+ products, 40+ variants, 2 slots, 25 pincodes.
- [ ] Query `product_variants` with the **anon** key from a REST client → rows return.
- [ ] Try to `INSERT` into `orders` with the anon key → **must be rejected**. If it succeeds, stop and fix RLS.
- [ ] Expo app opens on your physical phone via Expo Go, showing the navy/cream theme.
- [ ] Next.js app runs and renders the OD Fish Co. logo.
- [ ] `grep -r "SERVICE_ROLE" apps/mobile` returns nothing.

---

# PHASE 1 — Phone Auth + Addresses

**Goal:** A user can log in with an Indian mobile number and save a delivery address inside a serviceable pincode.

```
Build Phase 1 of OD Fish Co.: authentication and addresses.

AUTH — Supabase phone OTP.
- Configure Supabase Auth phone provider. Use MSG91 as the SMS provider (India DLT
  compliant). Fall back to Twilio only if MSG91 is unavailable.
- Mobile screens (expo-router):
    (auth)/phone      — +91 prefix locked, 10-digit input, numeric keypad,
                        live validation (must start 6/7/8/9), big coral CTA
    (auth)/otp        — 6-box OTP input, auto-advance, auto-read the SMS on Android
                        via expo-otp-autofill or the SMS Retriever API, 30s resend
                        timer, "Change number" link
    (auth)/profile    — first-time only: name capture, then straight to home
- Store the session with expo-secure-store. Persist across app restarts.
- On first successful login, create the profiles row AND an empty carts row in one
  transaction via a Postgres trigger on auth.users insert.
- Rate limit: max 5 OTP requests per number per hour, enforced server-side.
- Add a DEV BYPASS: number +919999999999 with OTP 123456 works without sending SMS,
  gated behind an env flag that is false in production. You will need this constantly
  while DLT approval is pending.

ADDRESSES
- Screens: address list (bottom sheet + full screen), add/edit address form.
- Form fields: label chips (Home / Work / Other), receiver name, receiver phone,
  flat/building, street/landmark, area, pincode, city (locked to Mumbai),
  set-as-default toggle.
- ON PINCODE ENTRY: debounced lookup against serviceable_pincodes.
    Serviceable   → green pill: "✓ We deliver to Bandra West"
    Not found     → amber card: "We're not in your area yet. Leave your number and
                    we'll tell you the day we arrive." → writes to a waitlist table.
                    Do NOT block the user with a red error.
- Address list shows a default badge, edit and delete. Deleting the default promotes
  the next one.
- The home screen header shows the current default address, truncated, tappable to
  switch. Copy the Zomato/Swiggy pattern exactly: small "DELIVERING TO" label above,
  bold area name with a chevron below.

Use TanStack Query for all reads. Optimistic updates on address CRUD.
```

### ✅ Checkpoint 1

- [ ] A real Indian number receives an OTP and logs in end to end.
- [ ] Killing and reopening the app keeps you logged in.
- [ ] A `profiles` row and an empty `carts` row were created automatically.
- [ ] Requesting a 6th OTP within an hour is rejected.
- [ ] Entering `400050` shows the green serviceable pill; entering `560001` shows the waitlist card, not an error.
- [ ] Address CRUD works; deleting the default promotes another.
- [ ] Logging in as user A shows none of user B's addresses (verify by querying with A's token).

---

# PHASE 2 — Catalogue, Variants, Cart

**Goal:** Browse fish, understand exactly what you're buying, and build a cart.

```
Build Phase 2 of OD Fish Co.: catalogue and cart.

HOME SCREEN
- Sticky header: OD Fish Co. wordmark left, address switcher, cart icon with badge.
- Delivery promise strip directly under the header, coral tint:
  "Next delivery · Tomorrow, 7:00 – 10:00 AM · order within 4h 12m"
  Live countdown to the next slot cutoff, computed in Asia/Kolkata.
- Horizontal scrolling category rail with circular images.
- Section: "Today's Catch" — a curated horizontal product rail.
- Section: "Popular in Mumbai".
- Then a vertical grid of all products, 2 columns.
- Search bar that filters on BOTH name and name_local. Typing "surmai" must find
  Kingfish. This is essential.

PRODUCT CARD (the most important component in the app)
  ┌──────────────────────────────┐
  │  [ high-appetite photo ]     │
  │  ● In Stock          (pill)  │
  ├──────────────────────────────┤
  │  Kingfish                    │  navy-900, 700
  │  Surmai · Curry Cut          │  slate-500, 500
  │  500g pack · 380–420g net    │  slate-500, 12px
  │  ₹549  ₹649                  │  coral bold + struck slate
  │  ₹1,098/kg                   │  slate-500, 11px
  │             [  ADD  ]        │  coral outline → stepper on tap
  └──────────────────────────────┘
- Stock pill: In Stock (fresh-500) / Only 3 left (amber-500) / Sold Out (red-500,
  card at 50% opacity, ADD disabled).
- Tapping ADD converts the button in place into a − 1 + stepper. No navigation.
- Haptic feedback on add. The cart badge animates.

PRODUCT DETAIL SCREEN
- Full-bleed image carousel with page dots.
- Name, local name, origin line ("Arabian Sea · Sassoon Dock").
- Cut-type selector as horizontal chips. Selecting a cut swaps the variant and price.
- Pack-size selector as a second chip row.
- An explicit, honest NET WEIGHT CARD — do not bury this:
    "You order 500g gross. After scaling, gutting and cutting you receive
     approximately 380–420g of edible fish. We weigh before cleaning, like your
     local market."
  This single card prevents the majority of your future support tickets.
- "Best for" tags: Tawa Fry, Curry, Grill.
- Short description, then long description in an accordion.
- Sticky bottom bar: price left, big coral ADD TO CART right.

CART SCREEN
- Line items with thumbnail, name + local name, cut, pack label, stepper, line total.
- Removing to zero shows an undo snackbar for 4 seconds.
- Bill summary card: Item Total, Delivery Fee (struck through and shown as FREE above
  the threshold), Handling Fee, To Pay. Every figure recomputed from live variant
  prices on every cart read — never from a stored value.
- A progress nudge: "Add ₹210 more for free delivery."
- Slot picker inline in the cart: the two slots as selectable cards, with any slot past
  its cutoff greyed out and labelled "Cutoff passed".
- Empty cart state: illustration, "Your basket is empty", CTA back to catalogue.
- Cart persists to Supabase, not just device state, so it survives reinstalls.
- STOCK RECONCILIATION on entering the cart screen: re-fetch every variant. If stock
  dropped below the cart quantity, show an inline amber banner on that row
  ("Only 2 left — quantity updated") and silently clamp. Never let a user reach
  checkout with an unfulfillable cart.
```

### ✅ Checkpoint 2

- [ ] Searching "surmai", "paplet" and "bangda" each return the right product.
- [ ] Changing cut type on the detail screen changes price and net-weight range.
- [ ] A variant with `stock_qty = 0` renders as Sold Out and cannot be added.
- [ ] Add items → force-quit the app → reopen → cart is intact.
- [ ] Manually set a variant's stock to 1 in Supabase while 3 are in the cart → reopening the cart clamps to 1 and explains why.
- [ ] Cart total crossing ₹799 flips delivery fee to FREE.
- [ ] After the 11:00 AM cutoff, the evening slot is disabled in the picker.
- [ ] The net-weight card is visible on every product detail screen.

---

# PHASE 3 — Checkout & Payments

**Goal:** Money moves correctly, and the amount charged always equals the amount shown.

```
Build Phase 3 of OD Fish Co.: checkout and Razorpay.

CHECKOUT SCREEN — a single scrollable page, no multi-step wizard.
  1. Deliver to      — address card, "Change" link
  2. Delivery slot   — selected slot, "Change" link
  3. Order summary   — collapsed item list, expandable
  4. Payment method  — radio cards: UPI, Card, Netbanking, Cash on Delivery
  5. Bill details    — the same summary as the cart
  Sticky bottom bar: total + "PLACE ORDER · ₹1,247"

COD RULES — enforce server-side, not just in the UI:
  - Hidden entirely when app_settings.cod_enabled is false.
  - Disabled with an explanatory line when total > cod_max_order_paise.
  - Disabled when the delivery pincode has cod_enabled = false.

EDGE FUNCTION: create-order   (Deno, service role)
  Input (Zod): { address_id, slot_id, payment_method, customer_note? }
  Steps, all inside one Postgres transaction:
   1. Resolve auth.uid() from the JWT. Reject if absent.
   2. Load the user's cart_items joined to product_variants. Reject if empty.
   3. Re-read every price and stock_qty LIVE. Reject with a structured error listing
      any variant whose stock is now insufficient.
   4. Verify the address belongs to the user and its pincode is serviceable.
   5. Verify the slot is active and its cutoff has not passed (Asia/Kolkata).
   6. Compute subtotal, delivery fee, handling fee, total — server-side, in paise.
   7. Generate order_number: ODF-YYMMDD-NNNN, sequential per day.
   8. Snapshot the address into address_snapshot. Snapshot every item into order_items.
   9. Decrement product_variants.stock_qty atomically with a
      "UPDATE ... SET stock_qty = stock_qty - $1 WHERE id = $2 AND stock_qty >= $1"
      guard. Zero rows affected means someone beat you to it — roll back the whole
      transaction and return a stock error.
  10. If payment_method = COD:
        order.status = 'PLACED', payment_status = 'PENDING'. Clear the cart. Done.
      Else:
        order.status = 'PENDING_PAYMENT'. Call the Razorpay Orders API for
        total_paise. Store razorpay_order_id in payments. Return it to the client.
        DO NOT clear the cart yet.
  11. Write an order_events row for the transition.
  Return: { order_id, order_number, total_paise, razorpay_order_id? }

RAZORPAY CHECKOUT (mobile)
  - Use react-native-razorpay. Prefill name, email, contact from the profile.
  - Theme color: #FF5A36. Company name: OD Fish Co. Logo from a hosted URL.
  - On success, call verify-payment with { order_id, razorpay_payment_id,
    razorpay_order_id, razorpay_signature }.
  - On dismiss or failure, leave the order at PENDING_PAYMENT and show a
    "Retry payment" screen. Do not delete the order — the webhook may still land.

EDGE FUNCTION: verify-payment
  - Recompute the HMAC-SHA256 signature over "razorpay_order_id|razorpay_payment_id"
    using RAZORPAY_KEY_SECRET. Constant-time compare. Reject a mismatch.
  - Confirm the Razorpay payment amount equals orders.total_paise. Reject a mismatch —
    this is the tampering check and it is not optional.
  - Set payment_status = 'PAID', order status = 'PLACED'. Clear the cart.
    Write order_events. Fire the confirmation push.

EDGE FUNCTION: razorpay-webhook   (THE SOURCE OF TRUTH)
  - Public endpoint, no JWT. Verify the X-Razorpay-Signature header against
    RAZORPAY_WEBHOOK_SECRET before parsing anything.
  - Handle payment.captured, payment.failed, refund.processed.
  - Fully idempotent: key on razorpay_payment_id and no-op if already processed.
  - This must correctly settle an order even when the app was killed mid-payment.
    Test that case explicitly.

RELEASE STOCK ON ABANDONMENT
  - A pg_cron job every 15 minutes: any order still PENDING_PAYMENT and older than
    30 minutes → status FAILED, restore stock_qty for its items, write order_events.

ORDER CONFIRMATION SCREEN
  - Success animation, order number, slot, total, delivery address.
  - "Track order" primary CTA, "Continue shopping" secondary.
  - Never expose Razorpay IDs to the customer.
```

### ✅ Checkpoint 3

- [ ] A UPI payment in Razorpay **test mode** completes and the order lands on `PLACED` / `PAID`.
- [ ] A card payment completes. A deliberately failed test card leaves the order at `PENDING_PAYMENT` and the retry screen appears.
- [ ] A COD order is created with no gateway call, `PLACED` / `PENDING`.
- [ ] `stock_qty` decremented by exactly the right amount, once, never twice.
- [ ] **Tamper test:** modify the client payload to send a lower amount → the order total is unchanged, because the server ignored it.
- [ ] **Signature test:** call `verify-payment` with a garbage signature → rejected.
- [ ] **Kill test:** start a payment, force-quit the app mid-flow, complete the payment in the UPI app → the webhook settles the order to `PLACED`.
- [ ] Replay the same webhook payload three times → exactly one state change.
- [ ] Leave an order at `PENDING_PAYMENT` for 30 minutes → cron marks it `FAILED` and stock is restored.
- [ ] COD is hidden when the total exceeds ₹3,000.
- [ ] Two devices race to buy the last pack → one succeeds, one gets a clean stock error. No negative stock.

---

# PHASE 4 — Order Tracking, Delivery Flow, OTP

**Goal:** The customer watches the order move, and delivery is confirmed by OTP.

```
Build Phase 4 of OD Fish Co.: order lifecycle and delivery.

STATE MACHINE (packages/shared/order-state.ts) — the only legal transitions:
  PENDING_PAYMENT → PLACED | FAILED | CANCELLED
  PLACED          → CONFIRMED | CANCELLED
  CONFIRMED       → PACKED | CANCELLED
  PACKED          → OUT_FOR_DELIVERY | CANCELLED
  OUT_FOR_DELIVERY→ DELIVERED | FAILED
  DELIVERED, CANCELLED, FAILED are terminal.
Every transition goes through one function, canTransition(from, to), used by mobile,
web and Edge Functions alike. Every transition writes an order_events row.

CUSTOMER CANCELLATION
  Allowed only while status is PLACED or CONFIRMED. Once PACKED, the fish is cut and
  cancellation is off — show "This order is being packed and can no longer be
  cancelled. Call us on <support_phone>." Cancelling restores stock and, for a prepaid
  order, triggers a Razorpay refund and sets payment_status = 'REFUNDED'.

ORDER TRACKING SCREEN
  - Vertical stepper with five nodes: Placed → Confirmed → Packed → Out for Delivery →
    Delivered. Completed nodes fresh-500 with a tick, current node coral-500 pulsing,
    future nodes navy-100. Timestamps from order_events beside each completed node.
  - ETA card at the top: "Arriving today between 7:00 and 10:00 AM".
  - When status = OUT_FOR_DELIVERY, a coral card slides in:
        DELIVERY OTP
        4  8  2  1                    ← large, tabular, letter-spaced
        Share this with your delivery partner
    Plus rider name and a "Call rider" button that dials assigned_rider_id's phone.
  - Subscribe to Supabase Realtime on this order row. The screen updates without a
    pull-to-refresh. This is the moment the app feels expensive — do not skip it.
  - Itemised bill, delivery address, payment method, invoice download (V2).

ORDER HISTORY
  - Reverse-chronological list. Each card: order number, date, first item thumbnail,
    "+3 more", total, status pill.
  - Tapping opens tracking (live) or the receipt view (terminal).
  - "Reorder" on delivered orders: re-adds all still-available items to the cart and
    reports anything that has gone out of stock.

DELIVERY OTP MECHANICS
  - Generated when status moves to OUT_FOR_DELIVERY: a 4-digit code, hashed with
    SHA-256 + a per-order salt into delivery_otp_hash. THE PLAINTEXT IS NEVER STORED
    and never leaves the generating function except to the customer's app via a
    dedicated authorised read.
  - Expires 12 hours after generation.
  - EDGE FUNCTION verify-delivery-otp: input { order_id, otp }, caller must be the
    assigned rider or an ADMIN. Max 5 attempts, then locked and escalated to ops.
    On success: status → DELIVERED, delivered_at = now(), and for COD orders
    payment_status → 'PAID'. Writes order_events.
  - Rider fallback when the customer cannot produce the OTP: the rider marks
    "Customer unreachable", which does NOT complete the order — it flags it for ops,
    who can force-complete from the admin dashboard with a mandatory written reason.
    Every force-completion is logged with the actor.

PUSH NOTIFICATIONS (Expo Notifications)
  Register the token on login, store it on profiles. Send on:
  - Order placed          "Order ODF-260829-0041 confirmed 🐟"
  - Out for delivery      "Your fish is on the way. OTP: 4821"
  - Delivered             "Delivered. Fresh from the docks. Rate your order?"
  Fire from a Postgres trigger → Edge Function → Expo Push API.
```

### ✅ Checkpoint 4

- [ ] Changing the status in Supabase updates the customer's tracking screen live, with no refresh.
- [ ] An illegal transition (`PLACED` → `DELIVERED`) is rejected by `canTransition`.
- [ ] Every transition wrote an `order_events` row with the correct actor.
- [ ] The OTP card appears only at `OUT_FOR_DELIVERY`.
- [ ] `delivery_otp_hash` in the database is a hash — searching the table for the plaintext OTP finds nothing.
- [ ] A wrong OTP five times locks the order; a correct one marks it `DELIVERED`.
- [ ] A COD order flips to `PAID` on OTP verification.
- [ ] Cancelling a `PLACED` order restores stock; a prepaid cancellation issues a test-mode refund.
- [ ] Cancelling a `PACKED` order is blocked with the support message.
- [ ] All three push notifications arrive on a physical device.
- [ ] Reorder from history rebuilds the cart and names anything out of stock.

---

# PHASE 5 — Admin Dashboard

**Goal:** The client can run the business without touching the database.

```
Build Phase 5 of OD Fish Co.: the admin web app at /admin.

AUTH: Supabase email + password for staff (not phone). Middleware guards /admin,
checking the staff table for role ADMIN or OPS. Every mutation runs in a Next.js
server action that re-verifies the role server-side. Never trust the client.

LAYOUT: left sidebar (navy-900), light content area, OD Fish Co. logo top-left.
Nav: Dashboard · Orders · Products · Inventory · Riders · Settings.

1. DASHBOARD
   Today's cards: orders count, revenue, orders by status, low-stock count.
   A live "Needs Action" queue: everything in PLACED, sorted oldest first, with a
   one-click Confirm on each row. This is the screen they will keep open all day —
   make it the default route.
   Revenue sparkline for the last 14 days.

2. ORDERS
   - Table: order number, customer name + phone, area, slot, items count, total,
     payment method + status, order status, placed at.
   - Filters: status, delivery date, slot, payment method, pincode. Search by order
     number or phone.
   - TABS BY SLOT for the current delivery date. Ops thinks in slots, not in dates.
   - Row click opens a detail drawer: full item list with cut types, address, map
     link, payment detail, and the order_events timeline.
   - Status actions as explicit buttons, only ever showing legal next transitions.
   - Assign rider: a dropdown of active RIDER staff. Assigning moves the order to
     OUT_FOR_DELIVERY, generates the OTP and pushes the customer.
   - Bulk select → Confirm, or → Packed. Ops processes a slot in one sweep.
   - PRINT PACKING SLIP: a clean print stylesheet, one order per page, with
     item, cut type, pack label and gross weight — this is what goes to the cutting
     table. Include a bulk "print all for this slot".

3. PRODUCTS (CRUD)
   - Product list with category filter, active toggle, variant count.
   - Product form: name, local name, category, descriptions, origin, best-for tags,
     image upload to Supabase Storage with client-side compression, drag-to-reorder.
   - VARIANT EDITOR inline within the product form: a repeatable row for
     SKU, cut type, sold-by, pack label, gross weight, net min/max, MRP, price,
     stock, active. Live-preview the per-kg price and the discount percentage as
     they type. Warn if net_max exceeds gross.
   - Soft delete only (is_active = false). Never hard-delete a product that appears
     in an order_items row.

4. INVENTORY
   - A dense, editable grid of every active variant: product, cut, pack, stock,
     price. Inline-edit stock and price with an optimistic save.
   - Sort by stock ascending, so what is running out is at the top.
   - Colour rows: red at 0, amber under low_stock_at, plain otherwise.
   - "Start of day stock" bulk entry: enter today's numbers for every variant on one
     screen and save once. This is how a fish business actually opens in the morning —
     do not make them edit 40 products one at a time.
   - Quick action: "Mark sold out" on a row.

5. RIDERS
   - CRUD on staff with role RIDER. Name, phone, active toggle.
   - Per-rider view: assigned orders today, delivered count.

6. SETTINGS
   - Edit app_settings: delivery fee, free-delivery threshold, handling fee, COD cap,
     COD on/off, STORE OPEN/CLOSED master switch (closing the store shows a
     "We're closed" state in the mobile app), FSSAI licence number, support phone
     and WhatsApp.
   - Serviceable pincodes CRUD.
   - Delivery slots CRUD, including cutoff times.

7. RIDER VIEW at /rider — mobile-first, deliberately minimal.
   - Login, then a single list of orders assigned to this rider today.
   - Card per order: order number, customer name, phone (tap to call), full address,
     "Open in Google Maps" link, COD amount to collect in large coral text if COD.
   - Primary action: "Enter Delivery OTP" → 4-box input → verify → the card collapses
     to delivered.
   - Secondary: "Customer unreachable" → flags for ops, does not complete.
   - Works on a mid-range Android phone on 4G. No heavy assets.
```

### ✅ Checkpoint 5

- [ ] A non-staff user hitting `/admin` is redirected, and the API refuses them too.
- [ ] An `OPS` user can move orders but cannot reach Settings; an `ADMIN` can.
- [ ] Creating a product with variants makes it appear in the mobile app immediately.
- [ ] Editing stock in the admin grid changes the mobile stock pill on next fetch.
- [ ] The full order lifecycle is drivable from admin: Confirm → Pack → assign rider → OTP → Delivered.
- [ ] Assigning a rider generates the OTP and pushes the customer.
- [ ] The packing slip prints cleanly, one order per page, with cut types.
- [ ] Bulk-confirming a slot's orders works.
- [ ] `/rider` is usable one-handed on a phone; OTP entry completes the delivery.
- [ ] Toggling STORE CLOSED shows the closed state in the mobile app.
- [ ] Only legal status transitions are offered as buttons.

---

# PHASE 6 — Landing Page

```
Build Phase 6 of OD Fish Co.: the public landing page at "/".

Single page, fast, mobile-first, built to convert to an app install.

Sections:
1. Hero — navy background, logo, "Elevating fresh seafish, every day.",
   sub: "Fresh from Mumbai's docks to your kitchen. Cleaned, cut and delivered
   by 10 AM." App Store and Play Store badges. A hero photograph of fish on ice.
2. Trust strip — four icons: Same-day catch · Cleaned & cut your way ·
   Delivered in slots · FSSAI licensed (with the real licence number).
3. How it works — three steps with illustrations: Choose your fish and cut →
   Pick a delivery slot → Pay online or COD.
4. Today's catch — a live grid of 8 products pulled from Supabase at build time
   with ISR revalidating every 30 minutes. Real prices. This page must never
   show stale or fake prices.
5. Delivery areas — the list of serviceable Mumbai neighbourhoods, with a pincode
   checker input that hits the same lookup the app uses.
6. Testimonials — three placeholder cards the client can replace.
7. Footer — logo, contact, WhatsApp, FSSAI number, address, and links to
   Privacy Policy, Terms, Refund & Cancellation Policy, Shipping Policy.
   THESE FOUR PAGES ARE MANDATORY — Razorpay will not approve a live account
   without them. Generate real drafts, not lorem ipsum.

SEO: title/description/OG tags, JSON-LD LocalBusiness schema with Mumbai geo,
sitemap.xml, robots.txt. Target "fresh fish delivery Mumbai" and
"online fish delivery Bandra".
Lighthouse: 90+ on performance and accessibility. next/image everywhere.
```

### ✅ Checkpoint 6

- [ ] Lighthouse mobile performance and accessibility both 90+.
- [ ] The catch grid shows real prices from Supabase.
- [ ] The pincode checker gives correct answers for a serviceable and a non-serviceable pincode.
- [ ] All four policy pages exist with real content and the FSSAI number is displayed.
- [ ] OG image renders correctly when the URL is pasted into WhatsApp.

---

# PHASE 7 — Ship

```
Build Phase 7 of OD Fish Co.: production hardening and release.

1. ENVIRONMENTS — separate Supabase projects for staging and production. Never point
   a build at a database it should not touch. Razorpay in test mode on staging, live
   on production.
2. ERROR TRACKING — Sentry on both apps. Scrub phone numbers and addresses from
   breadcrumbs.
3. DATABASE — enable Supabase point-in-time recovery. Verify pg_cron jobs are live.
   Add indexes for every admin filter combination and confirm with EXPLAIN ANALYZE.
4. MOBILE RELEASE — EAS Build. iOS to TestFlight; Android AAB for manual Play Console
   upload. App icon and splash from the logo on cream. Version 1.0.0.
   App Store listing: screenshots at all required sizes, description, keywords
   (fish delivery mumbai, seafood online, surmai, pomfret), privacy nutrition labels
   declaring phone number, location and purchase history.
5. WEB RELEASE — Vercel production deploy, custom domain, force HTTPS,
   security headers, and the Razorpay webhook URL registered against the production
   endpoint.
6. PRE-LAUNCH SMOKE TEST on production with real money, smallest possible order:
   sign up on a fresh number → add address → order one item → pay ₹1 by UPI →
   confirm in admin → assign rider → verify OTP → confirm DELIVERED → refund it.
   Do this before a single customer sees the app.
```

---

## Explicitly OUT OF SCOPE for V1

Say no to all of these. Each one is a V2 conversation with a separate quote.

Coupons and promo codes · Loyalty points and wallet · Subscriptions and standing orders · In-app chat support (V1 is a WhatsApp deep link and a call button) · Ratings and reviews · Referrals · Live rider GPS on a map (the slot ETA is enough) · Multi-city and multi-vendor · Recipe content · Guest checkout · Social login · Dark mode · i18n beyond local fish names · Invoice PDF generation · Analytics dashboards beyond the daily numbers

---

## What must happen outside the code

These have external lead times and will delay launch far more than any feature will. Start them on day one.

| Item | Owner | Lead time | Notes |
|---|---|---|---|
| **DLT / TRAI registration** for transactional SMS | Client | 1–2 weeks | Blocks phone OTP in production. The single most likely thing to delay your launch. Use the dev bypass while it clears. |
| **Razorpay account + KYC** | Client | 2–5 days | Needs business PAN, GST, bank proof. Requires the four policy pages live. You cannot do this for them. |
| **FSSAI licence number** | Client | Already held | Legally must be displayed on the app, the site and every invoice. |
| **Apple Developer account** ($99/yr) | Client | 1–2 days | Enrol under the business entity, not a personal Apple ID. |
| **Google Play Console** ($25 one-time) | Client | 1–2 days | Note: Replit builds the AAB; you upload it manually. |
| **Product photography** | Client | Ongoing | The highest-leverage non-code asset in the whole project. Bad fish photos will sink good software. Budget for a half-day shoot: every product on ice, top-down, consistent lighting. |
| **Privacy Policy, Terms, Refund, Shipping pages** | You (drafts) → Client (legal review) | — | Razorpay gates the live account on these. |

---

## Three decisions the client must make before Phase 3

1. **Fixed packs, or weigh-and-adjust?** This document assumes **fixed packs with a disclosed net-weight range** — the customer pays exactly what they saw. The alternative, charging actual weighed weight, needs card pre-authorisation, is effectively impossible on UPI, and generates disputes on every single COD order. Recommend fixed packs hard. If they insist on actual weight, that is a different architecture and a bigger quote.

2. **Who cuts, and when?** If the fish is cut *after* the order (which is the premise of offering cut types), the order cutoff is a hard operational constraint, not a UI nicety. Confirm the cutting capacity per slot and set `max_orders` accordingly.

3. **Refund policy on a perishable.** Fish cannot be returned. The realistic policy is a photo-based quality complaint within 2 hours of delivery, resolved as a credit or a replacement on the next order. Get this written down before launch, because it goes on the Refund Policy page that Razorpay reads.

---

## Suggested build order if the timeline compresses

Phases 0 → 1 → 2 → 3 → 4 → 5 is the true critical path. Phase 6 (landing) can slip to the final week — but note that Razorpay needs the **policy pages** live before it will approve a production account, so ship those four pages early even if the marketing page waits.

If you must demo before payments are ready, build Phases 0, 1, 2, then a COD-only version of 3, then 4 and 5. A COD-only app is a complete, sellable product. Online payments can land a week later.
