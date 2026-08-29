/**
 * Turning a failed request into a sentence the person at the desk can act on.
 *
 * The API's contract is `{ error, code }` — `error` is the sentence a human
 * reads, `code` is the token to branch on. The generated client wraps every
 * failure in an `ApiError` and parks that parsed body on `.data`, NOT on the
 * error itself. So `err.error` is always `undefined`, and a screen written that
 * way shows its own fallback ("Unknown error") no matter how precisely the
 * server explained the refusal — the staff member is told nothing and the
 * server looks broken when it was actually doing its job.
 *
 * Everything that reports a failed request goes through here, so there is one
 * place that knows the shape.
 */

type ErrorBody = { error?: unknown; code?: unknown };

/**
 * Only a parsed JSON object counts. A plain-text or HTML body means something
 * other than our API answered — a proxy, a gateway, an upstream stack trace —
 * and none of those are written for a shop manager or vetted for what they
 * reveal. Those fall through to the caller's fallback instead.
 */
function bodyOf(err: unknown): ErrorBody | null {
  if (!err || typeof err !== "object") return null;

  const data = (err as { data?: unknown }).data;
  if (data && typeof data === "object") return data as ErrorBody;
  return null;
}

function sentence(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/**
 * A request that never reached the server throws a bare `TypeError` from
 * `fetch` ("Failed to fetch"), which is meaningless to a shop manager. The API
 * sleeps when idle on the current hosting plan, so this is a real state, not a
 * theoretical one.
 */
function neverArrived(err: unknown): boolean {
  return err instanceof TypeError && !(err as { status?: number }).status;
}

/** HTTP status of a failed request, when the request got far enough to have one. */
export function apiErrorStatus(err: unknown): number | undefined {
  const status = (err as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : undefined;
}

/**
 * The machine-readable reason, e.g. `rider_required`, `stale_status`.
 * Use this to branch; use `apiErrorMessage` to show something.
 */
export function apiErrorCode(err: unknown): string | undefined {
  return sentence(bodyOf(err)?.code);
}

/**
 * The sentence to show. Only ever repeats the API's own `error` field, which is
 * written for the person reading it. Anything else — a proxy's HTML page, an
 * upstream's internal `message`, a bare status line — is replaced by the
 * caller's fallback, so nothing unvetted reaches the desk.
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (neverArrived(err)) {
    return "Could not reach the server. Check your connection and try again.";
  }

  const message = sentence(bodyOf(err)?.error);
  if (message) return message;

  if (apiErrorStatus(err) === 401) {
    return "Your session has expired. Sign in again.";
  }

  return fallback;
}
