---
name: Web console on phones
description: The rules the admin/rider/public web surface is held to at 360-402px, and the four traps that silently defeat them.
---

# Mobile rules for the web surface

Shop staff and riders work this console on their phones, so every admin page is
a phone page. The rules below are enforced on any new page or table.

## Dual-branch rendering

A wide `<Table>` keeps its desktop branch and gains a stacked-card branch for
mobile. Both branches must read from **the same filtered array**, and the
loading / error / empty states must wrap **both** branches rather than living
inside one of them.

**Why:** two independently-written branches drift. The failure is silent and
one-sided — the phone shows stale or unfiltered rows, or an empty list with no
explanation, while the desktop view used for testing looks perfect.

**How to apply:** compute the filtered rows once above the branch split, and
return early on loading/error/empty before either branch renders.

## Anchor links in a shared header

The public header is rendered on every public page, so a bare `#section` anchor
in it is a bug: from a policy or FAQ route it resolves against that page, where
the target does not exist. Section anchors in shared chrome must be absolute
and base-path-aware (`${import.meta.env.BASE_URL}#section`).

**Why:** the anchors were written while the header only ever appeared on the
storefront, and they keep "working" there long after other pages adopt it.

## Safe-area utilities must actually exist

The viewport is `viewport-fit=cover`, which draws content under the notch and
the home indicator. Tailwind v4 has no built-in safe-area classes — they are
project `@utility` definitions wrapping `env(safe-area-inset-*)`.

**Why:** an undefined utility class is not an error. `pb-safe` was referenced by
the rider shell for a long time while being a complete no-op, so the layout
looked intentional and was doing nothing.

**How to apply:** any full-bleed fixed or sticky chrome needs an explicit safe
inset — top chrome for the notch, bottom chrome for the home indicator. A fixed
bottom bar also needs matching bottom padding on the scroll container, or the
last row is unreachable underneath it.

## Two hardware constants

- **16px minimum font on focusable inputs.** iOS Safari zooms the whole page
  when a control with text smaller than 16px receives focus, and does not zoom
  back out. Shared input primitives use `text-base md:text-sm`; a new primitive
  that forgets this makes every form on the phone jump.
- **~44px minimum hit area.** Icon buttons whose icon is 16px need padding to
  reach it. This applies to the close controls on overlays, which are the
  easiest ones to overlook because a mouse always hits them.

## Verifying

`scrollWidth` equal to `innerWidth` at a 390px viewport is the objective check
for "nothing overflows sideways"; run it on every route rather than eyeballing
screenshots. The authenticated consoles need a real login, so this is a browser
testing job, not a screenshot job.
