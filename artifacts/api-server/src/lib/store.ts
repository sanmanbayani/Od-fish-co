import { db, storeSettings } from "@workspace/db";
import { eq } from "drizzle-orm";

export type StoreSettingsRow = typeof storeSettings.$inferSelect;

const SINGLETON_ID = 1;

const DEFAULTS = {
  id: SINGLETON_ID,
  storeOpen: true,
  codEnabled: true,
  deliveryFeePaise: 3900,
  freeDeliveryThresholdPaise: 69900,
  handlingFeePaise: 1500,
  codMaxOrderPaise: 500000,
  supportPhone: "+912249601234",
  supportWhatsapp: null,
  fssaiLicenseNo: "11524998000123",
} satisfies StoreSettingsRow;

/** Read the single settings row, creating it on first use. */
export async function getStoreSettings(): Promise<StoreSettingsRow> {
  const [existing] = await db
    .select()
    .from(storeSettings)
    .where(eq(storeSettings.id, SINGLETON_ID))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(storeSettings)
    .values(DEFAULTS)
    .onConflictDoNothing()
    .returning();

  return created ?? DEFAULTS;
}

export async function updateStoreSettings(
  patch: Partial<Omit<StoreSettingsRow, "id">>,
): Promise<StoreSettingsRow> {
  await getStoreSettings();
  const [updated] = await db
    .update(storeSettings)
    .set(patch)
    .where(eq(storeSettings.id, SINGLETON_ID))
    .returning();
  return updated ?? DEFAULTS;
}

export function serializeSettings(row: StoreSettingsRow) {
  return {
    storeOpen: row.storeOpen,
    codEnabled: row.codEnabled,
    deliveryFeePaise: row.deliveryFeePaise,
    freeDeliveryThresholdPaise: row.freeDeliveryThresholdPaise,
    handlingFeePaise: row.handlingFeePaise,
    codMaxOrderPaise: row.codMaxOrderPaise,
    supportPhone: row.supportPhone,
    supportWhatsapp: row.supportWhatsapp,
    fssaiLicenseNo: row.fssaiLicenseNo,
  };
}

export interface BillLine {
  unitPricePaise: number;
  mrpPaise: number;
  quantity: number;
}

/**
 * Every rupee the customer is shown is computed here, from live DB prices.
 * The client never sends money.
 */
export function computeBill(lines: BillLine[], settings: StoreSettingsRow) {
  const subtotalPaise = lines.reduce(
    (sum, line) => sum + line.unitPricePaise * line.quantity,
    0,
  );
  const savingsPaise = lines.reduce(
    (sum, line) => sum + Math.max(0, line.mrpPaise - line.unitPricePaise) * line.quantity,
    0,
  );

  const isEmpty = lines.length === 0;
  const qualifiesForFreeDelivery =
    subtotalPaise >= settings.freeDeliveryThresholdPaise;

  const deliveryFeePaise =
    isEmpty || qualifiesForFreeDelivery ? 0 : settings.deliveryFeePaise;
  const handlingFeePaise = isEmpty ? 0 : settings.handlingFeePaise;
  const discountPaise = 0;

  return {
    subtotalPaise,
    deliveryFeePaise,
    handlingFeePaise,
    discountPaise,
    totalPaise: subtotalPaise + deliveryFeePaise + handlingFeePaise - discountPaise,
    freeDeliveryThresholdPaise: settings.freeDeliveryThresholdPaise,
    amountToFreeDeliveryPaise: Math.max(
      0,
      settings.freeDeliveryThresholdPaise - subtotalPaise,
    ),
    savingsPaise,
  };
}
