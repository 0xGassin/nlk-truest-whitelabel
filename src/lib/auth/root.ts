/**
 * Nulink Root is the login and seat manager for this product.
 * A visitor with no session, and a session that has just ended, is sent
 * to the root login screen. After login, the redirect continues through the
 * root handoff back into Exposure.
 *
 * A whitelabel build has no root session: this app signs the user in itself
 * with a partner-issued code (see ./whitelabel.ts). Every redirect below
 * therefore stays on this origin when IS_WHITELABEL_MODE is set.
 */
import { IS_WHITELABEL_MODE, WHITELABEL_LOGIN_PATH } from "@/config/whitelabel";

import { sendToWhitelabelSignIn } from "./whitelabel";

const ROOT_APP_URL_DEFAULT = "https://app.nulinksec.com";
const LOCAL_AUTH_MODE_KEY = "nulink.local-auth-mode";

const configuredRootURL = (process.env.NEXT_PUBLIC_ROOT_URL ?? "").replace(/\/+$/, "");

export const ROOT_APP_URL = configuredRootURL || ROOT_APP_URL_DEFAULT;

export const ROOT_PRODUCT_ID = process.env.NEXT_PUBLIC_ROOT_PRODUCT_ID ?? "easm";

export function enableLocalAuthMode(): void {
  globalThis.sessionStorage?.setItem(LOCAL_AUTH_MODE_KEY, "true");
}

export function isLocalAuthMode(): boolean {
  if (globalThis.window === undefined) return false;

  return (
    globalThis.location.pathname === "/local-login" ||
    new URLSearchParams(globalThis.location.search).get("local") === "1" ||
    globalThis.sessionStorage?.getItem(LOCAL_AUTH_MODE_KEY) === "true"
  );
}

export function isRootSSOEnabled(): boolean {
  return !IS_WHITELABEL_MODE && ROOT_APP_URL.length > 0;
}

/**
 * Whether this build has any way to sign a user in. A whitelabel build signs
 * in on its own origin, so root SSO being off is not a misconfiguration.
 */
export function isSignInConfigured(): boolean {
  return IS_WHITELABEL_MODE || isRootSSOEnabled();
}

/** Path on the root app that issues a one-time code for this product. */
export function rootHandoffPath(): string {
  return `/api/v1/auth/handoff/${encodeURIComponent(ROOT_PRODUCT_ID)}`;
}

export function rootHandoffURL(): string {
  return `${ROOT_APP_URL}${rootHandoffPath()}`;
}

export function rootLoginURL(): string {
  return `${ROOT_APP_URL}/login?redirect=${encodeURIComponent(rootHandoffPath())}`;
}

export function rootHomeURL(): string {
  return ROOT_APP_URL;
}

export function sendToRootHandoff(): void {
  if (!isRootSSOEnabled()) return;
  globalThis.location.assign(rootHandoffURL());
}

export function sendToRootLogin(): void {
  if (IS_WHITELABEL_MODE) {
    sendToWhitelabelSignIn();
    return;
  }
  if (isLocalAuthMode()) {
    if (globalThis.location.pathname !== "/local-login") {
      globalThis.location.assign("/local-login");
    }
    return;
  }
  if (!isRootSSOEnabled()) return;
  globalThis.location.assign(rootLoginURL());
}

export function sendToRootHome(): void {
  // A whitelabel user has no nulink-root account to return to, so signing out
  // lands back on this app's own login page.
  if (IS_WHITELABEL_MODE) {
    globalThis.location.assign(WHITELABEL_LOGIN_PATH);
    return;
  }
  if (!isRootSSOEnabled()) return;
  globalThis.location.assign(ROOT_APP_URL);
}
