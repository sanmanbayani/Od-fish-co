/**
 * API wiring for the Expo bundle.
 *
 * The generated client emits root-relative paths (`/api/home`). On the web
 * artifact the browser resolves those against the current origin; in a native
 * bundle there is no origin, so we set an explicit base URL once and register a
 * bearer-token getter. Both are module-level in the generated fetch layer, so
 * this file must be imported before any request is made.
 */
import { setAuthTokenGetter, setBaseUrl } from '@workspace/api-client-react';

const domain = process.env.EXPO_PUBLIC_DOMAIN;

export const API_BASE_URL = domain ? `https://${domain}` : '';

setBaseUrl(API_BASE_URL || null);

// Held outside React so the fetch layer can read the freshest token
// synchronously without re-registering the getter on every render.
let currentToken: string | null = null;

export function setCurrentToken(token: string | null): void {
  currentToken = token;
}

setAuthTokenGetter(() => currentToken);

/**
 * Product and category images are served by the API server under
 * `/api/media/...`. `setBaseUrl` only affects fetches, so image `uri`s need the
 * same prefix applied by hand.
 */
export function mediaUrl(
  url: string | null | undefined,
): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}
