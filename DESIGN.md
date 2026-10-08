# OD Fish Co. — Mobile App Design Brief

> **Purpose**: Feed this document to Google Stitch as context for the visual redesign of the OD Fish Co. mobile app. It documents the complete current design system — brand, tokens, components, screens, and platform constraints — so Stitch has everything it needs to produce designs that can be coded in one pass.

---

## 1. Brand Identity

| Attribute | Value |
|-----------|-------|
| **App name** | OD Fish Co. Mobile |
| **Tagline** | "Elevating fresh seafish" |
| **Domain** | D2C fresh seafood delivery (Mumbai) |
| **Platform** | React Native / Expo (Android-first, iOS planned) |
| **Voice** | Premium coastal market — "navy ink on warm cream paper" |
| **Logo** | Custom fish vector mark (SVG) + "OD Fish Co." wordmark |

---

## 2. Current Design Tokens

### 2.1 Color Palette

#### Core Surfaces (warm cream "paper")
| Token | Hex | Usage |
|-------|-----|-------|
| `background` | `#F8F6F1` | Page background — warm cream |
| `foreground` | `#0B1A3D` | Primary text — deep navy |
| `card` | `#FCFAF8` | Elevated card surfaces |
| `cardForeground` | `#0B1A3D` | Text on cards |

#### Primary (deep navy ink)
| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#0B1A3D` | Primary buttons, active states, CTA |
| `primaryForeground` | `#F8F6F1` | Text on primary buttons |

#### Secondary
| Token | Hex | Usage |
|-------|-----|-------|
| `secondary` | `#E6E2DA` | Less-emphasis surfaces |
| `secondaryForeground` | `#0B1A3D` | Text on secondary surfaces |

#### Muted
| Token | Hex | Usage |
|-------|-----|-------|
| `muted` | `#E9E7E2` | Subdued backgrounds |
| `mutedForeground` | `#5C6A8A` | Secondary text, labels, icons |

#### Accent
| Token | Hex | Usage |
|-------|-----|-------|
| `accent` | `#EFEDE6` | Highlight backgrounds, chips |
| `accentForeground` | `#0B1A3D` | Text on accent surfaces |

#### Semantic Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `destructive` | `#CF1736` | Gill red — delete, errors, discount badges |
| `destructiveForeground` | `#FFFFFF` | Text on destructive |
| `destructiveSurface` | `rgba(207,23,54,0.10)` | Light red background |
| `warning` | `#8A5A12` | Slots closing, low stock |
| `warningSurface` | `rgba(180,110,20,0.12)` | Light amber background |
| `success` | `#12715F` | Sea green — in-stock, delivered |
| `successForeground` | `#FFFFFF` | Text on success |
| `successSurface` | `rgba(18,113,95,0.12)` | Light green background |

#### Borders
| Token | Hex | Usage |
|-------|-----|-------|
| `border` | `#E2DDD4` | Card outlines, dividers |
| `input` | `#E2DDD4` | Input field borders |

#### Deep Band (hero, cart bar, login background)
| Token | Hex | Usage |
|-------|-----|-------|
| `deep` / `deepInk` | `#08142E` | Hero area, sticky cart bar, login screen |
| `deepForeground` | `#F8F6F1` | Text on deep surfaces |
| `mint` | `#7FD7C4` | Countdown timers on deep band |

#### Overlay Tokens (on dark surfaces)
| Token | Value | Usage |
|-------|-------|-------|
| `overlay.hairline` | `rgba(248,246,241,0.18)` | Outlines on deep band |
| `overlay.mutedForeground` | `rgba(248,246,241,0.66)` | Secondary text on deep band |
| `overlay.fill` | `rgba(248,246,241,0.16)` | Filled chips on deep band |
| `overlay.scrim` | `rgba(248,246,241,0.7)` | Frosted label over photos |

#### Hero-Specific Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `HERO_BG` | `#C8D7F7` | Powder-blue hero band background |
| `HERO_SEARCH_BG` | `#FFFFFF` | Search bar background |
| `HERO_SEARCH_BORDER` | `rgba(0,0,0,0.06)` | Search bar border |

### 2.2 Typography

Three font families loaded via `@expo-google-fonts`:

| Role | Family | Weight(s) | Usage |
|------|--------|-----------|-------|
| **Display** | Fraunces | 600 SemiBold, 700 Bold | Headlines, section titles — "market chalkboard" voice |
| **Body** | Plus Jakarta Sans | 400 Regular, 500 Medium, 600 SemiBold, 700 Bold | All body copy, buttons, labels |
| **Mono** | Inter | 500 Medium, 700 Bold | Prices, OTP codes, order numbers |

#### Type Scale

| Variant | Font | Size | Line Height | Extra |
|---------|------|------|-------------|-------|
| `hero` | Fraunces 700 | 32 | 38 | — |
| `title` | Fraunces 600 | 24 | 30 | — |
| `section` | Fraunces 600 | 19 | 24 | — |
| `cardTitle` | Jakarta 600 | 15 | 20 | — |
| `body` | Jakarta 400 | 14 | 20 | — |
| `bodyMedium` | Jakarta 500 | 14 | 20 | — |
| `bodySemi` | Jakarta 600 | 14 | 20 | — |
| `small` | Jakarta 400 | 12 | 16 | — |
| `smallMedium` | Jakarta 500 | 12 | 16 | — |
| `tiny` | Jakarta 500 | 10.5 | 14 | — |
| `price` | Jakarta 700 | 16 | 20 | — |
| `label` | Jakarta 600 | 11 | 14 | letterSpacing: 0.8, uppercase |

### 2.3 Spacing Scale

| Token | Value (px) |
|-------|-----------|
| `xs` | 4 |
| `sm` | 8 |
| `md` | 12 |
| `lg` | 16 |
| `xl` | 24 |
| `xxl` | 32 |

### 2.4 Border Radii

| Token | Value (px) | Usage |
|-------|-----------|-------|
| `sm` | 4 | Badges |
| `md` | 6 | Dev hints, chips |
| `lg` | 10 | Buttons, text fields, slot picker items |
| `xl` | 16 | Cards, product cards, hero corners, search bar |
| `pill` | 999 | Sheet handles, fully-rounded elements |

---

## 3. UI Primitive Components

### 3.1 Button
- **Variants**: `primary` | `secondary` | `outline` | `ghost` | `danger`
- **Sizes**: `sm` (h:36, font:13) | `md` (h:46, font:14.5) | `lg` (h:54, font:15.5)
- **States**: Default → Pressed (opacity 0.82) → Disabled (opacity 0.45) → Loading (spinner)
- **Style**: Rounded (`radii.lg` = 10px), hairline border (2x), centered text
- **Options**: `fullWidth`, `icon` (leading), `trailing` (trailing icon/node)
- **Haptics**: Light impact feedback on press (native only)

### 3.2 Card
- **Tones**: `card` (white-ish) | `accent` (cream highlight) | `deep` (dark navy)
- **Style**: `radii.xl` corners, hairline border, optional padding (`lg` = 16px)
- **Includes**: `Divider` sub-component (hairline separator)

### 3.3 Badge
- **Tones**: `neutral` | `success` | `danger` | `navy` | `warning`
- **Style**: Tiny uppercase text (10.5px), `radii.sm` corners, horizontal padding 7px
- **Usage**: Discount %, sold out, delivery countdown, status labels

### 3.4 Text
- **Variants**: All 12 entries from the type scale (hero → label)
- **Tones**: `default` | `muted` | `inverse` | `danger` | `success` | `primary`
- **Options**: `uppercase` transform

### 3.5 TextField
- **Parts**: Label (uppercase, muted) → Input field → Helper text (hint or error)
- **Style**: Card background, `radii.lg` border, 2x hairline border
- **States**: Default → Focused (primary border) → Error (destructive border)
- **Options**: `prefix` (e.g., "+91"), `leading` icon

### 3.6 QtyStepper
- **Layout**: [−] count [+] inline row
- **Style**: Primary border, card background, `radii.lg`
- **Sizes**: Normal (36px buttons) | Compact (32px)
- **States**: At min → minus becomes trash icon; loading → spinner in center
- **Haptics**: Selection feedback on step

### 3.7 Screen
- **Tones**: `background` (cream) | `card` (white) | `deep` (navy)
- **Options**: Safe area insets for `top` and `bottom`
- **Tab bar clearance**: 96px bottom padding on tab screens

### 3.8 StateViews
- **LoadingView**: Centered spinner + optional label
- **EmptyState**: Icon in circle (52px, accent bg) → title → body → optional action button
- **ErrorView**: Alert triangle icon + "Something went wrong" + retry button

---

## 4. Feature Components

### 4.1 ProductCard (Horizontal rail card)
- **Layout**: Vertical — image on top (1.12:1 ratio), body below
- **Width**: 168px default (adjustable)
- **Content**: Product image → discount badge (top-left) → name → local name → price + strikethrough MRP → pack label
- **States**: In-stock (normal) | Sold out (frosted scrim overlay + "Sold out" badge)
- **Style**: Card bg, border, `radii.xl`, press opacity 0.9

### 4.2 ProductRow (Full-width catalogue row)
- **Layout**: Horizontal — thumbnail left (104px, 0.92 aspect) + body right
- **Content**: Title + discount badge → local name → cut type + pack sizes → price row → CTA (chevron circle or "Sold out")
- **CTA**: 30px navy circle with white chevron-right icon
- **Style**: Card bg, border, `radii.xl`, press opacity 0.9

### 4.3 CategoryTile
- **Layout**: Vertical — square image → name → local name
- **Width**: 84px default
- **Style**: No border/card — clean with centered text below

### 4.4 CartBar (Floating cart summary)
- **Position**: Absolute bottom, above tab bar + safe area
- **Layout**: [item count badge + "N items" + subtotal] ← → ["View cart" + arrow]
- **Style**: Deep navy bg, `radii.xl`, shadow (opacity 0.24, blur 14, y-offset 6)
- **Item count**: Overlay fill circle (26px)

### 4.5 SlotPicker (Delivery slot selector)
- **Layout**: Grouped by delivery date in a 3-column grid structure
- **Date headers**: Uppercase day & date (e.g. `TODAY, 05 OCT`, `TUE, 06 OCT`) with inline horizontal divider rule
- **Each slot**: Rounded rectangle pill (`radii.md`, 46px height) displaying formatted time window (e.g. `7AM - 10AM`)
- **States**: 
  - Unselected: Card background, subtle border, foreground text
  - Selected: Soft sea-green surface (`rgba(18, 113, 95, 0.12)`), success green border (`#12715F`), bold success text
  - Closed / Cut off: Muted surface and text with 45% opacity, non-interactive

### 4.6 BrandMark (Logo + wordmark)
- **Layout**: Fish glyph (SVG) + optional wordmark stack ("OD Fish Co." + tagline)
- **Tones**: `default` (navy on cream) | `inverse` (cream on navy)
- **Wordmark**: Section variant (18px), tagline tiny uppercase with letter-spacing

---

## 5. Screen Inventory

### 5.1 Home (Tab: index)
- **Surface**: `background` (cream)
- **Sections from top to bottom**:
  1. **Hero band** — Powder-blue (`#C8D7F7`) with rounded bottom corners (28px)
     - Top bar: Deliver-to chip (map pin in dark circle + address) + profile circle
     - Search bar: White, rounded, subtle shadow
     - Illustration zone: Background fishing scene (32% opacity) + headline text + character image
  2. **Delivery slot strip** — Card surface, tappable, opens slot picker sheet
  3. **Categories rail** — "Shop the counter" + horizontal scroll of CategoryTiles
  4. **Today's catch rail** — Horizontal scroll of ProductCards
  5. **Popular grid** — "Mumbai's regulars" + 2-column grid of ProductCards
  6. **Trust strip** — Accent bg, 3 items with icons (Never frozen / Cut to order / 0–4°C)
- **Floating**: CartBar above tab bar

### 5.2 Shop (Tab: shop)
- **Surface**: `background`
- **Content**: Search/filter + full-width ProductRow list by category

### 5.3 Orders (Tab: orders)
- **Surface**: `background`
- **Content**: Order history list with status badges

### 5.4 Account (Tab: account)
- **Surface**: `background`
- **Content**: Profile info + settings + sign out

### 5.5 Product Detail (Stack: product/[slug])
- **Surface**: `background`, header from stack navigator
- **Content**: Full product image → name/local name → variant selector → price → description → add-to-cart CTA

### 5.6 Cart (Stack: cart)
- **Surface**: `background`, header title "Your basket"
- **Content**: Line items with QtyStepper → totals → checkout CTA

### 5.7 Checkout (Stack: checkout)
- **Surface**: `background`, header title "Checkout"
- **Content**: Address selection → SlotPicker → payment → bill summary → place order CTA

### 5.8 Login (Modal)
- **Surface**: `deep` (navy background)
- **Step 1 (Phone)**: BrandMark → hero text ("The catch of the day, at your door.") → cream sheet with Google sign-in button + divider + phone input + Send OTP button + legal text
- **Step 2 (OTP)**: "Enter the code" headline → OTP input (mono bold, 22px, letter-spaced) → dev hint banner → Verify button + change number / resend row

### 5.9 Addresses (Stack: addresses)
- **Content**: List of saved addresses with default/edit actions

### 5.10 Address Form (Modal)
- **Content**: Form fields for new/edit address

---

## 6. Tab Navigation

| Tab | Icon (Android) | Icon (iOS) |
|-----|---------------|-----------|
| Home | `home` (Feather) | `house` / `house.fill` (SF Symbols) |
| Shop | `grid` (Feather) | `square.grid.2x2` (SF Symbols) |
| Orders | `shopping-bag` (Feather) | `bag` / `bag.fill` (SF Symbols) |
| Account | `user` (Feather) | `person` / `person.fill` (SF Symbols) |

- **Tab bar style**: Absolute position, blur background on iOS, solid cream on Android
- **Active color**: `primary` (navy)
- **Inactive color**: `mutedForeground`
- **Label font**: Jakarta Medium, 11px
- **iOS 26+**: Uses native liquid glass tabs (system-provided, no custom theming)

---

## 7. Platform Constraints (Important for Design)

> **IMPORTANT**: Keep these React Native constraints in mind while designing.

1. **No CSS hover states** — All interactions are press-based. Design pressed states (opacity change), not hover states.
2. **No CSS cascade** — Every text element must explicitly specify font family, size, and color. There is no inheritance from parent elements.
3. **Safe area insets** — The top of the screen has a status bar notch/dynamic island area. The bottom has a home indicator area. Content must clear both.
4. **Tab bar overlaps content** — The tab bar is absolutely positioned and translucent (blur on iOS). Content must include bottom padding (~96px) to not be hidden behind it.
5. **Fixed-width layout** — The app is portrait-only. Design for ~390px width (standard mobile).
6. **No custom scrollbars** — React Native scrollbars are system-native.
7. **Shadow differences** — Shadows on Android use `elevation` (integer), iOS uses `shadowColor/Opacity/Radius/Offset`. Design shadows that work as a simple "raised" effect.
8. **Haptic feedback** — Buttons and steppers trigger haptic feedback on press. This is invisible but important for the premium feel.

---

## 8. What to Redesign

**Scope**: Visual overhaul — new colors, typography, and spacing. The layout structure and screen flow stay the same.

**Deliverables from the redesign**:
1. **Updated token sheet** — New hex values for every color token listed in Section 2.1
2. **Updated type scale** — New font families (if changed), sizes, weights, line heights
3. **Updated spacing/radii** — New scale values if changed
4. **5 key screens** designed at minimum:
   - Home (covers hero, cards, rails, trust strip, cart bar)
   - Shop (covers product rows, search)
   - Product Detail (covers image, variants, CTA)
   - Cart (covers line items, stepper, totals)
   - Login (covers dark surface, forms, brand mark)
5. **Component states** — Default, pressed, disabled, error for buttons and inputs

**What NOT to change**:
- Screen flow / navigation structure
- Business logic (API calls, auth, cart management)
- Tab names and icons
- BrandMark SVG path (the fish logo itself)
