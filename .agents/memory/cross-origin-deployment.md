---
name: Hosting topology decisions
description: Why the API is hosted separately from the web app and on an always-on host, and the hostname constraint that follows. The enforced rules live in replit.md; this is the reasoning behind them.
---

# Why the API is not serverless and not on a free tier

Web on Vercel, Express API on an always-on host (Railway or equivalent), Postgres on Supabase.

**Why:** the rider console is used at a customer's door during handover. A cold start there
is an operational failure in front of a paying customer, not just a slow page. This rules out
free tiers that spin down after inactivity. A direct Postgres connection also avoids the
transaction pooler's prepared-statement limitations and leaves room for scheduled jobs and
payment/SMS webhooks without re-architecting.

**How to apply:** if hosting is ever revisited, cold-start behaviour is the deciding
constraint, not price or popularity.

# Why the two surfaces must share a registrable domain

Splitting web and API across *different registrable domains* (a `*.vercel.app` address
talking to a `*.railway.app` address) makes the session cookie a third-party cookie. Safari
blocks those by default and Chrome is moving the same way.

**Why it is worth remembering:** the failure is not a clean error. CORS is configured
correctly, the cookie is issued correctly, and login still fails — intermittently, on some
browsers only. It presents as a flaky session bug and burns a lot of time before anyone
suspects the hostnames.

**How to apply:** keep both surfaces under one registrable domain so they are same-site. If
separate registrable domains ever become unavoidable, move web auth to bearer tokens rather
than trying to make the cookie survive.

# What was actually deployed, and the knowingly-accepted debt

The live setup contradicts both rules above, deliberately. Web sits on a `*.vercel.app`
address and the API on a free-tier `*.onrender.com` one, which means separate registrable
domains *and* a host that sleeps. The owner was walked through both consequences and accepted
them for the pre-launch and client-demo phase, where nobody is standing at a customer's door.

**Why this is not a mistake to "fix" on sight:** the reasoning above is about *launch*, not
about a demo. Do not quietly re-architect it. Do raise both items again before real customers
arrive — at that point one custom domain across both surfaces solves the cookie problem and
lets `CROSS_SITE_COOKIES` go back to false, and a paid always-on tier solves the other.

# A cold start looks exactly like a broken frontend

A sleeping free-tier API makes the landing page render its shell — nav and footer — with a
permanent spinner where the content should be, because the data query never settles inside
the page's lifetime. Nothing in the page is actually wrong.

**Why it wastes so much time:** every check you reach for disproves the real cause. Curling
the endpoints returns 200 and *wakes the service*, so by the time you look again the evidence
is gone. Worse, running those curls concurrently with a screenshot means the curls warm the
instance while the browser hits it cold — the tools then disagree with each other and the
frontend takes the blame.

**How to apply:** on any sleep-capable host, warm the API with one request and *then* take
the screenshot, as separate sequential steps. Suspect a cold start before suspecting the
bundle, CORS, or the query client. Note that screenshots of an external URL return no browser
console output, so console logs are not available to break the tie.
