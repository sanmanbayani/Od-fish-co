/**
 * SMS delivery seam.
 *
 * Nothing is wired yet. Transactional SMS in India requires a DLT-registered
 * sender ID and pre-approved template, which is an external registration with a
 * multi-week lead time.
 *
 * This deliberately does NOT branch on an `SMS_PROVIDER=live` environment flag.
 * A flag that merely *claims* delivery is worse than no delivery at all: it
 * would report `delivered: true`, withhold the code, and lock every real user
 * out of their account while looking healthy. Capability has to be a property of
 * the code that exists, not of a string someone set.
 *
 * When a provider is added: implement `deliverOtp` and flip
 * `SMS_DELIVERY_IMPLEMENTED`. Callers need no other change.
 */

/** Whether this build can actually put an SMS on the wire. */
export const SMS_DELIVERY_IMPLEMENTED = false;

/** Returns true once the message has been accepted by the provider. */
export async function deliverOtp(phone: string, code: string): Promise<boolean> {
  void phone;
  void code;
  return false;
}
