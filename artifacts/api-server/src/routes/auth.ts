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
import { IS_DEVELOPMENT } from "../lib/env";
import {
  badRequest,
  serviceUnavailable,
  tooManyRequests,
  unauthorized,
} from "../lib/http";
import { deliverOtp, SMS_DELIVERY_IMPLEMENTED } from "../lib/sms";
import { parseBody } from "../lib/http";
import { numericCode } from "../lib/security";

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

  if (!SMS_DELIVERY_IMPLEMENTED && !IS_DEVELOPMENT) {
    throw serviceUnavailable(
      "Sign-in by SMS is not switched on yet. Please contact support.",
      "sms_not_configured",
    );
  }

  const code = numericCode(6);
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

  req.log.info({ phone: maskPhone(phone), delivered }, "Issued login OTP");

  res.json({
    phone,
    expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
    delivered,
    devOtp: IS_DEVELOPMENT ? code : null,
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
