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

# Verifying an EXPO_PUBLIC_* change actually took effect

Restarting Metro is not proof. These variables are inlined into the bundle at transform time
and Metro caches transforms, so a stale host can survive a restart.

Two checks that are actually conclusive: read `/proc/<pid>/environ` of the running expo
processes to confirm the value reached them, then request a real bundle from Metro and grep
it for both the intended host and the one it replaced. Metro's server root is the monorepo
root, not the artifact directory, so the bundle path must include the artifact directory —
requesting the wrong path returns a small `UnableToResolveError` JSON body with status 200,
which is easy to mistake for a tiny bundle.
