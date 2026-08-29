---
name: Tailwind v4 + tw-animate-css centring trap
description: Why shadcn's stock slide-in classes fly a centred dialog in from the screen corner under Tailwind v4.
---

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
