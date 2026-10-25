/**
 * API Configuration
 *
 * NEXT_PUBLIC_API_URL is the base API URL, without a trailing slash, and is
 * inlined into the browser bundle. Setting it makes the browser call that
 * origin directly, so whichever host is named there is visible to anyone
 * watching the network tab.
 *
 * Leaving it unset is the default: requests stay same-origin and next.config
 * rewrites /api/* to NEXT_PUBLIC_API_PROXY_TARGET server-side, which keeps the
 * upstream host out of the browser entirely.
 */
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "")
  .replace(/\/api\/v1\/?$/, "")
  .replace(/\/+$/, "");

export const API_V1_URL = `${API_BASE_URL}/api/v1`;

export const IS_DEVELOPMENT = process.env.NODE_ENV === "development";

export const IS_PRODUCTION = process.env.NODE_ENV === "production";
