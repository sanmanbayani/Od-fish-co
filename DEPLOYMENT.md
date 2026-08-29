# Deploying OD Fish Co.

Target topology:

| Piece | Runs on | Notes |
| --- | --- | --- |
| Postgres | Supabase (Seoul, `ap-northeast-2`) | Already live. Nothing to move. |
| API server | Render | Express, also serves product images under `/api/media`. |
| Website (landing + admin + rider) | Vercel | Static Vite build. |
| Consumer app | Not hosted | Expo/React Native. Reaches phones through EAS builds and the app stores. |

Render and Vercel both deploy from GitHub (`sanmanbayani/Od-fish-co`, branch `main`), so
every push to `main` redeploys both.

**Follow the steps in order.** Step 4 depends on URLs that do not exist until steps 2 and 3
have run, and bringing them up out of order will crash the API on boot — see the note there.

---

## 1. Push to GitHub

```bash
git add -A
git commit -m "Add Render and Vercel deployment configuration"
git push origin main
```

## 2. API server on Render

Render → **New → Blueprint** → pick this repository. It reads `render.yaml` and will prompt
for three values marked `sync: false`:

| Variable | Where to find it |
| --- | --- |
| `SUPABASE_DB_HOST` | Replit → Secrets/env, or Supabase → Settings → Database → Connection pooling. Looks like `aws-0-<region>.pooler.supabase.com`. |
| `SUPABASE_DB_USER` | Same place. Looks like `postgres.<project-ref>`. |
| `SUPABASE_DB_PASSWORD` | Your Supabase database password. |

Use the **pooler** host, not the direct one — the direct connection is IPv6-only and will
never work from Render.

Everything else (`NODE_ENV`, `NODE_VERSION`, `LOG_LEVEL`) is already in the blueprint.

**Decide about `DATABASE_CA_CERT` now, not later.** Without it the database connection is
encrypted but the server's identity is unverified — anything between Render and Supabase could
impersonate your database. Supabase → Settings → Database → SSL Configuration gives you the
certificate; paste its contents as a `DATABASE_CA_CERT` environment variable. It is left out of
the blueprint only so a first deploy cannot be blocked by a missing file. If you skip it for the
demo, treat it as a launch blocker, because it cannot be added silently later without a redeploy.

When the service goes green, **copy the URL Render shows you** — do not assume it. Render only
uses the `name` in `render.yaml` as a starting point and appends a suffix if that name is
already taken, so your host may not be `od-fish-api.onrender.com`. Every later step reuses this
exact value; call it `<API_URL>` from here on.

```bash
curl <API_URL>/api/healthz     # {"status":"ok"}
```

## 3. Website on Vercel

Vercel → **Add New → Project** → import the same repository.

- **Root Directory:** leave as the repository root. This is a pnpm workspace; the website
  depends on `@workspace/api-client-react`, so installing from inside `artifacts/od-fish-web`
  will not resolve.
- **Framework Preset:** Other. `vercel.json` supplies the install command, build command and
  output directory.
- **Environment variable:**

  | Variable | Value |
  | --- | --- |
  | `VITE_API_BASE_URL` | `<API_URL>` from step 2 (no trailing slash) |

  This one switch does three things: points the API client at Render, flips `fetch` to
  `credentials: "include"` so the session cookie travels, and prefixes `/api/media/...` image
  paths through `mediaUrl()`. Without it the site silently calls itself and every request 404s.

Deploy, then note the assigned `https://<project>.vercel.app` URL.

## 4. Let the two talk to each other

The API rejects browser requests from origins it does not know, so it needs the Vercel URL.
In the **Render dashboard → Environment**, add:

| Variable | Value |
| --- | --- |
| `WEB_ORIGINS` | `https://<project>.vercel.app` (no trailing slash; comma-separate more) |
| `CROSS_SITE_COOKIES` | `true` |

Save, and let Render redeploy.

> **Why this is a separate step.** `CROSS_SITE_COOKIES=true` relaxes the session cookie to
> `SameSite=None`, which is only safe behind a strict origin allow-list — so the server
> *refuses to boot* if it is set without `WEB_ORIGINS`. On the first deploy the Vercel URL does
> not exist yet. Setting both in the blueprint would crash step 2. Add them only once you have
> the real URL.

Then confirm an admin can actually sign in at `https://<project>.vercel.app/admin`. A green
health check in step 2 says the API is alive; it says nothing about whether the browser is
allowed to talk to it. Signing in is the only check that covers this step.

> **Vercel preview deployments will not be able to sign in.** Every pull request gets its own
> `*-git-*.vercel.app` URL, and none of them are in `WEB_ORIGINS`, so authenticated requests
> from a preview are refused. Public pages still render. Either add specific preview URLs to
> `WEB_ORIGINS` when you need to test admin work on one, or do that testing locally.

## 5. Point the mobile app at Render

In `artifacts/od-fish-mobile/.env` (and in your EAS build profile):

```
EXPO_PUBLIC_DOMAIN=<the host part of API_URL, e.g. od-fish-api-a1b2.onrender.com>
```

Hostname only — no `https://`, no trailing slash. The app builds the URL itself.

The mobile app authenticates with bearer tokens rather than cookies, so none of the
cross-site cookie machinery above affects it.

---

## Environment variable reference

**Render (API server)**

| Variable | Required | Purpose |
| --- | --- | --- |
| `SUPABASE_DB_HOST` / `SUPABASE_DB_USER` / `SUPABASE_DB_PASSWORD` | yes | Database. All three or none — a partial set refuses to boot rather than silently using the wrong database. |
| `NODE_ENV=production` | yes | Set by the blueprint. |
| `WEB_ORIGINS` | yes, once the site is up | Comma-separated allow-list of frontend origins. |
| `CROSS_SITE_COOKIES=true` | yes, while on `.vercel.app` + `.onrender.com` | Needed because the two are different registrable domains. |
| `DATABASE_CA_CERT` | before launch | Verifies the database's TLS identity. Without it traffic is encrypted but the server is unauthenticated. Supabase → Settings → Database → SSL Configuration. |
| `LOG_LEVEL` | no | Defaults to `info`. |
| `DATABASE_POOL_MAX` | no | Lower it if Supabase reports pooler exhaustion. |
| `AUTH_MOCK_OTP` | demo only | A 6-digit code that signs in **any** phone number. Never set at launch. |
| `PAYMENTS_MOCK` | demo only | Marks prepaid orders paid with no money moving. Never set at launch. |

**Vercel (website)**

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | yes | Base URL of the Render API. |

**Expo (mobile)**

| Variable | Required | Purpose |
| --- | --- | --- |
| `EXPO_PUBLIC_DOMAIN` | yes | API hostname, without scheme. |

---

## Known limitations of this setup

These are consequences of the free-tier, no-custom-domain choice — all fixable later.

1. **The API sleeps.** Render's free plan spins down after ~15 minutes idle; the next request
   waits roughly 50 seconds. Fine for demos, not for customers. A paid instance (~$7/mo)
   removes it.
2. **Safari may drop admin sessions.** `*.vercel.app` and `*.onrender.com` are different
   registrable domains, so the session cookie is third-party. Safari blocks those by default,
   which shows up as random logouts in the admin console. `CROSS_SITE_COOKIES=true` is the best
   available workaround, not a fix. Putting both behind one domain — `odfishco.in` and
   `api.odfishco.in` — removes the problem entirely and lets you set `CROSS_SITE_COOKIES=false`.
3. **Images ship inside the repo.** 59 MB of product photos live in
   `artifacts/api-server/public/media` and are served by the Node process. There is no upload
   endpoint, so adding a product photo means a commit and a redeploy — your client cannot do it
   from the admin console. Moving these to object storage is the fix, and it is also required
   before adding uploads: Render's filesystem is ephemeral, so anything written at runtime
   disappears on the next deploy.
4. **The database is in Seoul.** Roughly 260 ms per round trip from Indian users. Render's
   Singapore region shortens the API-to-database hop, but recreating the Supabase project in
   Mumbai (`ap-south-1`) is the real fix, and it is cheapest to do while the order table is
   still empty.

## Before real customers

- Set `DATABASE_CA_CERT`.
- Unset `AUTH_MOCK_OTP` and `PAYMENTS_MOCK`.
- Rotate the four seeded staff passwords, and stop sharing one password across admin, ops and
  rider roles.
- Complete DLT/TRAI registration for OTP SMS and payment-gateway KYC (which needs the four
  policy pages published, with the placeholder copy replaced).
