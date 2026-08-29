import { db, deliverySlots } from "@workspace/db";
import { asc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { loadCategories, loadProducts } from "../lib/catalogue";
import { notFound } from "../lib/http";
import { getStoreSettings } from "../lib/store";
import { upcomingSlots } from "../lib/time";

const router: IRouter = Router();

async function openSlots() {
  const settings = await getStoreSettings();
  const rows = await db
    .select()
    .from(deliverySlots)
    .where(eq(deliverySlots.isActive, true))
    .orderBy(asc(deliverySlots.sortOrder));
  return upcomingSlots(rows, { storeOpen: settings.storeOpen });
}

router.get("/home", async (_req, res) => {
  const settings = await getStoreSettings();
  const [categories, todaysCatch, popular, slots] = await Promise.all([
    loadCategories(),
    loadProducts({ todaysCatchOnly: true, limit: 8 }),
    loadProducts({ featuredOnly: true, limit: 10 }),
    openSlots(),
  ]);

  res.json({
    storeOpen: settings.storeOpen,
    nextSlot: slots[0] ?? null,
    categories,
    todaysCatch,
    popular,
    freeDeliveryThresholdPaise: settings.freeDeliveryThresholdPaise,
  });
});

router.get("/categories", async (_req, res) => {
  res.json(await loadCategories());
});

router.get("/products", async (req, res) => {
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  res.json(await loadProducts({ categorySlug: category, search }));
});

router.get("/products/:slug", async (req, res) => {
  const [product] = await loadProducts({ productSlug: String(req.params.slug) });
  if (!product) throw notFound("We could not find that fish.");
  res.json(product);
});

router.get("/delivery-slots", async (_req, res) => {
  res.json(await openSlots());
});

export default router;
