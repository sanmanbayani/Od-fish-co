---
name: Trust boundaries
description: The things no client is allowed to assert in this system, and why — money, payment outcome, OTP delivery, and the handover code.
---

# The buyer never asserts money or payment outcome

The client sends `{variantId, quantity}` and nothing else that touches money. Totals are
computed server-side, and payment success arrives only from the payment provider over a
signed server-to-server channel — never from the buyer's own request.

**Why:** an endpoint where the buyer says "this order is paid" is not a payment system, it
is a free checkout. Same for any request carrying an amount.

**How to apply:** while no gateway is connected, the stand-in settlement route is gated so
it cannot exist in production. When wiring a real gateway, replace it with a webhook —
do not "keep the old path for testing" on a live deployment.

# Development conveniences must fail closed in production

Returning a login OTP in the API response makes the app testable before SMS is registered.
It also turns "knows a phone number" into "owns that account".

**Why:** the dangerous default is a convenience gated on a *feature* flag (is SMS live?)
rather than on the *environment*. If the feature is simply unconfigured in production, the
convenience silently switches itself on for the whole internet.

**How to apply:** gate every such affordance on the environment as well, and refuse the
operation in production rather than degrading to the insecure path. Never log the full
identifier the OTP protects.

# The handover OTP belongs to the customer only

The delivery code is returned to the owning customer once their order is out for delivery,
and to nobody else — not ops, not admin, not the rider carrying the box. It is only ever
compared server-side.

**Why:** the code's entire purpose is to prove the right person reached the right door. Any
staff member who can read it can close a delivery that never happened, which defeats the
control and destroys the audit trail.

**How to apply:** it must stay absent from every staff-facing serializer. If a staff screen
seems to need it, the answer is a server-side verification endpoint, not exposure.

# Concurrency is a correctness boundary, not an edge case

Double-taps and retries are normal on a phone with bad signal. Read-then-write on an order
lets two requests both pass the same validation and both act.

**How to apply:** pin every state transition to the status it validated
(`WHERE id = ? AND status = ?`) and treat "no row updated" as a real, user-visible
conflict. Serialize checkout on consuming the cart rows themselves, so only one request can
turn a basket into an order.
