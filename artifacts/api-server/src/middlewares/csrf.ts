import type { NextFunction, Request, Response } from "express";
import { CROSS_SITE_COOKIES, IS_DEVELOPMENT, WEB_ORIGINS } from "../lib/env";
import { HttpError } from "../lib/http";
import { CUSTOMER_COOKIE, STAFF_COOKIE } from "./auth";

/** Methods that must not change state, so they need no origin check. */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Endpoints that *hand out* a session cookie. Paths are relative to the /api
 * mount point.
 *
 * These need checking even though the caller arrives without a cookie: the
 * attack is the mirror image of ordinary CSRF. A hostile page form-posts
 * credentials it controls, the victim's browser silently ends up logged into
 * the attacker's account, and anything the victim does next — an address, an
 * order, a phone number — lands in an account the attacker can read.
 */
const SESSION_ISSUING_PATHS = new Set(["/admin/login", "/auth/otp/verify"]);

function isTrustedOrigin(origin: string, req: Request): boolean {
  const normalized = origin.replace(/\/+$/, "");

  if (WEB_ORIGINS.includes(normalized)) return true;

  // The API's own origin — a page served from the same host posting to itself.
  const host = req.get("host");
  if (host && normalized === `${req.protocol}://${host}`) return true;

  // Local development with nothing configured: the Vite dev server runs on its
  // own port, which is a different origin, and there is nothing here worth
  // forging. This mirrors the permissive CORS branch in app.ts.
  if (IS_DEVELOPMENT && WEB_ORIGINS.length === 0) return true;

  return false;
}

/**
 * Reject state-changing cookie-authenticated requests from untrusted origins.
 *
 * CORS is not a CSRF defence. It governs whether the *response* may be read,
 * but a hostile page can still cause a credentialed POST to be *sent* — a form
 * submission needs no preflight at all. What normally saves us is
 * `SameSite=Lax`, which stops the browser attaching the session cookie to such
 * a request in the first place.
 *
 * Running the frontend on its own domain means giving that up: `SameSite=None`
 * is exactly the instruction to attach the cookie cross-site. This middleware
 * puts the check back where the cookie policy no longer does it, by comparing
 * the request's Origin against the same allow-list CORS uses.
 *
 * Only cookie-bearing requests are affected. The Expo app authenticates with a
 * bearer token, which a hostile page cannot make the browser attach, so native
 * traffic passes through untouched.
 */
export function requireTrustedOrigin(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) return next();

  const cookies = req.cookies as Record<string, string | undefined> | undefined;
  const hasSessionCookie = Boolean(cookies?.[CUSTOMER_COOKIE] ?? cookies?.[STAFF_COOKIE]);
  const issuesSession = SESSION_ISSUING_PATHS.has(req.path);

  // Nothing to protect: no cookie is being sent, and none is being handed out,
  // so there is no ambient authority for another site to borrow.
  if (!hasSessionCookie && !issuesSession) return next();

  const origin = req.get("origin");

  if (!origin) {
    // A browser always sends Origin on an unsafe cross-origin request, so a
    // missing one means a non-browser caller — curl, a server, or the Expo app,
    // none of which a hostile web page can drive. That is safe to let through
    // even on a login route.
    //
    // A request that already carries a cookie is different: it came from a
    // browser by definition, and in cross-site mode that cookie has given up
    // its own SameSite protection, so a missing Origin there does not get the
    // benefit of the doubt.
    if (CROSS_SITE_COOKIES && hasSessionCookie) {
      return next(
        new HttpError(403, "This request is missing its origin.", "origin_required"),
      );
    }
    return next();
  }

  if (isTrustedOrigin(origin, req)) return next();

  return next(
    new HttpError(403, "This request came from an untrusted origin.", "untrusted_origin"),
  );
}
