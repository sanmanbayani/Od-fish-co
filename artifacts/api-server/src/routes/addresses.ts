import { CreateAddressBody, UpdateAddressBody } from "@workspace/api-zod";
import { addresses, db, servicePincodes } from "@workspace/db";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { notFound, parseBody } from "../lib/http";
import { requireCustomer } from "../middlewares/auth";

const router: IRouter = Router();
type AddressRow = typeof addresses.$inferSelect;

async function serviceablePincodes(pincodes: string[]): Promise<Set<string>> {
  if (pincodes.length === 0) return new Set();
  const rows = await db
    .select({ pincode: servicePincodes.pincode })
    .from(servicePincodes)
    .where(
      and(
        inArray(servicePincodes.pincode, pincodes),
        eq(servicePincodes.isActive, true),
      ),
    );
  return new Set(rows.map((row) => row.pincode));
}

function serialize(row: AddressRow, serviceable: Set<string>) {
  return {
    id: row.id,
    label: row.label ?? "Home",
    receiverName: row.receiverName,
    receiverPhone: row.receiverPhone,
    line1: row.line1,
    line2: row.line2,
    area: row.area,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    isDefault: row.isDefault,
    isServiceable: serviceable.has(row.pincode),
  };
}

async function listForCustomer(customerId: string) {
  const rows = await db
    .select()
    .from(addresses)
    .where(and(eq(addresses.customerId, customerId), eq(addresses.isArchived, false)))
    .orderBy(desc(addresses.isDefault), asc(addresses.createdAt));

  const serviceable = await serviceablePincodes(rows.map((row) => row.pincode));
  return rows.map((row) => serialize(row, serviceable));
}

async function clearOtherDefaults(customerId: string, keepId: string) {
  await db
    .update(addresses)
    .set({ isDefault: false })
    .where(and(eq(addresses.customerId, customerId), eq(addresses.isDefault, true)));
  await db.update(addresses).set({ isDefault: true }).where(eq(addresses.id, keepId));
}

router.use(requireCustomer);

router.get("/", async (req, res) => {
  res.json(await listForCustomer(req.customer!.id));
});

router.post("/", async (req, res) => {
  const body = parseBody(CreateAddressBody, req.body);
  const customerId = req.customer!.id;

  const existing = await db
    .select({ id: addresses.id })
    .from(addresses)
    .where(and(eq(addresses.customerId, customerId), eq(addresses.isArchived, false)));

  const [created] = await db
    .insert(addresses)
    .values({
      customerId,
      label: body.label ?? "Home",
      receiverName: body.receiverName,
      receiverPhone: body.receiverPhone,
      line1: body.line1,
      line2: body.line2 ?? null,
      area: body.area,
      city: body.city ?? "Mumbai",
      state: body.state ?? "Maharashtra",
      pincode: body.pincode,
      isDefault: body.isDefault ?? existing.length === 0,
    })
    .returning();

  if (created?.isDefault) await clearOtherDefaults(customerId, created.id);

  const serviceable = await serviceablePincodes([created!.pincode]);
  res.status(201).json(serialize({ ...created!, isDefault: created!.isDefault }, serviceable));
});

router.patch("/:id", async (req, res) => {
  const body = parseBody(UpdateAddressBody, req.body);
  const customerId = req.customer!.id;
  const id = String(req.params.id);

  const [existing] = await db
    .select()
    .from(addresses)
    .where(and(eq(addresses.id, id), eq(addresses.customerId, customerId)))
    .limit(1);

  if (!existing) throw notFound("That address is no longer saved to your account.");

  const [updated] = await db
    .update(addresses)
    .set({
      ...(body.label === undefined ? {} : { label: body.label }),
      ...(body.receiverName === undefined ? {} : { receiverName: body.receiverName }),
      ...(body.receiverPhone === undefined ? {} : { receiverPhone: body.receiverPhone }),
      ...(body.line1 === undefined ? {} : { line1: body.line1 }),
      ...(body.line2 === undefined ? {} : { line2: body.line2 }),
      ...(body.area === undefined ? {} : { area: body.area }),
      ...(body.city === undefined ? {} : { city: body.city }),
      ...(body.state === undefined ? {} : { state: body.state }),
      ...(body.pincode === undefined ? {} : { pincode: body.pincode }),
      ...(body.isDefault === undefined ? {} : { isDefault: body.isDefault }),
    })
    .where(eq(addresses.id, id))
    .returning();

  if (updated?.isDefault) await clearOtherDefaults(customerId, updated.id);

  const serviceable = await serviceablePincodes([updated!.pincode]);
  res.json(serialize(updated!, serviceable));
});

router.delete("/:id", async (req, res) => {
  const customerId = req.customer!.id;
  const id = String(req.params.id);

  const [archived] = await db
    .update(addresses)
    .set({ isArchived: true, isDefault: false })
    .where(and(eq(addresses.id, id), eq(addresses.customerId, customerId)))
    .returning();

  if (!archived) throw notFound("That address is no longer saved to your account.");
  res.json({ ok: true });
});

export default router;
