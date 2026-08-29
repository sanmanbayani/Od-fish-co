import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

/**
 * Local Postgres speaks plaintext on the loopback interface; every hosted
 * provider (Supabase, Neon, RDS) requires TLS and will refuse or downgrade
 * otherwise. Decide from the host rather than from an environment name, so a
 * developer pointing DATABASE_URL at a hosted database still gets TLS.
 */
function isLocalHost(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.endsWith(".internal") ||
      // A bare hostname with no dot cannot resolve on the public internet, so
      // it is a container-network peer (the Replit dev database is one).
      !hostname.includes(".")
    );
  } catch {
    return false;
  }
}

/**
 * Supabase's direct connection presents a certificate from its own CA. Supply
 * that CA in `DATABASE_CA_CERT` to get a fully verified connection.
 *
 * Without it we still encrypt, but cannot prove who is on the other end — fine
 * for a demo over a private network path, not something to leave in place for
 * real customer data, so it is called out at startup.
 */
function sslConfig(url: string) {
  // An explicit sslmode in the connection string is the operator speaking
  // directly; never override it with a guess from the hostname.
  let sslmode: string | null = null;
  try {
    sslmode = new URL(url).searchParams.get("sslmode");
  } catch {
    sslmode = null;
  }

  if (sslmode === "disable") return false;
  if (isLocalHost(url) && !sslmode) return false;

  const ca = process.env.DATABASE_CA_CERT?.trim();
  if (ca) return { ca, rejectUnauthorized: true };

  console.warn(
    "[db] Connecting over TLS without certificate verification. Set DATABASE_CA_CERT to the provider's CA certificate to verify the server identity.",
  );
  return { rejectUnauthorized: false };
}

/**
 * Serverless platforms run many short-lived instances, so a large pool per
 * instance exhausts the database's connection limit. On Vercel/Lambda set
 * `DATABASE_POOL_MAX=1` and point DATABASE_URL at Supabase's transaction
 * pooler; on a long-lived host the default is right.
 */
const poolMax = Number(process.env.DATABASE_POOL_MAX ?? 10);

export const pool = new Pool({
  connectionString,
  ssl: sslConfig(connectionString),
  max: Number.isFinite(poolMax) && poolMax > 0 ? poolMax : 10,
});

// An idle-client error (provider restart, pooler timeout) is emitted on the
// pool, and an unhandled 'error' event takes the process down.
pool.on("error", (err) => {
  console.error("[db] Idle client error", err);
});

export const db = drizzle(pool, { schema });

export * from "./schema";
