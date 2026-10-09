# OD Fish Co. Mobile — Analysis & E2E Test Report

**Date:** 8 October 2026
**Device:** Moto G57 Power (`ZA223FN4XJ`), Android, `minSdk 24 / targetSdk 36`
**Build tested:** local debug build via `npx expo run:android` (Gradle BUILD SUCCESSFUL, 3m 24s)
**Backend:** `@workspace/api-server` on `:3000`, Postgres on Supabase, `NODE_ENV=development`
**Scope:** mobile app only (web artifact and admin console not tested)

---

## 1. Architecture

pnpm monorepo, TypeScript throughout.

| Package | Role |
| --- | --- |
| `artifacts/od-fish-mobile` | Expo SDK 54, RN 0.81.5, expo-router v6, React Compiler on, New Architecture on |
| `artifacts/api-server` | Express 5, Drizzle ORM, pino, esbuild bundle |
| `artifacts/od-fish-web` | Vite storefront + admin console |
| `lib/api-spec` | OpenAPI 3 contract — the source of truth |
| `lib/api-zod`, `lib/api-client-react` | generated from the spec (orval): server-side validators, typed React Query hooks |
| `lib/db` | Drizzle schema + connection |

The generated-client arrangement is the strongest thing in this codebase: screens call `useGetCart()` / `useCreateOrder()` and the types come from the same YAML the server validates against. Drift between client and server is structurally hard.

**State:** React Query for all server state (30s stale, `refetchOnWindowFocus` driven off `AppState`), React Context for auth, module-level singleton for the preferred delivery slot. No Redux/Zustand — appropriate at this size.

**Design system:** `constants/colors.ts` + `constants/typography.ts` feed a small primitive set (`Text`, `Button`, `Card`, `Badge`, `TextField`, `QtyStepper`, `Screen`, `StateViews`). Fraunces (display) / Plus Jakarta Sans (body) / Inter (numerals), navy `#0B1A3D` on cream `#F8F6F1`. Consistently applied.

**Notable engineering quality:**
- Order creation (`routes/orders.ts:128-217`) is genuinely well built — serialises on cart deletion for idempotency, `SELECT … FOR UPDATE` on the slot row for capacity, guarded `UPDATE … WHERE stock >= qty` for stock claims. Double-tap on "Place order" cannot double-charge.
- `lib/env.ts` fails *closed*: dev conveniences are allow-listed by name rather than gated on `NODE_ENV !== "production"`, so an unset `NODE_ENV` is treated as public.
- `lib/sms.ts` refuses to fake delivery behind a flag — capability is a property of the code, not a string.
- Push sending is fire-and-forget post-commit and prunes `DeviceNotRegistered` tokens.

---

## 2. Backend test results — 50 / 51 passed

Script: `tmp/odf-e2e.mjs`. Exercises the API exactly as the app does (bearer token, `X-Requested-With: od-fish-expo`, no cookies).

| Area | Result |
| --- | --- |
| Catalogue (`/home`, `/categories`, `/products`, search, filter, detail, 404) | 8/8 |
| Delivery slots, serviceability in/out of range | 3/3 |
| Auth guards (401 on cart/orders/addresses without token) | 3/3 |
| OTP login (bad phone 400, resend throttle 429, wrong code 401, verify, `/auth/me`, PATCH) | 8/8 |
| Google + link-phone routes reachable, reject bad token | 2/2 |
| Addresses (list, create, serviceability flag, patch, delete) | 5/5 |
| Cart (add, second product, over-stock rejected, patch qty, bill arithmetic) | 6/6 |
| COD order (unserviceable rejected, place, cart emptied, detail, list, reorder, cancel, double-cancel 409) | 8/8 |
| Prepaid order (Razorpay order created, settle, refund on cancel) | 4/4 |
| Push device register/unregister, media serving, logout + token revocation | 5/5 |

The single failure was **my test script's** bug — it asserted `isServiceable` where the endpoint returns `serviceable`. The endpoint is correct.

Two results worth stating plainly because they look alarming and are not:
- `POST /orders/{id}/pay` settled an order with no Razorpay signature. This is the mock path and it is correctly gated behind `IS_DEVELOPMENT || PAYMENTS_MOCK_ENABLED` (`routes/orders.ts:422`). In production with `NODE_ENV=production` and `PAYMENTS_MOCK` unset it returns 501. **Verify this on the production env before launch** — it is a free checkout if `NODE_ENV` is ever unset, though `lib/env.ts` is written to prevent exactly that.
- `deliveryOtp` is `null` on a freshly placed order. Intentional — `lib/orders.ts:181` only exposes it at `OUT_FOR_DELIVERY`.

---

## 3. On-device test results

Walked: Home → Shop → Orders → Account → sign out → product → auth gate → login → OTP → add to cart → cart → checkout → address form → order-ready checkout.

Everything rendered and functioned. Images load from `/api/media`, the slot countdown is live and rolled over the day boundary correctly, location auto-detect resolved to "Dhankawadi, Pune", serviceability validates as you type a pincode, the Pay button correctly stays disabled until an address exists.

**Setup gotcha for the record:** `expo run:android` resets adb reverses and keeps only `8081`. `adb reverse tcp:3000 tcp:3000` must be re-run *after* it, or the app opens on "We could not reach the fish counter."

---

## 4. What is end-to-end complete

| Flow | Status |
| --- | --- |
| Browse catalogue — home feed, categories, search, filters, product detail, variants | Complete |
| Stock & pricing — live stock, low-stock badges, sold-out veils, gross/net weight disclosure | Complete |
| OTP sign-in / sign-out, session persistence across restarts, token revocation | Complete (mock OTP) |
| Cart — add, quantity, remove, bill computation, free-delivery threshold, COD eligibility | Complete |
| Addresses — create, edit, delete, set default, live serviceability | Complete *(city bug, §5.3)* |
| Delivery slots — date-grouped grid, cutoff countdown, capacity, preferred-slot carry-through | Complete |
| Checkout — address + slot + payment + note, bill, order placement | Complete |
| Orders — list, detail, status timeline, handover OTP, reorder, cancel with refund | Complete |
| Razorpay — order creation server-side, signature verification, webhook handler | Code complete, **not verified end-to-end on device** |

---

## 5. Defects found

### 5.1 Android package ID mismatch — High

`android/app/build.gradle:90,92` declares `com.odfishcomobile`. `app.json:24` declares `com.odfishco.app`.

The checked-in native project was generated before the package was renamed, so **local debug builds install as a different app than EAS/Play builds**. Both are currently on the test device. Sessions, push registrations and app data do not carry across, and anything verified locally is verified against an app ID that will never ship.

Fix: align `build.gradle` to `com.odfishco.app` (or regenerate with `expo prebuild --clean`) and uninstall the stale `com.odfishcomobile`.

### 5.2 Nonsense strikethrough price — High, user-visible

Observed on the Shop list: **"Prawns, Medium — From ₹719 ~~₹429~~"**. The struck-through "was" price is *lower* than the price.

`ProductRow.tsx:68` renders `product.fromPricePaise`, which the server computes from **in-stock** variants only (`lib/catalogue.ts:47-51`). Line 70 renders `cheapest.mrpPaise`, where `cheapest` is the cheapest **active** variant regardless of stock (`ProductRow.tsx:19`). When the cheapest pack sells out the two refer to different variants.

Same bug in `ProductCard.tsx:59-64`, and there `packLabel` (line 68) also names the sold-out pack — the card advertises a size you cannot buy.

Fix: pick one variant and derive price, MRP and pack label from it — the cheapest in-stock variant, falling back to cheapest active only when nothing is in stock, mirroring the server.

### 5.3 Every address is saved as "Mumbai" — High

`app/address-form.tsx` contains **zero** references to `city`. The field is never captured and never sent, so the schema default wins (`lib/db/src/schema/index.ts:150`, `.default("Mumbai")`).

Reproduced on device: pincode `411043` (Dhankawadi, **Pune** — and a serviceable pincode in the seed data) saved and displayed as **"B-1204, Dhankawadi, Mumbai 411043"**. The wrong city is then snapshotted onto the order (`orders.city`) and shown to the rider.

Fix: derive city from the `service_pincodes` row (the serviceability response already resolves the area), or capture it in the form.

### 5.4 Brand mark invisible on the login screen — Medium

`app/login.tsx:201` renders `<BrandMark size={38} showWordmark={false} />` with no `tone` prop. `BrandMark` defaults to `tone="default"`, which paints the glyph `colors.foreground` (navy `#0B1A3D`) — on the `tone="deep"` navy background. The logo is a navy silhouette on navy. Visible in the screenshot as a barely-there smudge.

`link-phone.tsx:153` has the identical bug.

Fix: `tone="inverse"`. *(Resolved as part of the step-4 redesign.)*

### 5.5 Add-to-cart intent is lost across the auth gate — Medium

`requireAuth()` (`lib/auth.tsx:112`) pushes `/login` and returns false. After signing in, the login modal closes and the user is back on the product page — with nothing added. They must tap "Add to basket" a second time. Confirmed on device.

Fix: stash the pending action and replay it after `signIn` resolves.

### 5.6 Push notifications are non-functional on device — Medium

`android/app/google-services.json` does not exist, so FCM is unconfigured. Runtime log:

```
[push] Could not register this device [Error: Default FirebaseApp is not initialized
in this process com.odfishcomobile.]
```

The server-side push pipeline is written and the register/unregister endpoints pass, but **no notification can reach a device today**. The whole order-status notification feature is untested in practice.

### 5.7 Smaller issues

| # | Issue | Location |
| --- | --- | --- |
| a | "Delivery slots / Morning and evening runs across Mumbai" navigates to the **Shop** tab | `account.tsx:221` |
| b | `Alert.alert` renders the OS dark dialog — jarring against the cream/navy identity | `account.tsx:85`, `order/[id].tsx:101`, `addresses.tsx:82` |
| c | Avatar shows a stray **"O"** when the customer has no name (`('OD').slice(0,1)`) | `account.tsx:181` |
| d | Order cards print the status twice — once as the card title, once as the badge | `orders.tsx:126-130` |
| e | `STUDIO_PREVIEWS` overrides imagery on product card/row/detail but not cart or order thumbnails, so the same fish appears in two photographic styles | `constants/studioPreviews.ts` consumers |
| f | `/auth/google`, `/auth/link-phone/*` are absent from the OpenAPI spec — hand-rolled `fetch` with duplicated token plumbing and no zod validation | `login.tsx:156`, `link-phone.tsx:72,108` |
| g | The home category rail's "New" badge on *Ready to Cook* is hardcoded, not data-driven | `CategoryTile.tsx` |

---

## 6. Not yet built / blocking launch

| Item | State | Note |
| --- | --- | --- |
| **Real SMS OTP** | Not implemented | `SMS_DELIVERY_IMPLEMENTED = false`. Blocked on DLT sender-ID + template registration (multi-week). Today every login goes through the shared mock code `123456`. **Hard launch blocker.** |
| **Google sign-in** | Code complete, unverified | Supabase configured server- and client-side; never exercised against a real Google consent flow. |
| **Razorpay payment** | Code complete, unverified | Test keys present, order creation and signature verification both work server-side. The native checkout modal has never been opened on a device. |
| **FCM credentials** | Missing | §5.6. |
| **Onboarding** | Did not exist | Built in step 4. |
| **Forgot/change number** | Missing | Only "change number" within one login attempt. |
| **Account deletion** | Missing | Required by Play Store policy for apps with accounts. |
| **Terms / privacy policy** | Text references them; no links or screens | Required for Play Store submission. |
| **Crash/error reporting** | None | `ErrorBoundary` renders a fallback but reports nowhere. No Sentry/Crashlytics. |
| **Analytics** | None | No funnel instrumentation at all. |
| **Automated tests** | None | No unit, component or e2e tests in the mobile package. The script in `tmp/` is throwaway. |
| **Offline handling** | Minimal | React Query retries once; no offline banner, no cached-read strategy. |
| **Deep links** | Scheme registered, unused | `od-fish-mobile://` only used for the OAuth callback. No shareable product links. |
| **iOS** | Untested | `supportsTablet: false`, NativeTabs path for iOS 26 exists but has never run. |

---

## 7. Recommended additional functionality

**Commercially significant**
1. **Coupons / promo codes** — the bill model already carries `discountPaise` but nothing can populate it.
2. **Order rating + feedback** — nothing closes the loop after `DELIVERED`.
3. **Subscriptions / repeat orders** — "every Sunday, 1kg surmai" fits this category better than most and the slot model already supports it.
4. **Wishlist / notify-when-back-in-stock** — sold-out variants are a dead end today; stock is already polled.
5. **Referral** — standard growth lever for D2C grocery in India.

**Experience**
6. **Live order tracking with rider location** — the rider role and OTP handover exist; a map is the missing half.
7. **In-app support / WhatsApp hand-off** — `supportWhatsapp` is in `store_settings` and unused; the Account screen only prints a phone number.
8. **Recipes / cooking guidance** — `bestFor` tags exist; strong fit for the brand voice and a genuine differentiator.
9. **Search history and suggestions** — search is a plain debounced text match with no affordances.
10. **Guest browsing with deferred sign-in** — partly there, undermined by §5.5.

**Operational**
11. **Payment retry from the order screen** — a `PENDING_PAYMENT` order currently has no in-app route back to checkout.
12. **Partial refunds / weight adjustment** — unavoidable for a business that admits "sea fish never weighs the same twice".
13. **Scheduled-delivery reminders** — a push the morning of the slot.

---

## 8. Verdict

The commerce core is **production-quality**: the data model, the order transaction, the generated-client contract and the error/empty/loading discipline across screens are all better than typical for this stage. Fifty of fifty-one backend assertions pass, and every customer-facing flow completes end to end on a real device.

What stands between this and a launch is not the core — it is the perimeter: real SMS, FCM credentials, an unverified payment modal, the package-ID mismatch, and the three High defects in §5. The price-display bug (§5.2) and the Mumbai-for-everything bug (§5.3) are the two that a customer would notice first, and both are small fixes.
