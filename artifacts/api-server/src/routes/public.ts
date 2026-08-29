import { db, servicePincodes, waitlistEntries, deliverySlots } from "@workspace/db";
import { JoinWaitlistBody } from "@workspace/api-zod";
import { and, asc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { countSellableProducts, loadCategories, loadProducts } from "../lib/catalogue";
import { parseBody } from "../lib/http";
import { getStoreSettings, serializeSettings } from "../lib/store";
import { upcomingSlots } from "../lib/time";

const router: IRouter = Router();

router.get("/public/summary", async (_req, res) => {
  const settings = await getStoreSettings();

  const [featured, categories, areas, slotRows, productCount] = await Promise.all([
    loadProducts({ featuredOnly: true, limit: 8 }),
    loadCategories(),
    db
      .select()
      .from(servicePincodes)
      .where(eq(servicePincodes.isActive, true))
      .orderBy(asc(servicePincodes.areaName)),
    db
      .select()
      .from(deliverySlots)
      .where(eq(deliverySlots.isActive, true))
      .orderBy(asc(deliverySlots.sortOrder)),
    countSellableProducts(),
  ]);

  const slots = upcomingSlots(slotRows, { storeOpen: settings.storeOpen });

  res.json({
    storeOpen: settings.storeOpen,
    productCount,
    featured,
    categories,
    serviceAreas: areas.map((area) => ({
      pincode: area.pincode,
      areaName: area.areaName,
    })),
    nextSlot: slots[0] ?? null,
    settings: serializeSettings(settings),
  });
});

router.get("/serviceability/:pincode", async (req, res) => {
  const pincode = String(req.params.pincode ?? "").trim();
  const settings = await getStoreSettings();

  const [area] = await db
    .select()
    .from(servicePincodes)
    .where(and(eq(servicePincodes.pincode, pincode), eq(servicePincodes.isActive, true)))
    .limit(1);

  res.json({
    pincode,
    serviceable: Boolean(area),
    areaName: area?.areaName ?? null,
    codEnabled: Boolean(area?.codEnabled) && settings.codEnabled,
  });
});

router.post("/waitlist", async (req, res) => {
  const body = parseBody(JoinWaitlistBody, req.body);
  await db.insert(waitlistEntries).values({
    pincode: body.pincode,
    phone: body.phone,
  });
  res.status(201).json({
    ok: true,
    message:
      "Thanks. We will message you the day OD Fish Co. starts delivering to your pincode.",
  });
});

export default router;
