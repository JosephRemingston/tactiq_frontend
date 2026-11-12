/**
 * Runtime config. Defaults target the local dev stack (tools/dev-stack), reached from the
 * emulator through `adb reverse` (npm run dev:reverse). Override with EXPO_PUBLIC_* env vars.
 */
export const config = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
  /** Simulated sign-in only: the dev stack's token server. */
  devTokenUrl: process.env.EXPO_PUBLIC_DEV_TOKEN_URL ?? 'http://localhost:3101',
  /** Which providers are live. Everything is simulated until real keys and store accounts exist. */
  providers: { auth: 'simulated', billing: 'simulated', ads: 'simulated' } as const,
  privacyUrl: 'https://tactiq.josephremingston.dev/privacy',
  termsUrl: 'https://tactiq.josephremingston.dev/terms',
};
