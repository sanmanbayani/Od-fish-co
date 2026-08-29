---
name: Codegen and build traps
description: Two recurring time sinks in this monorepo — generated query hooks needing explicit queryKeys, and cross-package errors that are really stale lib builds.
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
