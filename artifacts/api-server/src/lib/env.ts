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
