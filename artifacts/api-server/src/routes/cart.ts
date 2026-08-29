import { AddCartItemBody, UpdateCartItemBody } from "@workspace/api-zod";
import { cartItems, db, productVariants, products } from "@workspace/db";
import { and, asc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { badRequest, notFound, parseBody } from "../lib/http";
import { computeBill, getStoreSettings } from "../lib/store";
import { requireCustomer } from "../middlewares/auth";

const router: IRouter = Router();

export const MAX_LINE_QUANTITY = 20;

/**
 * Builds the cart from live prices and live stock every single time. Anything
 * that no longer holds -- a sold-out pack, a quantity above what is left -- is
 * fixed here and reported back as a notice rather than failing at checkout.
 */
export async function buildCart(customerId: string) {
  const settings = await getStoreSettings();

  const rows = await db
    .select({ item: cartItems, variant: productVariants, product: products })
    .from(cartItems)
    .innerJoin(productVariants, eq(cartItems.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(eq(cartItems.customerId, customerId))
    .orderBy(asc(cartItems.createdAt));

  const notices: string[] = [];
  const items = [];

  for (const row of rows) {
    const sellable =
      row.variant.isActive && row.product.isActive ? row.variant.stockQty : 0;

    if (sellable <= 0) {
      await db.delete(cartItems).where(eq(cartItems.id, row.item.id));
      notices.push(`${row.product.name} (${row.variant.packLabel}) just sold out.`);
      continue;
    }

    let quantity = row.item.quantity;
    if (quantity > sellable) {
      quantity = sellable;
      await db
        .update(cartItems)
        .set({ quantity })
        .where(eq(cartItems.id, row.item.id));
      notices.push(
        `Only ${sellable} left of ${row.product.name} (${row.variant.packLabel}) - we adjusted your quantity.`,
      );
    }

    items.push({
      variantId: row.variant.id,
      productId: row.product.id,
      productSlug: row.product.slug,
      productName: row.product.name,
      productNameLocal: row.product.nameLocal,
      cutType: row.variant.cutType,
      packLabel: row.variant.packLabel,
      imageUrl: row.product.imageUrls[0] ?? null,
      netWeightMinG: row.variant.netWeightMinG,
      netWeightMaxG: row.variant.netWeightMaxG,
      unitPricePaise: row.variant.pricePaise,
      mrpPaise: row.variant.mrpPaise,
      quantity,
      lineTotalPaise: row.variant.pricePaise * quantity,
      stockQty: row.variant.stockQty,
    });
  }

  const bill = computeBill(items, settings);

  return {
    items,
    bill,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    codAvailable: settings.codEnabled && bill.totalPaise <= settings.codMaxOrderPaise,
    notices,
  };
}

router.use(requireCustomer);

router.get("/", async (req, res) => {
  res.json(await buildCart(req.customer!.id));
});

router.post("/items", async (req, res) => {
  const body = parseBody(AddCartItemBody, req.body);
  const customerId = req.customer!.id;

  const [variant] = await db
    .select({ variant: productVariants, product: products })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(eq(productVariants.id, body.variantId))
    .limit(1);

  if (!variant || !variant.variant.isActive || !variant.product.isActive) {
    throw notFound("That pack is not available right now.");
  }
  if (variant.variant.stockQty <= 0) {
    throw badRequest(`${variant.product.name} is sold out for today.`, "out_of_stock");
  }

  const [existing] = await db
    .select()
    .from(cartItems)
    .where(
      and(eq(cartItems.customerId, customerId), eq(cartItems.variantId, body.variantId)),
    )
    .limit(1);

  const desired = (existing?.quantity ?? 0) + body.quantity;
  const quantity = Math.min(desired, variant.variant.stockQty, MAX_LINE_QUANTITY);

  if (existing) {
    await db
      .update(cartItems)
      .set({ quantity })
      .where(eq(cartItems.id, existing.id));
  } else {
    await db.insert(cartItems).values({ customerId, variantId: body.variantId, quantity });
  }

  res.status(201).json(await buildCart(customerId));
});

router.patch("/items/:variantId", async (req, res) => {
  const body = parseBody(UpdateCartItemBody, req.body);
  const customerId = req.customer!.id;
  const variantId = String(req.params.variantId);

  if (body.quantity === 0) {
    await db
      .delete(cartItems)
      .where(and(eq(cartItems.customerId, customerId), eq(cartItems.variantId, variantId)));
    res.json(await buildCart(customerId));
    return;
  }

  const [variant] = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.id, variantId))
    .limit(1);

  if (!variant) throw notFound("That pack is not available right now.");

  const quantity = Math.min(body.quantity, variant.stockQty, MAX_LINE_QUANTITY);
  const updated = await db
    .update(cartItems)
    .set({ quantity })
    .where(and(eq(cartItems.customerId, customerId), eq(cartItems.variantId, variantId)))
    .returning();

  if (updated.length === 0) throw notFound("That item is not in your basket.");

  res.json(await buildCart(customerId));
});

router.delete("/items/:variantId", async (req, res) => {
  const customerId = req.customer!.id;
  await db
    .delete(cartItems)
    .where(
      and(
        eq(cartItems.customerId, customerId),
        eq(cartItems.variantId, String(req.params.variantId)),
      ),
    );
  res.json(await buildCart(customerId));
});

export default router;
