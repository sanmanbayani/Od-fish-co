import {
  RequestOtpBody,
  UpdateCurrentCustomerBody,
  VerifyOtpBody,
} from "@workspace/api-zod";
import { customers, db, otpChallenges } from "@workspace/db";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  clearCustomerSession,
  issueCustomerSession,
  requireCustomer,
} from "../middlewares/auth";
import {
  AUTH_MOCK_ENABLED,
  AUTH_MOCK_OTP,
  IS_DEVELOPMENT,
  SUPABASE_AUTH_ENABLED,
} from "../lib/env";
import {
  badRequest,
  serviceUnavailable,
  tooManyRequests,
  unauthorized,
} from "../lib/http";
import { deliverOtp, SMS_DELIVERY_IMPLEMENTED } from "../lib/sms";
import { parseBody } from "../lib/http";
import { numericCode } from "../lib/security";
import { verifySupabaseToken } from "../lib/supabase";

const router: IRouter = Router();

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_WINDOW_MS = 30 * 1000;

/**
 * How a login code reaches the user.
 *
 * In development there is no SMS provider, so the code comes back in the
 * response and the app is testable. Anywhere else that would turn "knows a
 * phone number" into "owns that account", so we refuse to issue a code we
 * cannot deliver rather than handing it to the caller.
 */

/** Last two digits only — enough to correlate logs, useless to a log reader. */
function maskPhone(phone: string) {
  return `••••••${phone.slice(-2)}`;
}

function serializeCustomer(row: typeof customers.$inferSelect, isNew = false) {
  return {
    id: row.id,
    phone: row.phone,
    fullName: row.fullName,
    email: row.email,
    avatarUrl: row.avatarUrl,
    authProvider: row.authProvider,
    needsPhone: !row.phone,
    isNew,
    createdAt: row.createdAt.toISOString(),
  };
}

router.post("/auth/otp/request", async (req, res) => {
  const body = parseBody(RequestOtpBody, req.body);
  const phone = body.phone.trim();

  if (!/^[6-9]\d{9}$/.test(phone)) {
    throw badRequest("Enter a valid 10-digit Indian mobile number.", "invalid_phone");
  }

  const [recent] = await db
    .select({ createdAt: otpChallenges.createdAt })
    .from(otpChallenges)
    .where(eq(otpChallenges.phone, phone))
    .orderBy(desc(otpChallenges.createdAt))
    .limit(1);

  if (recent && Date.now() - recent.createdAt.getTime() < OTP_RESEND_WINDOW_MS) {
    throw tooManyRequests("Please wait a few seconds before asking for a new code.");
  }

  if (!SMS_DELIVERY_IMPLEMENTED && !IS_DEVELOPMENT && !AUTH_MOCK_ENABLED) {
    throw serviceUnavailable(
      "Sign-in by SMS is not switched on yet. Please contact support.",
      "sms_not_configured",
    );
  }

  // With the mock on, every challenge carries the one operator-chosen code. The
  // surrounding expiry, attempt-limit and resend rules are untouched, so the
  // real flow is what gets exercised — only the secret is shared.
  const code = AUTH_MOCK_ENABLED ? AUTH_MOCK_OTP! : numericCode(6);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await db.delete(otpChallenges).where(eq(otpChallenges.phone, phone));
  await db.insert(otpChallenges).values({ phone, code, expiresAt });

  // Once a provider exists, a send that fails must surface as unavailable — a
  // stored code nobody received is an account the owner cannot get back into.
  let delivered = false;
  if (SMS_DELIVERY_IMPLEMENTED) {
    delivered = await deliverOtp(phone, code);
    if (!delivered) {
      throw serviceUnavailable(
        "We could not send your code just now. Please try again in a moment.",
        "sms_send_failed",
      );
    }
  }

  req.log.info(
    { phone: maskPhone(phone), delivered, mockAuth: AUTH_MOCK_ENABLED },
    "Issued login OTP",
  );

  res.json({
    phone,
    expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
    delivered,
    // Only ever echoed on a non-public environment. Under the mock the caller
    // is expected to already know the shared code.
    devOtp: IS_DEVELOPMENT ? code : null,
    mockAuth: AUTH_MOCK_ENABLED,
  });
});

router.post("/auth/otp/verify", async (req, res) => {
  const body = parseBody(VerifyOtpBody, req.body);
  const phone = body.phone.trim();

  const [challenge] = await db
    .select()
    .from(otpChallenges)
    .where(
      and(
        eq(otpChallenges.phone, phone),
        isNull(otpChallenges.consumedAt),
        gt(otpChallenges.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(otpChallenges.createdAt))
    .limit(1);

  if (!challenge) {
    throw unauthorized("That code has expired. Please request a new one.");
  }

  if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
    throw tooManyRequests("Too many wrong attempts. Request a fresh code.");
  }

  if (challenge.code !== body.otp.trim()) {
    await db
      .update(otpChallenges)
      .set({ attempts: sql`${otpChallenges.attempts} + 1` })
      .where(eq(otpChallenges.id, challenge.id));
    throw unauthorized("That code is not right. Please check and try again.");
  }

  await db
    .update(otpChallenges)
    .set({ consumedAt: new Date() })
    .where(eq(otpChallenges.id, challenge.id));

  let [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.phone, phone))
    .limit(1);

  let isNewCustomer = false;
  if (!customer) {
    [customer] = await db.insert(customers).values({ phone }).returning();
    isNewCustomer = true;
  }

  if (!customer) {
    throw badRequest("Could not create your account. Please try again.");
  }

  const token = await issueCustomerSession(res, customer.id);

  res.json({
    token,
    customer: serializeCustomer(customer, isNewCustomer),
  });
});

/* ----------------------------- Google sign-in ----------------------------- */

router.post("/auth/google", async (req, res) => {
  if (!SUPABASE_AUTH_ENABLED) {
    throw serviceUnavailable(
      "Google sign-in is not configured. Please use your mobile number.",
      "google_auth_not_configured",
    );
  }

  const { accessToken } = req.body as { accessToken?: string };
  if (!accessToken || typeof accessToken !== "string") {
    throw badRequest("A Supabase access token is required.", "missing_token");
  }

  const supaUser = await verifySupabaseToken(accessToken);
  if (!supaUser) {
    throw unauthorized("That Google session has expired. Please sign in again.");
  }

  // Try to find an existing customer by Supabase UID first, then by email.
  let [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.supabaseUid, supaUser.uid))
    .limit(1);

  let isNewCustomer = false;

  if (!customer && supaUser.email) {
    // Merge with an existing OTP-registered customer who shares this email.
    [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.email, supaUser.email))
      .limit(1);

    if (customer) {
      // Link the Supabase UID to the existing account.
      [customer] = await db
        .update(customers)
        .set({
          supabaseUid: supaUser.uid,
          avatarUrl: customer.avatarUrl ?? supaUser.avatarUrl,
          fullName: customer.fullName ?? supaUser.fullName,
        })
        .where(eq(customers.id, customer.id))
        .returning();
    }
  }

  if (!customer) {
    // Brand new Google customer.
    [customer] = await db
      .insert(customers)
      .values({
        supabaseUid: supaUser.uid,
        email: supaUser.email,
        fullName: supaUser.fullName,
        avatarUrl: supaUser.avatarUrl,
        authProvider: "google",
      })
      .returning();
    isNewCustomer = true;
  }

  if (!customer) {
    throw badRequest("Could not create your account. Please try again.");
  }

  const token = await issueCustomerSession(res, customer.id);

  req.log.info(
    { uid: supaUser.uid, email: supaUser.email, isNew: isNewCustomer },
    "Google sign-in",
  );

  res.json({
    token,
    customer: serializeCustomer(customer, isNewCustomer),
  });
});

/* ------------------------------ link phone -------------------------------- */

/**
 * After signing in with Google, the customer may not have a phone on their
 * account yet. This endpoint lets them add one using the same OTP verification
 * flow that the phone-first login uses.
 */
router.post("/auth/link-phone/request", requireCustomer, async (req, res) => {
  const { phone: rawPhone } = req.body as { phone?: string };
  if (!rawPhone) throw badRequest("Phone number is required.");

  const phone = rawPhone.trim();
  if (!/^[6-9]\d{9}$/.test(phone)) {
    throw badRequest("Enter a valid 10-digit Indian mobile number.", "invalid_phone");
  }

  // Check that this phone is not already taken by a different customer.
  const [existing] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.phone, phone))
    .limit(1);

  if (existing && existing.id !== req.customer!.id) {
    throw badRequest(
      "This number is already linked to another account. Try signing in with it instead.",
      "phone_taken",
    );
  }

  // Resend throttle.
  const [recent] = await db
    .select({ createdAt: otpChallenges.createdAt })
    .from(otpChallenges)
    .where(eq(otpChallenges.phone, phone))
    .orderBy(desc(otpChallenges.createdAt))
    .limit(1);

  if (recent && Date.now() - recent.createdAt.getTime() < OTP_RESEND_WINDOW_MS) {
    throw tooManyRequests("Please wait a few seconds before asking for a new code.");
  }

  if (!SMS_DELIVERY_IMPLEMENTED && !IS_DEVELOPMENT && !AUTH_MOCK_ENABLED) {
    throw serviceUnavailable(
      "SMS verification is not switched on yet. Please contact support.",
      "sms_not_configured",
    );
  }

  const code = AUTH_MOCK_ENABLED ? AUTH_MOCK_OTP! : numericCode(6);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await db.delete(otpChallenges).where(eq(otpChallenges.phone, phone));
  await db.insert(otpChallenges).values({ phone, code, expiresAt });

  let delivered = false;
  if (SMS_DELIVERY_IMPLEMENTED) {
    delivered = await deliverOtp(phone, code);
    if (!delivered) {
      throw serviceUnavailable(
        "We could not send your code just now. Please try again in a moment.",
        "sms_send_failed",
      );
    }
  }

  res.json({
    phone,
    expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
    delivered,
    devOtp: IS_DEVELOPMENT ? code : null,
    mockAuth: AUTH_MOCK_ENABLED,
  });
});

router.post("/auth/link-phone/verify", requireCustomer, async (req, res) => {
  const { phone: rawPhone, otp } = req.body as { phone?: string; otp?: string };
  if (!rawPhone || !otp) throw badRequest("Phone and OTP are required.");

  const phone = rawPhone.trim();

  const [challenge] = await db
    .select()
    .from(otpChallenges)
    .where(
      and(
        eq(otpChallenges.phone, phone),
        isNull(otpChallenges.consumedAt),
        gt(otpChallenges.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(otpChallenges.createdAt))
    .limit(1);

  if (!challenge) {
    throw unauthorized("That code has expired. Please request a new one.");
  }

  if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
    throw tooManyRequests("Too many wrong attempts. Request a fresh code.");
  }

  if (challenge.code !== otp.trim()) {
    await db
      .update(otpChallenges)
      .set({ attempts: sql`${otpChallenges.attempts} + 1` })
      .where(eq(otpChallenges.id, challenge.id));
    throw unauthorized("That code is not right. Please check and try again.");
  }

  await db
    .update(otpChallenges)
    .set({ consumedAt: new Date() })
    .where(eq(otpChallenges.id, challenge.id));

  // Check for an existing customer with this phone who is a different person.
  const [phoneCust] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.phone, phone))
    .limit(1);

  if (phoneCust && phoneCust.id !== req.customer!.id) {
    throw badRequest(
      "This number is already linked to another account.",
      "phone_taken",
    );
  }

  const [updated] = await db
    .update(customers)
    .set({ phone })
    .where(eq(customers.id, req.customer!.id))
    .returning();

  res.json(serializeCustomer(updated ?? req.customer!));
});

router.post("/auth/logout", async (req, res) => {
  await clearCustomerSession(req, res);
  res.json({ ok: true, message: "Signed out." });
});

router.get("/auth/me", requireCustomer, (req, res) => {
  res.json(serializeCustomer(req.customer!));
});

router.patch("/auth/me", requireCustomer, async (req, res) => {
  const body = parseBody(UpdateCurrentCustomerBody, req.body);
  const [updated] = await db
    .update(customers)
    .set({
      ...(body.fullName === undefined ? {} : { fullName: body.fullName }),
      ...(body.email === undefined ? {} : { email: body.email }),
    })
    .where(eq(customers.id, req.customer!.id))
    .returning();

  res.json(serializeCustomer(updated ?? req.customer!));
});

export default router;
