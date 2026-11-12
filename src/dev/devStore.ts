import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '@/state/storage';

export type ForcedState =
  | 'loading'
  | 'empty'
  | 'signedOut'
  | 'notAnalysed'
  | 'queued'
  | 'noEvents'
  | 'limit'
  | 'proOnly'
  | 'error'
  | 'rateLimited'
  | 'offline'
  | 'notFound';

export const FORCED_STATES: { value: ForcedState; label: string }[] = [
  { value: 'loading', label: 'Loading' },
  { value: 'empty', label: 'Empty' },
  { value: 'signedOut', label: 'Signed out' },
  { value: 'notAnalysed', label: 'Not analysed' },
  { value: 'queued', label: 'Analysis queued' },
  { value: 'noEvents', label: 'No event data' },
  { value: 'limit', label: 'Limit reached' },
  { value: 'proOnly', label: 'Pro only' },
  { value: 'error', label: 'Error' },
  { value: 'rateLimited', label: 'Rate limited' },
  { value: 'offline', label: 'Offline' },
  { value: 'notFound', label: 'Not found' },
];

/** What the simulated Play purchase flow returns. Each maps to a real backend fake token. */
export type PurchaseOutcome = 'active' | 'pending' | 'user_cancelled' | 'error' | 'other_account' | 'billing_unavailable';
export const PURCHASE_OUTCOMES: { value: PurchaseOutcome; label: string }[] = [
  { value: 'active', label: 'Success' },
  { value: 'pending', label: 'Pending payment' },
  { value: 'user_cancelled', label: 'Cancelled by user' },
  { value: 'error', label: 'Store error' },
  { value: 'other_account', label: 'Linked to another account' },
  { value: 'billing_unavailable', label: 'Billing unavailable' },
];

type DevState = {
  forced: ForcedState | null;
  purchaseOutcome: PurchaseOutcome;
  /** Slow the simulated purchase so the processing state can be seen. */
  slowPurchase: boolean;
  setForced: (s: ForcedState | null) => void;
  setPurchaseOutcome: (o: PurchaseOutcome) => void;
  setSlowPurchase: (v: boolean) => void;
};

export const useDev = create<DevState>()(
  persist(
    (set) => ({
      forced: null,
      purchaseOutcome: 'active',
      slowPurchase: true,
      setForced: (forced) => set({ forced }),
      setPurchaseOutcome: (purchaseOutcome) => set({ purchaseOutcome }),
      setSlowPurchase: (slowPurchase) => set({ slowPurchase }),
    }),
    { name: 'tactiq.dev', storage: persistStorage },
  ),
);

export const isDev = __DEV__;
