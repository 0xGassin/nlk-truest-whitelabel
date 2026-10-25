/**
 * Product branding.
 *
 * Contact details differ per deployment, so they are configurable. The
 * pricing link has no safe default: an unset value hides the link rather than
 * sending users to a page that may not exist.
 */
export const BRAND_NAME = "Truest";

export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@truest.ae";

export const PRICING_URL = process.env.NEXT_PUBLIC_PRICING_URL ?? "";

export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;
