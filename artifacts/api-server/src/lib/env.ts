/**
 * Environment gating.
 *
 * Development conveniences — returning a login OTP in the response, settling a
 * payment with no gateway — must be switched on by an explicit allow-list, never
 * by the *absence* of a production marker.
 *
 * `NODE_ENV` is routinely unset by process managers and container entrypoints. A
 * gate written as `NODE_ENV !== "production"` therefore fails OPEN: the first
 * deployment that forgets the variable quietly serves login codes to anyone who
 * knows a phone number. Naming the safe environments instead means an unset or
 * unrecognised value is treated as public, which is the direction we want to be
 * wrong in.
 */
const NODE_ENV = process.env.NODE_ENV?.trim().toLowerCase() ?? "";

/** True only for environments we have deliberately marked as non-public. */
export const IS_DEVELOPMENT = NODE_ENV === "development" || NODE_ENV === "test";

/**
 * Everything else — production, staging, preview, and an unset `NODE_ENV`.
 * Treat as reachable by the public and gate accordingly.
 */
export const IS_PUBLIC_ENV = !IS_DEVELOPMENT;

/**
 * Stand-in login while DLT/TRAI registration for real SMS is pending.
 *
 * Set `AUTH_MOCK_OTP` to a 6-digit code and every sign-in accepts that one
 * code. Six digits because that is what a real code is, and the clients
 * validate the length — the mock has to be indistinguishable from the real
 * thing or it stops exercising the real flow.
 *
 * This is deliberately NOT "return the generated OTP in the response":
 * that would make a demo URL a zero-knowledge takeover of any phone number a
 * visitor cares to type. A fixed operator-chosen code is a shared demo
 * credential — weak, but something the caller has to be told, and something the
 * operator can rotate or remove without a deploy.
 *
 * Treat it as a staging password. It must never be set on the real launch
 * environment; once SMS is live, unset it and the normal path takes over.
 */
function readMockOtp(): string | null {
  const raw = process.env.AUTH_MOCK_OTP?.trim();
  if (!raw) return null;

  if (!/^\d{6}$/.test(raw)) {
    throw new Error(
      "AUTH_MOCK_OTP must be exactly 6 digits, matching a real login code. Refusing to start with a malformed mock code.",
    );
  }
  return raw;
}

export const AUTH_MOCK_OTP: string | null = readMockOtp();
export const AUTH_MOCK_ENABLED = AUTH_MOCK_OTP !== null;

/**
 * Simulated payment settlement, for demos before gateway KYC clears.
 *
 * Separate from the auth mock on purpose: letting testers sign in should not
 * silently also let them mark their own orders paid. Enabling this on a real
 * storefront is a free checkout, so it stays opt-in and independent.
 */
export const PAYMENTS_MOCK_ENABLED =
  process.env.PAYMENTS_MOCK?.trim().toLowerCase() === "true";

/** One-time startup notice so a mock left switched on is visible in the logs. */
export function describeMocks(): string[] {
  const notes: string[] = [];
  if (AUTH_MOCK_ENABLED) {
    notes.push(
      "AUTH_MOCK_OTP is set — any phone number can sign in with the configured code. Unset this before launch.",
    );
  }
  if (PAYMENTS_MOCK_ENABLED) {
    notes.push(
      "PAYMENTS_MOCK is on — online payments are simulated and no money moves. Unset this before launch.",
    );
  }
  return notes;
}
