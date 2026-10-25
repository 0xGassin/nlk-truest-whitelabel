/**
 * Automatic whitelabel sign-in.
 *
 * A whitelabel build signs the visitor in without a form. With no valid
 * session the browser goes to the session route, which mints a one-time code
 * with the partner key and redirects to /auth/callback. The callback
 * exchanges the code for a token and returns to the page the visitor asked
 * for.
 *
 * A broken deployment would bounce between those pages forever, so at most
 * MAX_ATTEMPTS sign-ins start within ATTEMPT_WINDOW_MS. Past that, the
 * callback page shows its error state and waits for "Try again".
 */
import { WHITELABEL_LOGIN_PATH, WHITELABEL_SESSION_PATH } from "@/config/whitelabel";

const ATTEMPTS_KEY = "truest.whitelabel-sign-in";
const MAX_ATTEMPTS = 2;
const ATTEMPT_WINDOW_MS = 60_000;
const CALLBACK_PATH = "/auth/callback";

/** Set once this page has started a sign-in, so parallel 401s count once. */
let redirecting = false;

function recentAttempts(): number[] {
  try {
    const stored: unknown = JSON.parse(globalThis.sessionStorage.getItem(ATTEMPTS_KEY) ?? "[]");
    if (!Array.isArray(stored)) return [];
    const since = Date.now() - ATTEMPT_WINDOW_MS;
    return stored.filter((at): at is number => typeof at === "number" && at > since);
  } catch {
    return [];
  }
}

/** The page to come back to: this one, or the one the sign-in pages carry. */
function returnUrl(): null | string {
  const { pathname, search } = globalThis.location;
  if (pathname === CALLBACK_PATH || pathname === WHITELABEL_LOGIN_PATH) {
    return new URLSearchParams(search).get("returnUrl");
  }
  return `${pathname}${search}`;
}

/**
 * Starts a sign-in and returns true, or returns false when too many have
 * failed recently. Away from the callback page a refused sign-in moves there,
 * so the visitor sees the error state rather than a blank page.
 */
export function sendToWhitelabelSignIn(): boolean {
  if (redirecting) return true;

  const params = new URLSearchParams();
  const destination = returnUrl();
  if (destination) params.set("returnUrl", destination);

  const attempts = recentAttempts();
  if (attempts.length >= MAX_ATTEMPTS) {
    if (globalThis.location.pathname !== CALLBACK_PATH) {
      params.set("error", "signin");
      redirecting = true;
      globalThis.location.assign(`${CALLBACK_PATH}?${params.toString()}`);
    }
    return false;
  }

  globalThis.sessionStorage.setItem(ATTEMPTS_KEY, JSON.stringify([...attempts, Date.now()]));
  redirecting = true;
  const query = params.size > 0 ? `?${params.toString()}` : "";
  globalThis.location.assign(`${WHITELABEL_SESSION_PATH}${query}`);
  return true;
}

/** Forgets earlier failures, for an explicit "Try again". */
export function resetWhitelabelSignIn(): void {
  globalThis.sessionStorage.removeItem(ATTEMPTS_KEY);
}
