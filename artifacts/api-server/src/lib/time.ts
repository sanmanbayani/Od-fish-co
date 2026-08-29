/**
 * Every customer-facing time in this product is India Standard Time. IST has no
 * daylight saving, so a fixed +05:30 offset is exact rather than an approximation.
 */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Wall-clock IST expressed as a Date whose UTC fields hold the IST values. */
function istParts(at: Date = new Date()): Date {
  return new Date(at.getTime() + IST_OFFSET_MS);
}

/** YYYY-MM-DD for the given instant, in IST. */
export function istDateString(at: Date = new Date()): string {
  return istParts(at).toISOString().slice(0, 10);
}

/** HH:MM for the given instant, in IST. */
export function istTimeString(at: Date = new Date()): string {
  return istParts(at).toISOString().slice(11, 16);
}

/** Add whole days to a YYYY-MM-DD string. */
export function addDays(dateString: string, days: number): string {
  const base = new Date(`${dateString}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

/** The UTC instant of an IST wall-clock date + HH:MM time. */
export function istInstant(dateString: string, timeString: string): Date {
  const asUtc = new Date(`${dateString}T${timeString}:00.000Z`).getTime();
  return new Date(asUtc - IST_OFFSET_MS);
}

/** Human label for a delivery date relative to today, in IST. */
export function relativeDayLabel(dateString: string, at: Date = new Date()): string {
  const today = istDateString(at);
  if (dateString === today) return "Today";
  if (dateString === addDays(today, 1)) return "Tomorrow";
  const date = new Date(`${dateString}T00:00:00.000Z`);
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export interface SlotDefinition {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  cutoffTime: string;
  capacity: number;
  sortOrder: number;
}

export interface SlotInstance {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  cutoffTime: string;
  deliveryDate: string;
  isOpen: boolean;
  closedReason: string | null;
  secondsToCutoff: number | null;
  capacity: number;
}

/**
 * The instant at which ordering closes for one slot on one delivery date.
 *
 * A cutoff later in the clock than the window's own start can only mean the
 * evening before: nobody is still taking orders for a 7 AM delivery at 11 PM on
 * the same morning. Fresh fish is bought at the dawn market, so closing the
 * night before is the normal case here, not an edge case — which is why the
 * cutoff is read relative to the window rather than constrained to sit inside
 * it.
 */
function cutoffInstantFor(definition: SlotDefinition, deliveryDate: string): Date {
  const closesPreviousEvening = definition.cutoffTime > definition.startTime;
  return istInstant(
    closesPreviousEvening ? addDays(deliveryDate, -1) : deliveryDate,
    definition.cutoffTime,
  );
}

/**
 * Expand slot definitions into the next few concrete, orderable instances.
 * A slot disappears once its order cutoff has passed; the same slot reappears
 * for the next day it is still orderable for.
 */
export function upcomingSlots(
  definitions: SlotDefinition[],
  options: { storeOpen: boolean; days?: number; limit?: number; now?: Date } = {
    storeOpen: true,
  },
): SlotInstance[] {
  const now = options.now ?? new Date();
  const days = options.days ?? 3;
  const limit = options.limit ?? 6;
  const today = istDateString(now);

  const instances: SlotInstance[] = [];

  for (let dayOffset = 0; dayOffset < days; dayOffset += 1) {
    const deliveryDate = addDays(today, dayOffset);
    for (const definition of [...definitions].sort((a, b) => a.sortOrder - b.sortOrder)) {
      // Compare real instants, not clock strings: a slot closing the previous
      // evening cannot be judged against today's wall clock alone.
      const cutoffAt = cutoffInstantFor(definition, deliveryDate);
      if (cutoffAt.getTime() <= now.getTime()) continue;

      const secondsToCutoff = Math.floor((cutoffAt.getTime() - now.getTime()) / 1000);

      instances.push({
        id: definition.id,
        label: `${relativeDayLabel(deliveryDate, now)}, ${definition.label}`,
        startTime: definition.startTime,
        endTime: definition.endTime,
        cutoffTime: definition.cutoffTime,
        deliveryDate,
        isOpen: options.storeOpen,
        closedReason: options.storeOpen
          ? null
          : "The store is closed right now. Ordering reopens shortly.",
        secondsToCutoff,
        capacity: definition.capacity,
      });
    }
  }

  return instances.slice(0, limit);
}
