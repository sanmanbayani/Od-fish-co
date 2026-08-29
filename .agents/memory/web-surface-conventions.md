---
name: Parallelising work on the web artifact
description: The router is the one file every frontend feature touches, so parallel agents collide there. How to dispatch around it.
---

# The router is the chokepoint for parallel work

All three web surfaces (public site, admin console, rider console) share a single router
file. Any two agents adding pages collide there, even when their features are otherwise
completely independent and touch no common component.

**Why:** it is the only file every frontend feature must edit, and concurrent edits to a list
of routes are exactly the kind of conflict that cannot be resolved sensibly after the fact.

**How to apply:** before dispatching parallel frontend work, create the route entries and
empty page stubs yourself, then tell each agent which stub to fill and explicitly forbid
touching the router. Prefer dialogs over new routes for admin CRUD — it keeps a whole feature
inside one page file and off the shared router entirely.
