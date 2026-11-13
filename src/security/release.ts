// Release guard. Pure, so it runs under `node --test`.

export type ReleaseInput = {
  isDev: boolean;
  apiUrl: string;
  clerkPublishableKey: string;
  authProvider: 'clerk' | 'simulated';
};

/**
 * Problems that make a build unsafe to run. Always empty in development. A release build must
 * talk to the API over HTTPS and sign in through real Clerk: never the simulated dev sign-in.
 */
export function releaseProblems(c: ReleaseInput): string[] {
  if (c.isDev) return [];
  const out: string[] = [];
  let api: URL | null = null;
  try {
    api = new URL(c.apiUrl);
  } catch {
    api = null;
  }
  if (!api) out.push('The API address is missing or not a valid URL.');
  else {
    if (api.protocol !== 'https:') out.push('The API address must use HTTPS.');
    if (/^(localhost|127\.|10\.|192\.168\.|\[?::1)/.test(api.hostname)) out.push('The API address points at a local machine.');
    if (api.username || api.password) out.push('The API address must not contain credentials.');
  }
  if (!/^pk_(live|test)_[A-Za-z0-9]+/.test(c.clerkPublishableKey)) out.push('The Clerk publishable key is missing or malformed.');
  if (c.authProvider !== 'clerk') out.push('Sign-in is set to the simulated development provider.');
  return out;
}

/** True when requests may be sent to this address: any address in development, HTTPS only otherwise. */
export function mayCall(url: string, isDev: boolean) {
  if (isDev) return true;
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}
