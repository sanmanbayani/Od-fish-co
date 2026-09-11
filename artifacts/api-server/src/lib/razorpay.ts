/**
 * Razorpay payment gateway integration.
 *
 * Handles order creation on the Razorpay side and server-side signature
 * verification for incoming payment confirmations.
 */
import crypto from "node:crypto";
import {
  RAZORPAY_ENABLED,
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET,
} from "./env";

/* -------------------------------------------------------------------------- */
/*                              Razorpay REST API                             */
/* -------------------------------------------------------------------------- */

/**
 * Create a Razorpay order.
 *
 * This is called at checkout: the API creates a server-side order with the
 * amount and currency, then returns its ID to the mobile client which opens
 * the Razorpay checkout modal with it.
 */
export async function createRazorpayOrder(opts: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{
  id: string;
  amount: number;
  currency: string;
  status: string;
}> {
  if (!RAZORPAY_ENABLED) {
    throw new Error("Razorpay is not configured.");
  }

  const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      amount: opts.amountPaise,
      currency: "INR",
      receipt: opts.receipt,
      notes: opts.notes ?? {},
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Razorpay order creation failed (${res.status}): ${body}`);
  }

  return (await res.json()) as {
    id: string;
    amount: number;
    currency: string;
    status: string;
  };
}

/* -------------------------------------------------------------------------- */
/*                            Signature verification                          */
/* -------------------------------------------------------------------------- */

/**
 * Verify the payment signature returned by the Razorpay checkout SDK.
 *
 * After a successful payment the SDK returns three values:
 *   razorpay_order_id, razorpay_payment_id, razorpay_signature
 *
 * The signature is an HMAC-SHA256 of `order_id|payment_id` using the
 * Key Secret. If it matches, the payment is authentic.
 */
export function verifyPaymentSignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): boolean {
  if (!RAZORPAY_KEY_SECRET) return false;

  const expected = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(params.razorpaySignature, "hex"),
  );
}

/**
 * Verify the webhook signature from Razorpay.
 *
 * Razorpay signs the raw request body with the webhook secret and sends
 * the signature in the `X-Razorpay-Signature` header.
 */
export function verifyWebhookSignature(
  rawBody: string | Buffer,
  signature: string,
): boolean {
  if (!RAZORPAY_WEBHOOK_SECRET) return false;

  const expected = crypto
    .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex"),
    );
  } catch {
    return false;
  }
}

/** Public key ID to send to the mobile client for opening checkout. */
export function getRazorpayKeyId(): string {
  return RAZORPAY_KEY_ID ?? "";
}
