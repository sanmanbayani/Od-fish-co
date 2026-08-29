/**
 * Money is integer paise everywhere in this system — never floats.
 * These helpers are the only place paise is turned into display text.
 */

export function rupees(paise: number | null | undefined): string {
  if (paise == null) return '—';
  const value = paise / 100;
  const hasPaise = paise % 100 !== 0;
  return `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: hasPaise ? 2 : 0,
  })}`;
}

/** Net weight is a disclosed range, not a promise of an exact number. */
export function netWeightRange(
  minG: number | null | undefined,
  maxG: number | null | undefined,
): string | null {
  if (minG == null && maxG == null) return null;
  if (minG != null && maxG != null && minG !== maxG) {
    return `${grams(minG)}–${grams(maxG)} net`;
  }
  const single = minG ?? maxG;
  return single != null ? `${grams(single)} net` : null;
}

export function grams(g: number): string {
  if (g >= 1000) {
    const kg = g / 1000;
    return `${kg % 1 === 0 ? kg : kg.toFixed(2).replace(/0$/, '')} kg`;
  }
  return `${g} g`;
}

export function discountPercent(
  mrpPaise: number,
  pricePaise: number,
): number | null {
  if (!mrpPaise || mrpPaise <= pricePaise) return null;
  return Math.round(((mrpPaise - pricePaise) / mrpPaise) * 100);
}

const CUT_LABELS: Record<string, string> = {
  WHOLE: 'Whole',
  WHOLE_CLEANED: 'Whole, cleaned',
  CURRY_CUT: 'Curry cut',
  STEAKS: 'Steaks',
  FILLET: 'Fillet',
  PEELED: 'Peeled & deveined',
  HEADLESS: 'Headless',
  MEAT: 'Meat only',
  DRIED: 'Dried',
};

export function cutLabel(cutType: string): string {
  return (
    CUT_LABELS[cutType] ??
    cutType
      .toLowerCase()
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  );
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'Awaiting payment',
  PLACED: 'Order placed',
  CONFIRMED: 'Confirmed',
  PACKED: 'Packed on ice',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  FAILED: 'Payment failed',
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
}

/** Steps shown on the tracking timeline, in order. */
export const TRACKING_STEPS = [
  'PLACED',
  'CONFIRMED',
  'PACKED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
] as const;

/** `2026-08-30` → `Sun, 30 Aug` */
export function deliveryDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const today = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, tomorrow)) return 'Tomorrow';
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/** Full timestamp → `30 Aug, 7:42 pm` */
export function timestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d
    .toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    .replace(/\s?([AP]M)/i, (m) => m.toLowerCase());
}

/** Seconds remaining until a slot cutoff → `1h 12m left` */
export function countdown(seconds: number | null | undefined): string | null {
  if (seconds == null || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m left`;
  if (m > 0) return `${m}m left`;
  return 'closing now';
}

/** Pulls the human message out of the API's `{ error, code }` contract. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { data?: { error?: string } } | undefined)?.data;
  if (data?.error) return data.error;
  const message = (err as { message?: string } | undefined)?.message;
  return message && message !== 'Failed to fetch' ? message : fallback;
}
