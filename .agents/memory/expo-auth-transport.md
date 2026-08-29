---
name: Auth transport differs per surface
description: Cookies on web, bearer tokens on mobile — a deliberate split to preserve, not an inconsistency to unify.
---

Staff on web authenticate with **httpOnly cookies**. The consumer mobile app authenticates
with a **bearer token**.

**Why:** httpOnly cookies are right on web because JavaScript cannot read them, which kills
a whole class of token theft. React Native has no dependable cross-platform cookie jar, so
mobile carries an explicit token instead.

**How to apply:** do not "unify" these onto one transport without re-examining the web XSS
story first. The shared generated client is configured differently per surface by design.

**Known gap:** the mobile token is persisted in plaintext device storage. Moving it to
secure device storage is a real production hardening step, not a stylistic one.
