# OD Fish Co.

A direct-to-consumer fresh seafish business for Mumbai: customers order cut-to-order fish
from an Expo mobile app, staff run inventory and orders from an admin console, and riders
complete OTP-confirmed doorstep handovers.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API server
- `pnpm --filter @workspace/od-fish-web run dev` — landing page + admin + rider console
- `pnpm --filter @workspace/od-fish-mobile run dev` — Expo consumer app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run seed` — reseed catalogue, slots, pincodes, staff
- Required env: `DATABASE_URL` (Postgres connection string), `SESSION_SECRET`, and an
  explicit `NODE_ENV`. See `.env.example` for the full list including the temporary
  demo mocks (`AUTH_MOCK_OTP`, `PAYMENTS_MOCK`) and database TLS settings.

Each surface runs as its own workflow. Restart the matching workflow after changing that
package.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec) → typed TanStack Query hooks
- Web: React + Vite + Tailwind
- Mobile: Expo + expo-router
- Build: esbuild

## Where things live

- `artifacts/api-server` — Express API, route modules, auth, seed script, product media
- `artifacts/od-fish-web` — landing page (`/`), admin console (`/admin/*`), rider console (`/rider/*`)
- `artifacts/od-fish-mobile` — Expo consumer app (catalogue, cart, checkout, orders)
- `lib/db` — Drizzle schema. **Source of truth for the data model.**
- `lib/api-spec` — OpenAPI spec. **Source of truth for the API contract.** Codegen reads this.
- `lib/api-client-react` — generated typed hooks plus the fetch wrapper that holds base URL and auth
- Design tokens: `artifacts/od-fish-web/src/index.css` (web), `artifacts/od-fish-mobile/constants/colors.ts` and `constants/typography.ts` (mobile). Keep the two palettes in sync by hand.

## Architecture decisions

- **All money is integer paise, and the server computes every total.** Clients post only
  `{variantId, quantity}` and render the bill the server returns. Never total anything in
  client code.
- **Fixed packs with disclosed weight ranges.** Each variant carries a gross weight and a
  net edible weight *range*. Sea fish loses a lot to cleaning and never weighs the same
  twice, so we price the pack, not the gram, and show the range before purchase.
- **A slot id is not a delivery.** A slot row is a *recurring window* ("7 PM – 10 PM"); the
  API expands it into one instance per upcoming day, so several instances share one id.
  Every endpoint, query, React key and capacity check must use the pair (slot id, delivery
  date). Matching on the id alone silently resolves to the earliest instance — that has
  already scheduled a tomorrow order for today, and shown today's booking count against
  tomorrow's row on the admin board. Both looked plausible on screen.
- **Auth transport differs by surface.** Staff on web use httpOnly cookies; the Expo app
  uses a bearer token in AsyncStorage. React Native has no dependable cross-platform
  cookie jar, and httpOnly is the right XSS posture on web.
- **The database is deliberately portable.** Everything reaches Postgres through one
  resolver: the `SUPABASE_DB_HOST` / `SUPABASE_DB_USER` / `SUPABASE_DB_PASSWORD` trio when
  all three are set, otherwise `DATABASE_URL`. The trio exists because a password embedded
  in a URI has to be percent-encoded, and a mis-encoded one surfaces as "password
  authentication failed" — which sends you hunting the wrong problem. A half-filled trio
  refuses to boot rather than quietly reading and writing the wrong database.
- **Errors use one contract: `{ error, code }`.** Clients read `code` for branching and
  `error` for display.
- **Landing, admin, and rider share one web app** because staff tools share a session and
  a design system. Only the consumer app is separate.

## Product

- **Consumer app** — phone-OTP login, saved addresses with pincode serviceability, browse
  and search the catalogue (English and Marathi names), pack picker with gross/net weight
  disclosure, cart with server-computed bill, slotted checkout with COD/UPI/Card, order
  history, live order tracking, and a delivery OTP the customer reads to the rider.
- **Admin console** — product and variant CRUD, stock and low-stock management, order
  pipeline and status transitions, service areas and pincodes, delivery slots, staff.
- **Rider console** — assigned deliveries and OTP-confirmed handover.
- **Landing page** — public storefront and brand page.

## User preferences

- Brand: navy line-art fish logo forming "O" + "D" on cream. Tagline: "Elevating Fresh
  Seafish, Every Day."
- UI reference points: Licious and Zomato — dense, photo-led, fast.
- Keep hosting and the database portable; do not adopt anything that cannot be repointed
  via `DATABASE_URL`.
- Time-to-first-output matters. Ship a working surface, then refine.

## Gotchas

- **Generated query hooks need an explicit `queryKey`** in the `query` options object or
  `tsc` fails. Generated mutation argument shapes vary by route — check the signature
  rather than assuming `{ data }`.
- **Build shared libs before dependents.** A cross-package type error, or a Vite
  `Failed to load url /@fs/…/src/generated/…` pre-transform error, usually means codegen
  or the lib build has not finished — not that the code is wrong.
- **Express router prefixes.** Middleware mounted on the app sees the full path; middleware
  inside a prefixed router sees it stripped. Mismatches fail as a silent 404 or an auth
  check that never fires.
- **Expo imports the API config module first** in the root layout. Move it and early
  requests go out unauthenticated.
- **Payments and SMS are in test mode, and both fail closed by default.** In development
  login OTPs come back in the API response and prepaid orders settle against a stand-in
  endpoint. On any other environment, with no provider and no mock configured, OTP
  requests return `sms_not_configured` and the settlement route returns
  `gateway_not_configured` rather than degrading to the insecure path. Going live needs
  DLT/TRAI SMS registration and payment-gateway KYC, which itself requires four policy
  pages published first. Wire the gateway as a signed webhook — never as a
  customer-callable route.
- **The demo mocks are opt-in and must not reach launch.** `AUTH_MOCK_OTP` (a 6-digit
  shared code that signs in *any* phone number) and `PAYMENTS_MOCK` (marks prepaid orders
  paid with no money moving) exist so the product is demoable before those registrations
  clear. They are two separate flags on purpose: demo logins should not silently also
  mean free checkout. The API logs a warning on every boot while either is set, and the
  mobile login screen shows a notice. Unset both before real customers.
- **Verify the database's TLS certificate before launch.** The Supabase pooler presents a
  self-signed chain, so without `DATABASE_CA_CERT` the connection is encrypted but the
  server's identity is unproven — anything sitting between the API and the database could
  impersonate it. Download the CA from the Supabase dashboard (Settings → Database → SSL
  Configuration) and set `DATABASE_CA_CERT` to its contents. The API warns on every boot
  until you do.
- **Gating is by allow-list, never by absence.** `IS_DEVELOPMENT` names the safe
  environments (`development`, `test`); anything else — including an unset `NODE_ENV` —
  counts as public. Never reintroduce a `NODE_ENV !== "production"` check; it fails open
  on the first deploy that forgets the variable.
- **CORS and cookie SameSite move together.** `cors({ origin: true, credentials: true })`
  is confined to local development. Any other environment uses the `WEB_ORIGINS`
  allow-list, because reflecting an arbitrary origin while allowing credentials lets any
  website act as a signed-in admin. Relaxing cookies to `SameSite=None` for a
  cross-domain frontend removes the browser's own protection against that, so
  `CROSS_SITE_COOKIES=true` refuses to boot without `WEB_ORIGINS`. Do not loosen one
  without the other.
- **CORS is not the CSRF defence; `requireTrustedOrigin` is.** CORS decides who may *read* a
  reply, not who may *send* a request — a cross-site form post needs no preflight. Once
  cookies go `SameSite=None` that gap is real, so unsafe requests carrying a session cookie
  must have a trusted `Origin`. Login routes are checked too even though they arrive without
  a cookie: otherwise a hostile page can log a victim into an attacker's account. Requests
  with no `Origin` at all are non-browser callers (Expo, curl) and stay allowed, which is
  what keeps the mobile app working.
- **Host both surfaces under one registrable domain.** `odfishco.in` +
  `api.odfishco.in`, not `*.vercel.app` + `*.railway.app`. Different registrable domains make
  the session cookie a third-party cookie, which Safari blocks by default — correct CORS and
  `SameSite=None` still produce intermittent, browser-specific logouts.
- **The web app assumes a same-origin API unless told otherwise.** Requests are
  root-relative `/api/...` and rely on the browser attaching the cookie. Deploying the
  site apart from the API needs `VITE_API_BASE_URL` on the web build — that single switch
  sets the client base URL, flips `fetch` to `credentials: "include"`, and prefixes
  server-supplied `/api/media/...` image paths via `mediaUrl()`.
- **The handover OTP is customer-only.** It is deliberately absent from every staff-facing
  serializer and compared server-side at the door. Do not add it to an admin or rider
  payload "for convenience".
- **Order state transitions are conditional** (`WHERE id = ? AND status = ?`) and checkout
  serialises on consuming the cart rows. A "no row updated" result is a real conflict the
  user should see, not something to retry past.
- **Rotate the seeded staff passwords before real orders.** The seed creates demo admin,
  ops, and rider accounts with a shared known password.

## Deploying

Production runs the API on Render and the website on Vercel, with Postgres staying on
Supabase. `render.yaml` and `vercel.json` hold the build configuration; **`DEPLOYMENT.md`**
has the step-by-step. Read it before changing either file — the two services must be brought
up in a specific order, because the API refuses to boot with `CROSS_SITE_COOKIES=true` until
`WEB_ORIGINS` names the Vercel URL, which does not exist on the first deploy.

Note that `vite.config.ts` only demands `PORT` and `BASE_PATH` when running a dev server.
A build has neither, and requiring them unconditionally breaks Vercel at its first step.
