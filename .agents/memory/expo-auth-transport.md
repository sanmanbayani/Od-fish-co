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

# The phone holds a session cookie anyway

The login response sets a cookie for the web surface, and React Native's networking layer
stores it and attaches it to every later request of its own accord. "Carries a session
cookie" therefore does **not** mean "is a browser".

**Why:** any middleware that infers a browser from the presence of a cookie — a CSRF origin
check being the obvious one — sees native traffic as a browser that lost its `Origin`
header, because a native client never sends one. The two conditions always coincide on
mobile, so every write from the app is refused. It only bites where cross-site cookies are
switched on, which is production, so a local run will never reproduce it.

**How to apply:** key such checks on the credential that actually carries ambient authority.
A request presenting a bearer token cannot have been forged by a hostile page — adding that
header forces a preflight the browser will not grant — so let it past before any
cookie-based reasoning runs.
