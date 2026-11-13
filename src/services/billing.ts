import { api } from '@/api/endpoints';
import { ApiError } from '@/api/errors';
import type { Purchase, PurchaseState } from '@/api/types';
import { useDev } from '@/dev/devStore';

/**
 * Billing adapter (Google Play Billing, simulated). The simulated store returns the backend's
 * fake purchase tokens (`fake:<productId>:<state>:<days>:<obfuscatedAccountId>`), which the real
 * `/v1/billing/google-play/verify` route checks with its fake verifier. So every purchase and
 * subscription state the app shows is a real server response. Real Play Billing replaces
 * `store` without screen changes.
 */
export type ProductDetails = { productId: 'pro_monthly' | 'pro_annual'; price: string; priceMicros: number; currency: string; period: 'P1M' | 'P1Y' };

export type PurchaseResult =
  | { status: 'success'; purchase: Purchase }
  | { status: 'pending'; purchase: Purchase }
  | { status: 'cancelled' }
  | { status: 'failed'; message: string; requestId?: string | null }
  | { status: 'other_account' }
  | { status: 'unavailable' };

const PRODUCTS: ProductDetails[] = [
  { productId: 'pro_monthly', price: '£4.99', priceMicros: 4_990_000, currency: 'GBP', period: 'P1M' },
  { productId: 'pro_annual', price: '£39.99', priceMicros: 39_990_000, currency: 'GBP', period: 'P1Y' },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const store = {
  /**
   * The simulated store exists only in development builds. A release build has no store until
   * real Play Billing is connected, so purchases report "unavailable" and no fake token is ever sent.
   */
  isAvailable(): boolean {
    return __DEV__ && useDev.getState().purchaseOutcome !== 'billing_unavailable';
  },
  /** Prices come from the store (Play ProductDetails), never from the API. */
  async queryProducts(): Promise<ProductDetails[]> {
    await sleep(150);
    return PRODUCTS;
  },
  /** Opens the store's purchase sheet; resolves with the purchase token, or a cancel/error. */
  async launchPurchase(productId: string, obfuscatedAccountId: string): Promise<{ token: string } | { cancelled: true } | { error: string }> {
    if (!__DEV__) return { error: 'Purchases are not available in this build.' };
    const { purchaseOutcome, slowPurchase } = useDev.getState();
    await sleep(slowPurchase ? 900 : 150);
    const days = productId === 'pro_annual' ? 365 : 30;
    switch (purchaseOutcome) {
      case 'user_cancelled':
        return { cancelled: true };
      case 'error':
        return { error: "Google Play couldn't complete the purchase." };
      case 'other_account':
        return { token: `fake:${productId}:active:${days}:${'0'.repeat(64)}` };
      case 'pending':
        return { token: `fake:${productId}:pending:${days}:${obfuscatedAccountId}` };
      default:
        return { token: `fake:${productId}:active:${days}:${obfuscatedAccountId}` };
    }
  },
};

/** Annual saving vs 12 × monthly, rounded down: the "Save x%" chip. */
export function annualSaving(products: ProductDetails[]) {
  const m = products.find((p) => p.productId === 'pro_monthly');
  const a = products.find((p) => p.productId === 'pro_annual');
  if (!m || !a) return null;
  return Math.floor((1 - a.priceMicros / (m.priceMicros * 12)) * 100);
}

/** Sends the token to the server, retrying network and 5xx failures with backoff (always safe). */
async function verifyWithRetry(productId: string, token: string, onRetry?: (attempt: number) => void) {
  let attempt = 0;
  for (;;) {
    try {
      return await api.verifyPurchase(productId, token);
    } catch (e) {
      const retryable = e instanceof ApiError && (e.isOffline || e.status >= 500) && e.code !== 'BILLING_NOT_CONFIGURED';
      if (!retryable || attempt >= 3) throw e;
      attempt++;
      onRetry?.(attempt);
      await sleep(1000 * 2 ** attempt);
    }
  }
}

export async function purchase(productId: 'pro_monthly' | 'pro_annual', onStage?: (s: 'store' | 'confirming' | 'retrying') => void): Promise<PurchaseResult> {
  if (!store.isAvailable()) return { status: 'unavailable' };
  const { subscription } = await api.subscription();
  if (!subscription.billingAvailable) return { status: 'unavailable' };
  onStage?.('store');
  const r = await store.launchPurchase(productId, subscription.obfuscatedAccountId);
  if ('cancelled' in r) return { status: 'cancelled' };
  if ('error' in r) return { status: 'failed', message: r.error };
  onStage?.('confirming');
  if (useDev.getState().slowPurchase) await sleep(1200);
  try {
    const v = await verifyWithRetry(productId, r.token, () => onStage?.('retrying'));
    if (v.purchase.state === 'pending') return { status: 'pending', purchase: v.purchase };
    if (v.purchase.entitled) return { status: 'success', purchase: v.purchase };
    return { status: 'failed', message: "Google Play didn't confirm the purchase." };
  } catch (e) {
    if (e instanceof ApiError && (e.code === 'PURCHASE_ACCOUNT_MISMATCH' || e.status === 409)) return { status: 'other_account' };
    if (e instanceof ApiError && e.code === 'BILLING_NOT_CONFIGURED') return { status: 'unavailable' };
    return {
      status: 'failed',
      message: e instanceof ApiError ? e.message : 'Something went wrong.',
      requestId: e instanceof ApiError ? e.requestId : null,
    };
  }
}

export async function restorePurchases() {
  return api.restore();
}

/** Dev only: put the account into a subscription state, through the same verify route. */
export async function simulateSubscriptionState(state: PurchaseState) {
  if (!__DEV__) throw new Error('Not available in this build.');
  const { subscription } = await api.subscription();
  const days = state === 'expired' || state === 'revoked' ? -1 : 12;
  return api.verifyPurchase('pro_monthly', `fake:pro_monthly:${state}:${days}:${subscription.obfuscatedAccountId}`);
}
