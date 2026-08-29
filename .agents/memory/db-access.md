---
name: Reaching the real database
description: Why the obvious SQL tooling talks to the wrong database in this project, and what to use instead.
---

# The sandbox SQL callback is not this app's database

`executeSql` in the code-execution sandbox — and the SQL step of the browser testing agent —
talk to a leftover Replit-managed Postgres that this project does not use. It answers
happily and holds a stale parallel dataset: orders and customers that look plausible and are
not the app's.

**Why it matters:** nothing errors. You read counts that disagree with the UI, chase a bug
that does not exist, or conclude a write failed when it landed in the real database all
along.

**How to apply:** inspect data through the app's own connection — the API itself, or a
throwaway node script run from `lib/db` that resolves credentials exactly as
`lib/db/src/connection.ts` does (the discrete `SUPABASE_DB_*` parts first, `DATABASE_URL`
second, never a mix). Delete the script when finished. Never hand the testing agent database
steps; ask it to verify through the UI instead.
