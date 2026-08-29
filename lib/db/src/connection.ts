/**
 * Resolves the Postgres connection string.
 *
 * `DATABASE_URL` stays the primary mechanism, because that is the variable
 * every hosting provider sets. The discrete `SUPABASE_DB_*` parts exist for two
 * reasons:
 *
 * 1. Replit manages `DATABASE_URL` itself and points it at the workspace
 *    database, so a project hosted elsewhere needs some other way to say
 *    "actually, connect over there".
 *
 * 2. A password has to be embedded inside a URI, so any character that is
 *    reserved there (`@ : / ? #`) must be percent-encoded by whoever writes the
 *    string. Supabase's generated passwords routinely contain them. A
 *    mis-encoded one does not fail loudly — the parser silently reads the wrong
 *    host or truncates the password, and it surfaces as "password
 *    authentication failed", which sends you looking at the wrong thing
 *    entirely. Taking the password as its own value removes that class of bug.
 */
export function resolveConnectionString(): string {
  const host = process.env.SUPABASE_DB_HOST?.trim();
  const user = process.env.SUPABASE_DB_USER?.trim();

  // The password is used exactly as supplied. Whitespace is legal inside a
  // Postgres password, so trimming it would turn a correct credential into an
  // authentication failure indistinguishable from a wrong one. Presence is
  // still judged on the trimmed form — a whitespace-only secret is an unset
  // one — and a stray newline from a copy-paste is called out rather than
  // silently swallowed.
  const rawPassword = process.env.SUPABASE_DB_PASSWORD;
  const password =
    rawPassword && rawPassword.trim().length > 0 ? rawPassword : undefined;

  if (password && password !== password.trim()) {
    console.warn(
      "[db] SUPABASE_DB_PASSWORD has leading or trailing whitespace and is being " +
        "used as-is. If authentication fails, suspect a stray newline from copy-paste.",
    );
  }

  if (host && user && password) {
    const port = process.env.SUPABASE_DB_PORT?.trim() || "5432";
    const database = process.env.SUPABASE_DB_NAME?.trim() || "postgres";
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(
      password,
    )}@${host}:${port}/${database}`;
  }

  // A half-filled set is always a mistake. Falling back to DATABASE_URL here
  // would quietly read and write the wrong database while looking healthy,
  // which is far worse than refusing to start.
  const partial = [
    host ? "SUPABASE_DB_HOST" : null,
    user ? "SUPABASE_DB_USER" : null,
    password ? "SUPABASE_DB_PASSWORD" : null,
  ].filter(Boolean);

  if (partial.length > 0) {
    throw new Error(
      `Incomplete Supabase configuration: ${partial.join(", ")} set, but all of ` +
        "SUPABASE_DB_HOST, SUPABASE_DB_USER and SUPABASE_DB_PASSWORD are " +
        "required to connect to Supabase. Unset them all to fall back to DATABASE_URL.",
    );
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
  return url;
}

/** Human-readable target, safe to log — never includes the password. */
export function describeConnection(connectionString: string): string {
  try {
    const u = new URL(connectionString);
    return `${u.hostname}:${u.port || "5432"}${u.pathname}`;
  } catch {
    return "(unparseable connection string)";
  }
}
