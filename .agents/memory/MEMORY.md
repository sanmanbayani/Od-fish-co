# Project memory

- [OD Fish Co. product shape](od-fish-domain.md) — surfaces, money in paise, the pack/weight rule, and why a slot id alone never identifies a delivery.
- [Trust boundaries](trust-boundaries.md) — what the client is never allowed to assert, and why the handover OTP is customer-only.
- [Reaching the real database](db-access.md) — the sandbox SQL callback answers from a different, stale database; use the app's own connection.
- [Codegen & build traps](codegen-build-traps.md) — the two non-obvious ways this monorepo wastes an hour: generated-hook queryKeys and stale lib builds.
- [Auth transport per surface](expo-auth-transport.md) — cookies on web, bearer tokens on mobile; a deliberate split, not an inconsistency.
- [Hosting topology decisions](cross-origin-deployment.md) — why the API must be always-on, and why both surfaces need one registrable domain.
- [Parallelising web work](web-surface-conventions.md) — the shared router is the one file every frontend feature touches; stub routes before dispatching agents.
- [Ambient vs explicit API host](expo-public-domain-precedence.md) — Replit's domain vars are set everywhere, so a fallback chain silently ignores the host you meant to use.
- [Expo surface conventions](mobile-surface-conventions.md) — sticky footers must ride the keyboard, and the failure-state rules every consumer screen is held to.
