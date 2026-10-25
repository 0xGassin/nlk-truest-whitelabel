/**
 * API Configuration
 *
 * NEXT_PUBLIC_API_URL should be set to the base API URL without trailing slash.
 * Example: http://localhost:8081 or https://eapi.nulinksec.com
 */
const CURRENT_API_ORIGIN = "https://eapi.nulinksec.com";

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? CURRENT_API_ORIGIN)
  .replace(/\/api\/v1\/?$/, "")
  .replace(/\/+$/, "");

export const API_V1_URL = `${API_BASE_URL}/api/v1`;

export const IS_DEVELOPMENT = process.env.NODE_ENV === "development";

export const IS_PRODUCTION = process.env.NODE_ENV === "production";
