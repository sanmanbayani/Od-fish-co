---
name: Codegen and build traps
description: Recurring time sinks in this monorepo — generated query hooks needing explicit queryKeys, cross-package errors that are really stale lib builds, silent spec drift, and the error body arriving on ApiError.data.
---

# Generated query hooks need an explicit queryKey

Every generated TanStack Query hook must be given a `queryKey` in its `query` options, even
though the generator emits a default. Omitting it is a **compile** error, not a runtime one.

**Why it matters:** it is easy to write an entire screen before `tsc` tells you, and the
error text points at the hook rather than at the missing option.

**How to apply:** write the key as you write the call, and keep keys stable across screens
so post-mutation invalidation actually hits them.

# A cross-package type error is usually a stale build

Shared `lib/*` packages are composite TS projects; project references resolve to build
output, not source. When an app fails to typecheck against a symbol you know exists, or
Vite reports `Failed to load url /@fs/…/src/generated/… Does the file exist?`, the lib has
not been rebuilt or codegen has not finished.

**How to apply:** build the workspace before believing a cross-package type error. Do not
"fix" it by changing Vite config or by editing generated files.

# The spec is the source of truth, and drift is silent

The OpenAPI spec drives both the client and the expectations of the frontends, but nothing
checks the Express handlers against it. A route registered with a different HTTP verb than
the spec declares produces a clean 404 at runtime and a perfectly happy typecheck — the
generated client is type-correct, it is just calling a method the server never registered.

**How to apply:** when a console action 404s but the handler clearly exists, diff the verb
and path against the spec before debugging anything else.

# The server's error sentence arrives on `.data`, not on the error

The API answers failures with `{ error, code }`. The generated client wraps every failure in
an `ApiError` whose **`.data`** holds that parsed body. `err.error` is therefore always
`undefined`, and a handler written as `err.error || "Unknown error"` silently shows its own
fallback for every refusal the server took care to explain.

**Why it matters:** this is invisible in review and in typecheck — `onError: (err: any)`
accepts anything — and it looks exactly like a server bug. A precise 400 (`rider_required`,
`illegal_transition`, `handover_required`) reaches the desk as "Unknown error", so the person
testing concludes the product is broken when the rule was working as designed.

**How to apply:** never read fields off a caught request error directly. Route every failure
through `apiErrorMessage(err, fallback)` in the web app's `lib/api-error.ts`, which reads only
the contract's own `error` field — a proxy's HTML page or an upstream's internal `message`
must fall back rather than reach a staff screen. When a rule refuses an action the UI offers,
also disable the control and say why, so the refusal is visible before the click, not after.

## Running a one-off script that talks to the database

Scripts that import the db lib pull in `pg`, and that decides how they must be built.

- Bundle to **CJS** (`esbuild --bundle --format=cjs --platform=node`). An ESM bundle dies at
  runtime with `Dynamic require of "events" is not supported`, because pg requires node
  builtins dynamically. CJS output means no top-level await, so wrap the script body in an
  `async function main()` and call it.
- `--packages=external` is not the escape hatch it looks like. The db lib's package entry
  resolves to TypeScript source containing directory imports (`./schema`), which node refuses
  with `ERR_UNSUPPORTED_DIR_IMPORT`. Bundling is what makes those imports work.
- `--external:pg` fails too: pg is not a direct dependency of the api-server package, so node
  cannot resolve it from there. It has to be inlined.
- esbuild lives only at `artifacts/api-server/node_modules/.bin/esbuild`. There is no `tsx`.

**Why:** each of these looks like the obvious fix for the previous one, so it is easy to burn
an hour cycling through all four.

**How to apply:** pick fixtures (an in-stock variant, an open slot, a serviceable pincode, two
active riders) by querying the tables directly rather than calling list endpoints and guessing
whether they answer with an array or a wrapper object. The endpoints are worth exercising in
the flow itself; they are a poor way to go shopping for test data.
