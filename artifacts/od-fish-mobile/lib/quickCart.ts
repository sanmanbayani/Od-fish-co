/**
 * Quick add from product cards.
 *
 * Every tap on a card's + / − updates the cached cart straight away, so the
 * counter and the bottom cart bar move with the finger. The server call is
 * held back for a moment and sent once with the final quantity, so a burst of
 * taps becomes a single request and can never leave the count off by one.
 *
 * While a pack still has a change on its way, any cart the server returns is
 * shown with that change laid on top, so one pack's reply never wipes out a
 * tap made on another. If the server refuses a change, that pack goes back to
 * what the server last confirmed and a short message is raised for the bar.
 */
import { useCallback, useSyncExternalStore } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  addCartItem,
  updateCartItem,
  useGetCart,
  type Cart,
  type CartItem,
  type Product,
  type ProductVariant,
} from '@workspace/api-client-react';
import { useAuth } from '@/lib/auth';
import { apiErrorMessage } from '@/lib/format';

export const CART_QUERY_KEY = ['cart'] as const;

/** Same per-line cap the server applies. */
const MAX_LINE_QUANTITY = 20;
/** How long to wait after the last tap before telling the server. */
const FLUSH_DELAY_MS = 350;

interface PendingLine {
  /** Quantity the shopper wants right now. */
  target: number;
  /** Used to draw the line in the cart before the server knows about it. */
  template: CartItem;
  timer: ReturnType<typeof setTimeout> | null;
  inFlight: boolean;
}

const pending = new Map<string, PendingLine>();
/** The last cart the server actually confirmed. */
let confirmed: Cart | undefined;

/* ------------------------------------------------------------------ */
/* Short messages shown above the cart bar                             */
/* ------------------------------------------------------------------ */

let message: { id: number; text: string } | null = null;
let messageTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function showCartMessage(text: string) {
  message = { id: Date.now(), text };
  if (messageTimer) clearTimeout(messageTimer);
  messageTimer = setTimeout(() => {
    message = null;
    emit();
  }, 3200);
  emit();
}

export function useCartMessage() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => message,
    () => message,
  );
}

/* ------------------------------------------------------------------ */
/* Optimistic cart                                                     */
/* ------------------------------------------------------------------ */

/** The server cart with every not-yet-confirmed change laid on top. */
function withPending(base: Cart | undefined): Cart | undefined {
  if (pending.size === 0) return base;
  const empty: Cart = {
    items: [],
    itemCount: 0,
    notices: [],
    codAvailable: true,
    bill: {
      subtotalPaise: 0,
      deliveryFeePaise: 0,
      handlingFeePaise: 0,
      discountPaise: 0,
      totalPaise: 0,
      freeDeliveryThresholdPaise: 0,
      amountToFreeDeliveryPaise: 0,
      savingsPaise: 0,
    },
  };
  const cart = base ?? empty;
  let items = [...cart.items];
  let subtotalDelta = 0;

  pending.forEach((line, variantId) => {
    const idx = items.findIndex((i) => i.variantId === variantId);
    const current = idx >= 0 ? items[idx] : null;
    const before = current?.lineTotalPaise ?? 0;
    if (line.target <= 0) {
      if (idx >= 0) items = items.filter((_, i) => i !== idx);
      subtotalDelta -= before;
      return;
    }
    const source = current ?? line.template;
    const next: CartItem = {
      ...source,
      quantity: line.target,
      lineTotalPaise: source.unitPricePaise * line.target,
    };
    if (idx >= 0) items[idx] = next;
    else items = [...items, next];
    subtotalDelta += next.lineTotalPaise - before;
  });

  const subtotalPaise = cart.bill.subtotalPaise + subtotalDelta;
  return {
    ...cart,
    items,
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    bill: {
      ...cart.bill,
      subtotalPaise,
      totalPaise: cart.bill.totalPaise + subtotalDelta,
    },
  };
}

function paint(qc: QueryClient) {
  const next = withPending(confirmed);
  if (next) qc.setQueryData(CART_QUERY_KEY, next);
}

function confirmedQty(variantId: string): number {
  return confirmed?.items.find((i) => i.variantId === variantId)?.quantity ?? 0;
}

async function flush(qc: QueryClient, variantId: string) {
  const line = pending.get(variantId);
  if (!line || line.inFlight) return;
  line.timer = null;
  line.inFlight = true;
  const sent = line.target;
  const name = line.template.productName;

  try {
    // PATCH carries the absolute quantity, so a repeat can never double-add.
    // POST is only for a pack the server does not have in the cart yet.
    const cart =
      sent === 0 || confirmedQty(variantId) > 0
        ? await updateCartItem(variantId, { quantity: sent })
        : await addCartItem({ variantId, quantity: sent });
    confirmed = cart;
    line.inFlight = false;

    if (line.target === sent) {
      pending.delete(variantId);
      const got = confirmedQty(variantId);
      if (sent > 0 && got < sent) {
        showCartMessage(
          got === 0
            ? `${name} just sold out.`
            : `Only ${got} left of ${name}. We adjusted your basket.`,
        );
      }
    } else {
      // More taps landed while this one was on its way; send the newest.
      schedule(qc, variantId, 0);
    }
    paint(qc);
  } catch (err) {
    if (line.timer) clearTimeout(line.timer);
    pending.delete(variantId);
    showCartMessage(apiErrorMessage(err, 'Could not update your basket. Try again.'));
    paint(qc);
    // Fetch the real cart once nothing else is mid-flight, so the rollback is exact.
    if (pending.size === 0) qc.invalidateQueries({ queryKey: CART_QUERY_KEY });
  }
}

function schedule(qc: QueryClient, variantId: string, delay = FLUSH_DELAY_MS) {
  const line = pending.get(variantId);
  if (!line) return;
  if (line.timer) clearTimeout(line.timer);
  line.timer = setTimeout(() => {
    void flush(qc, variantId);
  }, delay);
}

function setTarget(qc: QueryClient, template: CartItem, target: number) {
  const variantId = template.variantId;
  if (pending.size === 0) {
    // Nothing optimistic in the cache: it is exactly what the server said last.
    confirmed = qc.getQueryData<Cart>(CART_QUERY_KEY);
    // A background refetch must not overwrite the taps we are about to paint.
    void qc.cancelQueries({ queryKey: CART_QUERY_KEY });
  }
  const line = pending.get(variantId);
  if (line) line.target = target;
  else pending.set(variantId, { target, template, timer: null, inFlight: false });
  paint(qc);
  schedule(qc, variantId);
}

/* ------------------------------------------------------------------ */
/* Hook used by cards and rows                                         */
/* ------------------------------------------------------------------ */

/** The pack a card adds: the cheapest active pack that is in stock. */
export function defaultVariant(product: Product): ProductVariant | undefined {
  const active = product.variants
    .filter((v) => v.isActive)
    .sort((a, b) => a.pricePaise - b.pricePaise);
  return active.find((v) => v.stockQty > 0) ?? active[0];
}

function toTemplate(product: Product, v: ProductVariant): CartItem {
  return {
    variantId: v.id,
    productId: product.id,
    productSlug: product.slug,
    productName: product.name,
    productNameLocal: product.nameLocal ?? null,
    cutType: v.cutType,
    packLabel: v.packLabel,
    imageUrl: product.imageUrls?.[0] ?? null,
    netWeightMinG: v.netWeightMinG ?? null,
    netWeightMaxG: v.netWeightMaxG ?? null,
    unitPricePaise: v.pricePaise,
    mrpPaise: v.mrpPaise,
    quantity: 0,
    lineTotalPaise: 0,
    stockQty: v.stockQty,
  };
}

export function useQuickAdd(product: Product) {
  const qc = useQueryClient();
  const { isSignedIn, requireAuth } = useAuth();
  const variant = defaultVariant(product);
  const { data: cart } = useGetCart({
    query: { queryKey: CART_QUERY_KEY, enabled: isSignedIn },
  });

  const quantity =
    (isSignedIn && variant && cart?.items.find((i) => i.variantId === variant.id)?.quantity) || 0;
  const max = variant ? Math.min(variant.stockQty, MAX_LINE_QUANTITY) : 0;
  const available = Boolean(variant && product.inStock && variant.stockQty > 0);

  const change = useCallback(
    (delta: number) => {
      if (!variant) return;
      if (!requireAuth()) return;
      const next = quantity + delta;
      if (next < 0) return;
      if (delta > 0 && next > max) {
        showCartMessage(
          max >= MAX_LINE_QUANTITY
            ? `You can add up to ${MAX_LINE_QUANTITY} of one pack.`
            : `Only ${max} left of ${product.name} today.`,
        );
        return;
      }
      setTarget(qc, toTemplate(product, variant), next);
    },
    [qc, requireAuth, variant, quantity, max, product],
  );

  return {
    quantity,
    available,
    atMax: quantity >= max,
    increment: () => change(1),
    decrement: () => change(-1),
  };
}
