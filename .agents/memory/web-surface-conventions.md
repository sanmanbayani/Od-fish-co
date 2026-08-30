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

# Headings are force-coloured navy, so they vanish on navy sections

A base-layer rule applies `text-primary` to every `h1`–`h6` in the web app's stylesheet.
On the cream page body that is exactly right, and it is why most headings carry no colour
class at all. On any navy (`bg-primary`) section it renders navy-on-navy: the heading is
technically present, passes typecheck, and is invisible.

**Why it matters:** inheriting `text-primary-foreground` from the surrounding section does
not save you — the element rule wins over inheritance. The bug survives review because the
markup looks correct, and it survives a quick screenshot because long landing pages get
truncated before the section is reached.

**How to apply:** every heading placed on a dark section needs an explicit
`text-primary-foreground`. When a change lands below the fold of a tall page, verify it by
driving a browser to that section rather than by capturing the page from the top.
