import * as WebBrowser from 'expo-web-browser';

import { config } from '@/config';
import { log } from './log';
import { isAllowedUrl } from './validate';

/** Hosts the app may open in the browser. Server-supplied links (e.g. manageUrl) must match. */
const TACTIQ_HOST = (() => {
  try {
    return new URL(config.privacyUrl).hostname;
  } catch {
    return 'tactiq.josephremingston.dev';
  }
})();
export const ALLOWED_LINK_HOSTS = ['play.google.com', TACTIQ_HOST] as const;

/** Opens an HTTPS link on an allowed host in the in-app browser. Returns false when it was refused. */
export async function safeOpenUrl(url: string | null | undefined): Promise<boolean> {
  if (!isAllowedUrl(url, ALLOWED_LINK_HOSTS)) {
    log.warn('refused to open a link outside the allowlist');
    return false;
  }
  try {
    await WebBrowser.openBrowserAsync(url);
    return true;
  } catch {
    return false;
  }
}
