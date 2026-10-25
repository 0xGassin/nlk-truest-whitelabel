/**
 * Bearer session for a whitelabel build.
 *
 * A whitelabel app runs on its own site, so the browser drops the API's
 * session cookie. The callback exchange asks for a bearer token instead,
 * which is kept here for the life of the tab and sent on every API call.
 * An expired token is treated as absent.
 */
const STORAGE_KEY = "nulink.session-token";

interface StoredToken {
  expires_at: string;
  token: string;
}

export function getSessionToken(): null | string {
  const raw = globalThis.sessionStorage?.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const stored = JSON.parse(raw) as StoredToken;
    if (stored.token && Date.parse(stored.expires_at) > Date.now()) {
      return stored.token;
    }
  } catch {
    // A malformed entry is discarded below.
  }
  clearSessionToken();
  return null;
}

export function setSessionToken(token: string, expiresAt: string): void {
  const stored: StoredToken = { expires_at: expiresAt, token };
  globalThis.sessionStorage?.setItem(STORAGE_KEY, JSON.stringify(stored));
}

export function clearSessionToken(): void {
  globalThis.sessionStorage?.removeItem(STORAGE_KEY);
}
