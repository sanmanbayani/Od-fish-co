import path from "node:path";
import { fileURLToPath } from "node:url";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import pinoHttp from "pino-http";
import { errorHandler, notFound } from "./lib/http";
import { logger } from "./lib/logger";
import router from "./routes";

const app: Express = express();

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
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
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

app.use("/api", router);

app.use("/api", (req) => {
  throw notFound(`No API route matches ${req.method} ${req.path}.`);
});

app.use(errorHandler);

export default app;
