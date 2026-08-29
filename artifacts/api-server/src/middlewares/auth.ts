import {
  customerSessions,
  customers,
  db,
  staff,
  staffSessions,
} from "@workspace/db";
import { eq, lt } from "drizzle-orm";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { CROSS_SITE_COOKIES, IS_PUBLIC_ENV } from "../lib/env";
import { forbidden, unauthorized } from "../lib/http";
import { newSessionToken } from "../lib/security";

export const CUSTOMER_COOKIE = "od_customer_session";
export const STAFF_COOKIE = "od_staff_session";

const SESSION_DAYS = 30;

export type CustomerRow = typeof customers.$inferSelect;
export type StaffRow = typeof staff.$inferSelect;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      customer?: CustomerRow;
      staff?: StaffRow;
    }
  }
}

function expiry(): Date {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
}

function readToken(req: Request, cookieName: string): string | null {
  const header = req.headers.authorization;
  if (header?.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim() || null;
  }
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  return cookies?.[cookieName] ?? null;
}

/**
 * Session cookie attributes.
 *
 * `secure` keys off IS_PUBLIC_ENV rather than a `NODE_ENV === "production"`
 * test: an unset NODE_ENV would otherwise ship session cookies without the
 * Secure flag, i.e. over plain HTTP, on exactly the deployment that forgot to
 * set it.
 *
 * `SameSite=None` is only used when the frontend is on another domain, and
 * env.ts refuses to start in that mode without an origin allow-list.
 */
function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: CROSS_SITE_COOKIES ? ("none" as const) : ("lax" as const),
    // SameSite=None is invalid without Secure; browsers drop such a cookie.
    secure: CROSS_SITE_COOKIES || IS_PUBLIC_ENV,
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

/* ------------------------------- customers ------------------------------- */

export async function issueCustomerSession(
  res: Response,
  customerId: string,
): Promise<string> {
  const token = newSessionToken();
  await db.insert(customerSessions).values({
    token,
    customerId,
    expiresAt: expiry(),
  });
  res.cookie(CUSTOMER_COOKIE, token, cookieOptions());
  return token;
}

export async function resolveCustomer(req: Request): Promise<CustomerRow | null> {
  const token = readToken(req, CUSTOMER_COOKIE);
  if (!token) return null;

  const [row] = await db
    .select({ customer: customers, expiresAt: customerSessions.expiresAt })
    .from(customerSessions)
    .innerJoin(customers, eq(customerSessions.customerId, customers.id))
    .where(eq(customerSessions.token, token))
    .limit(1);

  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) {
    await db.delete(customerSessions).where(eq(customerSessions.token, token));
    return null;
  }
  return row.customer;
}

export const requireCustomer: RequestHandler = (req, _res, next) => {
  void resolveCustomer(req)
    .then((customer) => {
      if (!customer) throw unauthorized("Sign in with your mobile number to continue.");
      req.customer = customer;
      next();
    })
    .catch(next);
};

export async function clearCustomerSession(req: Request, res: Response): Promise<void> {
  const token = readToken(req, CUSTOMER_COOKIE);
  if (token) {
    await db.delete(customerSessions).where(eq(customerSessions.token, token));
  }
  res.clearCookie(CUSTOMER_COOKIE, { path: "/" });
}

/* --------------------------------- staff --------------------------------- */

export async function issueStaffSession(res: Response, staffId: string): Promise<string> {
  const token = newSessionToken();
  await db.insert(staffSessions).values({ token, staffId, expiresAt: expiry() });
  res.cookie(STAFF_COOKIE, token, cookieOptions());
  return token;
}

export async function resolveStaff(req: Request): Promise<StaffRow | null> {
  const token = readToken(req, STAFF_COOKIE);
  if (!token) return null;

  const [row] = await db
    .select({ member: staff, expiresAt: staffSessions.expiresAt })
    .from(staffSessions)
    .innerJoin(staff, eq(staffSessions.staffId, staff.id))
    .where(eq(staffSessions.token, token))
    .limit(1);

  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) {
    await db.delete(staffSessions).where(eq(staffSessions.token, token));
    return null;
  }
  if (!row.member.isActive) return null;
  return row.member;
}

export async function clearStaffSession(req: Request, res: Response): Promise<void> {
  const token = readToken(req, STAFF_COOKIE);
  if (token) {
    await db.delete(staffSessions).where(eq(staffSessions.token, token));
  }
  res.clearCookie(STAFF_COOKIE, { path: "/" });
}

export function requireStaff(...allowed: StaffRow["role"][]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    void resolveStaff(req)
      .then((member) => {
        if (!member) throw unauthorized("Sign in to the operations console to continue.");
        if (allowed.length > 0 && !allowed.includes(member.role)) {
          throw forbidden("Your account does not have access to this area.");
        }
        req.staff = member;
        next();
      })
      .catch(next);
  };
}

/** Housekeeping: drop expired sessions so the tables do not grow forever. */
export async function purgeExpiredSessions(): Promise<void> {
  const now = new Date();
  await Promise.all([
    db.delete(customerSessions).where(lt(customerSessions.expiresAt, now)),
    db.delete(staffSessions).where(lt(staffSessions.expiresAt, now)),
  ]);
}
