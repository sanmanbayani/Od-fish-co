# Project memory

- [OD Fish Co. product shape](od-fish-domain.md) — the three surfaces, why money is paise, and the pack/weight rule that drives the whole catalogue.
- [Trust boundaries](trust-boundaries.md) — what the client is never allowed to assert, and why the handover OTP is customer-only.
- [Codegen & build traps](codegen-build-traps.md) — the two non-obvious ways this monorepo wastes an hour: generated-hook queryKeys and stale lib builds.
- [Auth transport per surface](expo-auth-transport.md) — cookies on web, bearer tokens on mobile; a deliberate split, not an inconsistency.
- [Hosting topology decisions](cross-origin-deployment.md) — why the API must be always-on, and why both surfaces need one registrable domain.
- [Parallelising web work](web-surface-conventions.md) — the shared router is the one file every frontend feature touches; stub routes before dispatching agents.
