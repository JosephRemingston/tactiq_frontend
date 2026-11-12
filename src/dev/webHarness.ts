import { LogBox, Platform } from 'react-native';

import { useAuth } from '@/services/auth';
import { useSettings, type ThemeMode } from '@/state/settings';
import { FORCED_STATES, PURCHASE_OUTCOMES, useDev, type ForcedState, type PurchaseOutcome } from './devStore';

/**
 * Development web build only: lets headless screenshots pick a variant through the URL.
 *   ?devUser=freefan|profan|<key>|none   signed-in dev user (none = signed out)
 *   ?theme=light|dark
 *   ?forced=<state>                       force a screen state
 *   ?browse=1                             signed out but browsing
 *   ?purchase=<outcome>&slow=0|1          simulated Play purchase result
 */
export function applyWebHarness() {
  if (!__DEV__ || Platform.OS !== 'web' || typeof window === 'undefined') return;
  const p = new URLSearchParams(window.location.search);
  // Screenshots: react-native-svg's web build warns about onPress on SVG groups (web only).
  if (p.has('devUser') || p.has('theme')) LogBox.ignoreAllLogs(true);
  const user = p.get('devUser');
  if (user === 'none') useAuth.setState({ status: 'signedOut', userKey: null, browsing: p.get('browse') === '1', hydrated: true });
  else if (user) {
    const s = useAuth.getState();
    useAuth.setState({ status: 'signedIn', userKey: user, browsing: false, onboarded: s.onboarded.includes(user) ? s.onboarded : [...s.onboarded, user], hydrated: true });
  }
  const theme = p.get('theme') as ThemeMode | null;
  if (theme === 'light' || theme === 'dark') useSettings.setState({ themeMode: theme });
  const forced = p.get('forced') as ForcedState | null;
  if (forced && FORCED_STATES.some((f) => f.value === forced)) useDev.setState({ forced });
  else if (p.has('devUser') || p.has('theme')) useDev.setState({ forced: null });
  const purchase = p.get('purchase') as PurchaseOutcome | null;
  if (purchase && PURCHASE_OUTCOMES.some((o) => o.value === purchase)) useDev.setState({ purchaseOutcome: purchase });
  if (p.has('slow')) useDev.setState({ slowPurchase: p.get('slow') === '1' });
}
