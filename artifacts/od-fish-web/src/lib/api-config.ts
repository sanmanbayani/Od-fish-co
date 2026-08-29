import { setBaseUrl, setCredentials } from '@workspace/api-client-react';

/**
 * Where the API lives, relative to this app.
 *
 * Unset (the default) means the API is served from the same origin as the site,
 * which is how the Replit dev environment and any single-host deployment work —
 * relative `/api/...` requests just resolve, and the session cookie rides along
 * automatically.
 *
 * Set `VITE_API_BASE_URL` when the frontend is deployed separately from the API
 * (a Vercel site in front of an Express server elsewhere). Two things then have
 * to change together, which is why they live in one place:
 *
 *   1. requests need an absolute base, and
 *   2. `fetch` must be told to send credentials — its `same-origin` default
 *      silently drops the session cookie cross-origin, and the resulting 401
 *      looks like an expired login rather than a misconfiguration.
 *
 * The API must also list this site in its own WEB_ORIGINS allow-list and run
 * with CROSS_SITE_COOKIES=true, or the browser will refuse the cookie.
 */
const configured = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

export const API_BASE_URL = configured ? configured.replace(/\/+$/, '') : '';

export const IS_CROSS_ORIGIN_API = API_BASE_URL.length > 0;

if (IS_CROSS_ORIGIN_API) {
  setBaseUrl(API_BASE_URL);
  setCredentials('include');
}

/**
 * Resolve a server-supplied media path.
 *
 * The API stores image paths as root-relative `/api/media/...`. Same-origin
 * that resolves correctly on its own; cross-origin it would point at the
 * frontend's own domain and 404, so it needs the API base prepended.
 */
export function mediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (!IS_CROSS_ORIGIN_API) return url;
  if (!url.startsWith('/')) return url;
  return `${API_BASE_URL}${url}`;
}
