import path from "node:path";
import { fileURLToPath } from "node:url";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import pinoHttp from "pino-http";
import { CROSS_SITE_COOKIES, IS_DEVELOPMENT, WEB_ORIGINS } from "./lib/env";
import { errorHandler, notFound } from "./lib/http";
import { logger } from "./lib/logger";
import { requireTrustedOrigin } from "./middlewares/csrf";
import router from "./routes";

const app: Express = express();

// Behind Vercel/Railway/Replit the client address and protocol arrive in
// X-Forwarded-* headers. Without this, `req.secure` and the logged IP describe
// the proxy rather than the caller.
app.set("trust proxy", 1);

// Both `tsx src/index.ts` and `node dist/index.mjs` sit one level below the
// package root, so the media directory resolves the same way in dev and prod.
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
/**
 * CORS.
 *
 * `origin: true` reflects whatever Origin the caller sent. Paired with
 * `credentials: true` that means any website on the internet can make
 * authenticated requests using a signed-in admin's cookie and read the reply,
 * so it is confined to local development where there is nothing to steal.
 *
 * Everywhere else the caller must be on the WEB_ORIGINS allow-list. An unknown
 * origin gets no CORS headers back, which the browser turns into a blocked
 * request — we do not throw, since that would turn a policy decision into a 500.
 */
const corsOptions =
  IS_DEVELOPMENT && WEB_ORIGINS.length === 0
    ? { origin: true, credentials: true }
    : {
        origin(
          origin: string | undefined,
          callback: (err: Error | null, allow?: boolean) => void,
        ) {
          // No Origin header at all: native apps, curl, server-to-server. These
          // are not browser cross-site requests, so CORS has no say over them —
          // they are authorised by their bearer token, not by their origin.
          if (!origin) return callback(null, true);
          const normalized = origin.replace(/\/+$/, "");
          return callback(null, WEB_ORIGINS.includes(normalized));
        },
        credentials: true,
      };

app.use(cors(corsOptions));

if (WEB_ORIGINS.length > 0) {
  logger.info(
    { origins: WEB_ORIGINS, crossSiteCookies: CROSS_SITE_COOKIES },
    "CORS allow-list active",
  );
}
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Product and brand imagery, served to both the website and the mobile app.
app.use(
  "/api/media",
  express.static(path.join(packageRoot, "public", "media"), {
    maxAge: "7d",
    fallthrough: true,
  }),
);

// After cookieParser (it inspects the session cookie) and before the routes.
app.use("/api", requireTrustedOrigin);

app.use("/api", router);

app.use("/api", (req) => {
  throw notFound(`No API route matches ${req.method} ${req.path}.`);
});

app.use(errorHandler);

export default app;
