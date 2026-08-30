---
name: Brand asset pipeline
description: Where the vectorized logo and brand illustrations live, and how to regenerate them.
---

# Brand asset pipeline

The OD Fish Co. logo is a single traced SVG path (viewBox 0 0 900 434), embedded as code, not loaded as a file:

- Web: `BrandLogo.tsx` component (uses `currentColor`, so tint via text color); standalone navy copy in `public/brand/od-fish-logo.svg`.
- Mobile: `BrandMark.tsx` renders the same path via react-native-svg; `LogoGlyph({ width, color })` export keeps the 900:434 aspect.

Brand illustrations (koli boat scene, fish-over-ice, wave band) are QuiverAI generations. Sources live in `attached_assets/brand/`, deploy copies in the web app's `public/brand/`, and pre-rendered PNGs in the mobile app's `assets/images/` (RN can't load arbitrary SVG files).

**Why local tracing:** the vectorization API rejected the logo raster (400) with both data URLs and public URLs. The working path is local: ImageMagick alpha-extract → `potrace`, with `librsvg` (`rsvg-convert`) for SVG→PNG renders. Both are installed as system deps.

**How to apply:** to restyle the logo anywhere, change the color prop/class — never re-trace. To add mobile illustrations, render PNG from the SVG source at 2x display width with rsvg-convert and drop into assets/images.
