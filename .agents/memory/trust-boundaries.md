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

Ownership is part of that pin, not a separate check. Reading "this order belongs to this
rider" before the transaction leaves a window in which the desk reassigns it; carry the
owner into the `WHERE` clause of the write itself, or the previous rider still takes the box
out and the audit trail names the wrong person.

# Only two doors reach DELIVERED

A delivery closes either by the rider verifying the customer's handover code, or by staff
closing it at the desk with a written reason recorded against them. There is no third path,
and neither one accepts an amount of money from the caller.

**Why:** a plain "set status to DELIVERED" control is indistinguishable from a real delivery
once it is in the books. It was the one route that could mark a cash order paid while no
money had been recorded, so the day's takings and the cash actually in the tin drifted apart
with nothing to show for it.

**How to apply:** any route that can reach DELIVERED, set payment to paid, or write the cash
fields must derive the amount from the order's own total and leave an order event naming the
actor. A cash order closed without the money stays unpaid on purpose — "delivered but owing"
is a real state, which means it also needs a way to be settled later, or it becomes an order
nobody can ever reconcile.

# Public marketing forms are unauthenticated writes

Waitlist-style forms on the public site let a stranger write rows without ever signing in.
A disabled submit button is not a control — it does not exist for a caller using curl — so
each such endpoint needs a server-side per-IP budget, shared across sibling public forms.

**Why:** dev and production share one database, so an unthrottled public insert pollutes the
real table, and the marketing page is the most discoverable surface the product has.

**How to apply:** put new public writes behind the same limiter as the existing waitlist
routes and declare the 429 in the spec. The limiter counts in process memory, which is
sufficient for one always-on API instance and would have to move to shared storage if the
API is ever scaled out. Also check that promises in the copy are ones the system can keep —
an "unsubscribe any time" line needs a suppression path to exist first.
