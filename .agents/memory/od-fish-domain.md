---
name: OD Fish Co. product shape
description: The durable domain rules behind the fresh-fish D2C build — surface split, money representation, and the pack/weight contract.
---

# Surfaces

Three surfaces, two apps. Landing page, admin console, and rider console all live in the
**web** artifact (`/`, `/admin/*`, `/rider/*`). The consumer app is a separate **Expo**
artifact.

**Why:** admin and rider are both staff tools sharing the same cookie session and design
system; splitting them into separate artifacts would triple the auth and build surface for
no benefit. Consumers need a real installable app, so that one is native.

**How to apply:** any new staff-facing screen goes in the web artifact under its role
prefix. Any new customer-facing screen goes in the Expo app.

# Money is integer paise, server-authoritative

Every monetary value crossing the wire is an integer count of paise. The client never
computes a total — it posts `{variantId, quantity}` and renders whatever bill the server
returns.

**Why:** floating-point rupees drift, and a client-computed total is a price-tampering
hole in an ecommerce app. Keeping arithmetic on the server also means discount and
delivery-fee rules can change without shipping an app update.

**How to apply:** never add a subtotal in client code. If a screen needs a number, it
should be reading a field the server already returned. Format for display only.

# Fixed packs with disclosed weight ranges

Products sell as fixed packs at a fixed price. Each variant carries a gross weight, a net
edible weight *range*, and an optional piece count, and the UI must show gross vs net side
by side before purchase.

**Why:** sea fish loses 30-60% of its weight to cleaning and never weighs the same twice.
Weigh-and-adjust billing is the single biggest source of D2C fish complaints. Pricing the
pack and disclosing the range up front removes the argument at the door.

**How to apply:** any surface showing a variant must show the net range, not just the
price. Do not present net weight as a single exact number.

# Delivery model

Slotted delivery with hard cutoffs, pincode-gated serviceability, and a waitlist capture
for unserved pincodes. Handover is confirmed by an OTP the customer reads to the rider.

**Why:** cutting capacity is finite per slot, and an unserviceable pincode discovered at
checkout is a lost customer — better to capture it as demand data.

# Marathi alongside English

Product names carry a local (Marathi) name displayed with the English one.

**Why:** Mumbai fish buyers shop by the local name (surmai, bangda, pomfret), not the
English one. Search must match both.

# Open questions for the client (not code problems)

Fixed packs vs. weigh-and-adjust; per-slot cutting capacity; the perishable refund policy.
Real launch blockers are regulatory, not technical: DLT/TRAI registration before real SMS
OTPs, and payment-gateway KYC (which itself requires four policy pages live).
