---
name: Ambient Replit domains outrank deliberate config
description: Why an explicitly-set EXPO_PUBLIC_DOMAIN must be checked before REPLIT_DEV_DOMAIN / REPLIT_INTERNAL_APP_DOMAIN, and the class of bug that ordering causes.
---

# Explicit configuration must win over ambient environment

Anything that resolves an API host by falling through a list of candidates must check the
deliberately-set variable *first*, and only then the Replit-provided ones.

**Why:** `REPLIT_DEV_DOMAIN` and friends are ambient — they are present in every shell and
every process inside the workspace, always, whether or not anyone wanted them. A fallback
chain that tries them before an explicitly-set value can therefore never reach the explicit
value while running here. Setting the intended host appears to do nothing, with no error.

The damage is delayed rather than immediate: a mobile build produced in the workspace bakes
in a development URL that resolves fine during testing and then dies the moment the workspace
sleeps. That surfaces as "the app my client installed stopped working", far from the cause.

**How to apply:** this applies to the mobile build script and to any future deploy or codegen
script that picks a host. Ambient values are the *fallback*, never the preference. The same
reasoning applies to the dev script: default to the Replit domain, but let an explicitly
exported value override it rather than hard-coding the assignment.

# Browser-based testing needs the local API, the phone does not

With the app pointed at the production API host, the Expo *web* preview cannot load data:
the production CORS allowlist only admits the real website origin, and the browser enforces
it. Native phones ignore CORS entirely, so the same build works fine in Expo Go.

**How to apply:** to run the Playwright tester (or any browser) against the Expo web build,
temporarily remove the explicit domain so the app falls back to the workspace API — same
database, same code — then restore it and restart the expo workflow when done. Do not add
dev origins to the production allowlist for this.

The explicit value can also arrive as a *workspace shared env var* (set through the env pane),
not just a shell export — the dev script's `${EXPO_PUBLIC_DOMAIN:-$REPLIT_DEV_DOMAIN}` default
never fires while it exists. Symptom: the web preview hangs on its loading skeleton and the
local API log shows *zero* incoming requests (the browser is talking to the production host and
CORS eats the response client-side). Fix: delete the shared var and restart the expo workflow;
builds made on the user's own machine keep their own `.env`, so they are unaffected.

# Verifying an EXPO_PUBLIC_* change actually took effect

Restarting Metro is not proof. These variables are inlined into the bundle at transform time
and Metro caches transforms, so a stale host can survive a restart.

Two checks that are actually conclusive: read `/proc/<pid>/environ` of the running expo
processes to confirm the value reached them, then request a real bundle from Metro and grep
it for both the intended host and the one it replaced. Metro's server root is the monorepo
root, not the artifact directory, so the bundle path must include the artifact directory —
requesting the wrong path returns a small `UnableToResolveError` JSON body with status 200,
which is easy to mistake for a tiny bundle.
