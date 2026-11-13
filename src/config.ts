/**
 * Runtime config. Defaults target the local dev stack (tools/dev-stack), reached from the
 * emulator through `adb reverse` (npm run dev:reverse). Override with EXPO_PUBLIC_* env vars.
 */
export const config = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
  /** Simulated sign-in only: the dev stack's token server. */
  devTokenUrl: __DEV__ ? (process.env.EXPO_PUBLIC_DEV_TOKEN_URL ?? 'http://localhost:3101') : '',
  /** Clerk publishable key. When set, sign-in uses real Clerk; otherwise the dev stack's simulated sign-in. */
  clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '',
  /** Which providers are live. Billing and ads stay simulated until store accounts and ad units exist. */
  providers: {
    auth: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ? ('clerk' as const) : ('simulated' as const),
    billing: 'simulated' as const,
    ads: 'simulated' as const,
  },
  privacyUrl: 'https://tactiq.josephremingston.dev/privacy',
  termsUrl: 'https://tactiq.josephremingston.dev/terms',
};
