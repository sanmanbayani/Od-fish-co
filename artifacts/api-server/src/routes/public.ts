import {
  db,
  servicePincodes,
  waitlistEntries,
  appWaitlistEntries,
  deliverySlots,
} from "@workspace/db";
import { JoinWaitlistBody, JoinAppWaitlistBody } from "@workspace/api-zod";
import { and, asc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { countSellableProducts, loadCategories, loadProducts } from "../lib/catalogue";
import { parseBody } from "../lib/http";
import { rateLimit } from "../middlewares/rateLimit";
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

/**
 * Both waitlist forms are unauthenticated writes reachable from the public
 * website, so they share one budget per caller: a person signing up legitimately
 * needs one or two requests, and anything past a handful in an hour is a script.
 */
const waitlistLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Too many sign-ups from this connection. Please try again later.",
});

router.post("/waitlist", waitlistLimiter, async (req, res) => {
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

router.post("/waitlist/app", waitlistLimiter, async (req, res) => {
  const body = parseBody(JoinAppWaitlistBody, req.body);
  const email = body.email.trim().toLowerCase();

  // Signing up twice is not an error worth showing a customer — the second
  // attempt should look exactly like the first.
  await db
    .insert(appWaitlistEntries)
    .values({ email })
    .onConflictDoNothing({ target: appWaitlistEntries.email });

  res.status(201).json({
    ok: true,
    message: "Thanks. We will email you the day the OD Fish Co. app goes live.",
  });
});

export default router;
