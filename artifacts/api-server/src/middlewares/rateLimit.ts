import type { NextFunction, Request, Response } from "express";
import { tooManyRequests } from "../lib/http";

type Bucket = { count: number; resetAt: number };

type Options = {
  /** Length of the fixed window, in milliseconds. */
  windowMs: number;
  /** Requests allowed per caller within one window. */
  max: number;
  /** Sentence shown to the caller once the window is spent. */
  message: string;
};

/**
 * Fixed-window, per-IP rate limiting for unauthenticated write endpoints.
 *
 * Public marketing forms are the one place where a stranger can write to the
 * database without ever signing in, so the only thing standing between the
 * table and a script is a limit enforced here. A disabled submit button is not
 * a control: it does not exist for a caller using curl.
 *
 * Counters live in this process's memory. That is deliberate and sufficient for
 * a single always-on API instance, but it means each instance counts on its own
 * and every deploy forgets the counts. If the API is ever scaled to more than
 * one instance, this has to move to shared storage or an edge/WAF rule.
 */
export function rateLimit({ windowMs, max, message }: Options) {
  const buckets = new Map<string, Bucket>();
  let lastSweep = Date.now();

  return function rateLimiter(req: Request, res: Response, next: NextFunction): void {
    const now = Date.now();

    // Expired buckets are dropped opportunistically so a stream of unique
    // addresses cannot grow the map without bound.
    if (now - lastSweep >= windowMs) {
      for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key);
      }
      lastSweep = now;
    }

    // `trust proxy` is set on the app, so req.ip is the caller rather than the
    // platform's proxy. Callers with no resolvable address share one bucket,
    // which is the conservative direction to fail in.
    const key = req.ip ?? "unknown";
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    bucket.count += 1;

    if (bucket.count > max) {
      res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      next(tooManyRequests(message));
      return;
    }

    next();
  };
}
