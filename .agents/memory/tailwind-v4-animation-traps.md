---
name: Tailwind v4 animation traps
description: The centring trap in shadcn's slide-in classes, and the faux --keyframes-* syntax that silently kills custom animations.
---

# Custom keyframes must be real `@keyframes` blocks

Rule: inside `@theme`, a custom animation needs two things — an `--animate-<name>` token *and* a
genuine `@keyframes <name> { ... }` block (v4 hoists keyframes declared inside `@theme` into the
output whenever the token is used). Writing the frames as a custom property, e.g.
`--keyframes-drift: { ... }`, is not a syntax error: the build passes, the `animate-drift` utility
is emitted, and the element simply never moves because no `@keyframes drift` exists anywhere.

**Why:** it fails completely silently — plausible-looking CSS, green build, static page. A code
review caught it here; a visual check cannot (static screenshots look identical either way).

**How to apply:** after adding any custom animation, grep the *built* CSS for the
`@keyframes <name>` rule. Related composition fact: v4's `scale-*`/`translate-*`/`rotate-*`
utilities set standalone properties, so they compose with a keyframe that animates `transform` —
an element can keep `scale-125` while a keyframe drives `translateY`/`rotate`.

# Centred overlays must not use the half-width slide classes

Rule: on any overlay centred with `translate-x-[-50%] translate-y-[-50%]`, never use the
`slide-in-from-left-1/2` + `slide-in-from-top-[48%]` pair (and their `slide-out-*` twins) that
shadcn ships in `dialog.tsx` / `alert-dialog.tsx`.

**Why:** those classes are written for Tailwind v3, which folded the centring into the
`transform` property. The enter keyframe also writes `transform`, so it *replaced* the centring
and the -50% slide values existed purely to put it back. Tailwind v4 compiles the centring to
the standalone `translate` property instead, which composes with `transform` rather than being
overwritten by it. The keyframe offset now stacks on top of the centring, so the dialog starts a
full width left and a full height up and flies in from the top-left corner of the screen. It
looks like a broken animation, not a CSS-version problem, so it is easy to chase in the wrong
place.

**How to apply:** centred overlays get `fade` + `zoom-in-95`, plus small literal offsets such as
`slide-in-from-bottom-2` if some movement is wanted. Under v4 every slide value is a genuine
offset from the centred position, so any half-width or percentage value is wrong by definition.
Edge-anchored overlays (`sheet.tsx`, popovers, dropdowns) are unaffected — they are not
translate-centred, so nothing stacks.
