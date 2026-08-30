import { useSyncExternalStore } from 'react';
import type { DeliverySlot } from '@workspace/api-client-react';
import { slotKey } from '@/components/SlotPicker';

/**
 * The delivery slot the customer picked from the home screen, remembered for
 * this session so checkout can start from it instead of the first open slot.
 *
 * Deliberately not persisted: slots expire at their cutoff and reopen with new
 * dates each morning, so a stored choice would preselect a closed window.
 * Checkout re-validates against the live slot list either way.
 */
export type PreferredSlot = {
  key: string;
  label: string;
  deliveryDate: string;
};

let preferred: PreferredSlot | null = null;
const listeners = new Set<() => void>();

export function setPreferredSlot(slot: DeliverySlot | null) {
  preferred = slot
    ? { key: slotKey(slot), label: slot.label, deliveryDate: slot.deliveryDate }
    : null;
  listeners.forEach((notify) => notify());
}

export function getPreferredSlot() {
  return preferred;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePreferredSlot() {
  return useSyncExternalStore(subscribe, getPreferredSlot, getPreferredSlot);
}
