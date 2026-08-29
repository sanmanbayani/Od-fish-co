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
