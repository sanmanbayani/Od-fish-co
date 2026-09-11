/**
 * Razorpay webhook handler.
 *
 * This is the authoritative settlement path — the client-side verification in
 * `/:id/pay` is a synchronous convenience, but this webhook is the fallback
 * that catches payments the client missed (network drop, app crash, etc.).
 *
 * Events handled:
 *   - payment.captured  → order moves to PLACED/PAID
 *   - payment.failed    → order moves to FAILED, stock restored
 *   - refund.processed  → order payment status → REFUNDED
 */
import { db, orders } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { verifyWebhookSignature } from "../lib/razorpay";
import { RAZORPAY_ENABLED } from "../lib/env";
import { logger } from "../lib/logger";
import { recordOrderEvent, type Executor } from "../lib/orders";
import { notifyOrderStatus } from "../lib/push";
import { restoreStock } from "./orders";

const router: IRouter = Router();

/**
 * Razorpay sends the signature in the header; we need the raw body to verify.
 * The raw body is attached by the middleware in app.ts.
 */
router.post("/", async (req, res) => {
  if (!RAZORPAY_ENABLED) {
    res.status(200).json({ ok: true, skipped: true });
    return;
  }

  const signature = req.headers["x-razorpay-signature"] as string | undefined;
  const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;

  if (!signature || !rawBody) {
    logger.warn("Razorpay webhook received without signature or raw body");
    res.status(400).json({ error: "Missing signature" });
    return;
  }

  if (!verifyWebhookSignature(rawBody, signature)) {
    logger.warn("Razorpay webhook signature verification failed");
    res.status(400).json({ error: "Invalid signature" });
    return;
  }

  const event = req.body as {
    event: string;
    payload: {
      payment?: {
        entity: {
          id: string;
          order_id: string;
          status: string;
          notes?: Record<string, string>;
        };
      };
      refund?: {
        entity: {
          id: string;
          payment_id: string;
          notes?: Record<string, string>;
        };
      };
    };
  };

  logger.info({ event: event.event }, "Razorpay webhook received");

  try {
    switch (event.event) {
      case "payment.captured": {
        const payment = event.payload.payment?.entity;
        if (!payment) break;

        const orderId = payment.notes?.orderId;
        if (!orderId) {
          logger.warn({ paymentId: payment.id }, "Razorpay payment has no orderId in notes");
          break;
        }

        await db.transaction(async (tx: Executor) => {
          const [row] = await tx
            .update(orders)
            .set({
              status: "PLACED",
              paymentStatus: "PAID",
              paymentReference: payment.id,
              razorpayPaymentId: payment.id,
            })
            .where(
              and(
                eq(orders.id, orderId),
                eq(orders.status, "PENDING_PAYMENT"),
              ),
            )
            .returning();

          if (!row) {
            // Already settled by the client-side path — idempotent.
            logger.info({ orderId }, "Order already settled, webhook is a no-op");
            return;
          }

          await recordOrderEvent(
            {
              orderId,
              fromStatus: "PENDING_PAYMENT",
              toStatus: "PLACED",
              note: `Payment captured via Razorpay webhook (${payment.id})`,
              actorType: "SYSTEM",
              actorId: null,
            },
            tx,
          );

          notifyOrderStatus(row);
        });

        break;
      }

      case "payment.failed": {
        const payment = event.payload.payment?.entity;
        if (!payment) break;

        const orderId = payment.notes?.orderId;
        if (!orderId) break;

        await db.transaction(async (tx: Executor) => {
          const [row] = await tx
            .update(orders)
            .set({
              status: "FAILED",
              paymentStatus: "FAILED",
              paymentReference: payment.id,
            })
            .where(
              and(
                eq(orders.id, orderId),
                eq(orders.status, "PENDING_PAYMENT"),
              ),
            )
            .returning();

          if (!row) return;

          await restoreStock(orderId, tx);

          await recordOrderEvent(
            {
              orderId,
              fromStatus: "PENDING_PAYMENT",
              toStatus: "FAILED",
              note: `Payment failed via Razorpay webhook (${payment.id})`,
              actorType: "SYSTEM",
              actorId: null,
            },
            tx,
          );
        });

        break;
      }

      case "refund.processed": {
        const refund = event.payload.refund?.entity;
        if (!refund) break;

        const orderId = refund.notes?.orderId;
        if (!orderId) break;

        await db
          .update(orders)
          .set({ paymentStatus: "REFUNDED" })
          .where(eq(orders.id, orderId));

        await recordOrderEvent({
          orderId,
          fromStatus: null,
          toStatus: "REFUNDED",
          note: `Refund processed via Razorpay (${refund.id})`,
          actorType: "SYSTEM",
          actorId: null,
        });

        break;
      }

      default:
        logger.info({ event: event.event }, "Unhandled Razorpay webhook event");
    }
  } catch (err) {
    logger.error({ err, event: event.event }, "Error processing Razorpay webhook");
  }

  // Always respond 200 to prevent Razorpay from retrying.
  res.status(200).json({ ok: true });
});

export default router;
