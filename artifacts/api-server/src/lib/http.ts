import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodType } from "zod";
import { logger } from "./logger";

/** An error whose message and status are safe to send to the client. */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, message: string, code = "error") {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (message: string, code = "bad_request") =>
  new HttpError(400, message, code);
export const unauthorized = (message = "Please sign in to continue.") =>
  new HttpError(401, message, "unauthorized");
export const forbidden = (message = "You do not have access to this.") =>
  new HttpError(403, message, "forbidden");
export const notFound = (message = "Not found.") =>
  new HttpError(404, message, "not_found");
export const conflict = (message: string, code = "conflict") =>
  new HttpError(409, message, code);
export const tooManyRequests = (message: string) =>
  new HttpError(429, message, "too_many_requests");
export const notImplemented = (message: string, code = "not_implemented") =>
  new HttpError(501, message, code);
export const serviceUnavailable = (message: string, code = "service_unavailable") =>
  new HttpError(503, message, code);

/** Parse a request payload with a generated zod schema, or throw a 400. */
export function parseBody<T>(schema: ZodType<T>, payload: unknown): T {
  try {
    return schema.parse(payload);
  } catch (error) {
    if (error instanceof ZodError) {
      const first = error.issues[0];
      const field = first?.path.join(".");
      throw badRequest(
        field ? `${field}: ${first?.message}` : (first?.message ?? "Invalid request."),
        "validation_error",
      );
    }
    throw error;
  }
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Shape matches the ErrorResult contract: `error` is the sentence a person
  // reads, `code` is the token the client branches on.
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message, code: error.code });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: error.issues[0]?.message ?? "Invalid request.",
      code: "validation_error",
    });
    return;
  }

  const log = req.log ?? logger;
  log.error({ err: error }, "Unhandled request error");
  res.status(500).json({
    error: "Something went wrong on our side. Please try again.",
    code: "internal_error",
  });
}
