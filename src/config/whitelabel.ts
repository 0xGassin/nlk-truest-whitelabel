/**
 * Whitelabel mode.
 *
 * A whitelabel build is the copy of this client handed to a partner. It does
 * not sign in through nulink-root. Instead this app's own server holds the
 * partner API key, mints a one-time access code for the partner's client
 * organization, and the browser exchanges that code for an Exposure session
 * on the existing /auth/callback route.
 *
 * NEXT_PUBLIC_ is deliberate: the browser reads this to choose the sign-in
 * path. The partner API key is a server secret and never carries that prefix.
 * See src/app/whitelabel/session/route.ts.
 */
export const IS_WHITELABEL_MODE = process.env.NEXT_PUBLIC_WHITELABEL_MODE === "true";

/** Where an unauthenticated visitor is sent in a whitelabel build. */
export const WHITELABEL_LOGIN_PATH = "/login";

/** Server route that checks credentials and returns a one-time access code. */
export const WHITELABEL_SESSION_PATH = "/whitelabel/session";
