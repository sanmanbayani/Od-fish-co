/**
 * API wiring for the Expo bundle.
 *
 * The generated client emits root-relative paths (`/api/home`). On the web
 * artifact the browser resolves those against the current origin; in a native
 * bundle there is no origin, so we set an explicit base URL once and register a
 * bearer-token getter. Both are module-level in the generated fetch layer, so
 * this file must be imported before any request is made.
 */
import {
  setAuthTokenGetter,
  setBaseUrl,
  setCredentials,
  setExtraHeaders,
} from '@workspace/api-client-react';

import Constants from 'expo-constants';
import { Platform } from 'react-native';

const domain = process.env.EXPO_PUBLIC_DOMAIN;

function resolveApiBaseUrl(): string {
  if (!domain) return '';

  let url = /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;

  // On native devices running in dev (e.g. Expo Go over Wi-Fi), 'localhost' points to the phone itself.
  // Dynamically resolve to the Metro bundler host IP if available so the phone can reach the PC's API server.
  if (
    Platform.OS !== 'web' &&
    (url.includes('localhost') || url.includes('127.0.0.1'))
  ) {
    const hostUri =
      Constants.expoConfig?.hostUri ??
      (Constants as unknown as { manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } } })
        ?.manifest2?.extra?.expoGo?.debuggerHost;
    if (hostUri) {
      const hostIp = hostUri.split(':')[0];
      if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
        url = url.replace(/localhost|127\.0\.0\.1/, hostIp);
      }
    }
  }

  return url;
}

export const API_BASE_URL = resolveApiBaseUrl();

setBaseUrl(API_BASE_URL || null);

// React Native keeps a cookie jar of its own, so the phone silently replays
// the session cookie a past login response set. The production API refuses a
// cookie-bearing write that arrives without a browser Origin — which is
// exactly what an origin-less native request with a stale cookie looks like —
// and that broke OTP login ("This request is missing its origin"). This app
// authenticates with a bearer token, never cookies, so: send no cookies at
// all, and mark every request as native so the API's CSRF check can tell the
// app apart from a browser that lost its Origin.
setCredentials('omit');
setExtraHeaders({ 'X-Requested-With': 'od-fish-expo' });

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
