import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  ServerResponse,
  TokenAuthResponse,
} from "@/types";

import { IS_WHITELABEL_MODE } from "@/config/whitelabel";
import { clearSessionToken, setSessionToken } from "@/lib/auth/session-token";
import { ensureData } from "@/lib/errors";
import { apiClient } from "@/services/api";

/** Exchanges in flight or done, by code. A code is single-use. */
const exchanges = new Map<string, Promise<AuthResponse>>();

const requestSession = async (code: string): Promise<AuthResponse> => {
  if (!IS_WHITELABEL_MODE) {
    const response = await apiClient.post<ServerResponse<AuthResponse>>("/api/v1/auth/callback", { code });
    return ensureData(response.data.data, "Handoff failed: No authentication data received");
  }

  const response = await apiClient.post<ServerResponse<TokenAuthResponse>>("/api/v1/auth/callback", {
    code,
    mode: "token",
  });
  const session = ensureData(response.data.data, "Handoff failed: No authentication data received");
  setSessionToken(session.token, session.expires_at);
  return session;
};

/**
 * Exchange a one-time handoff code for a local session.
 * The browser lands on this app's /auth/callback, then this call talks to the API.
 * A whitelabel build receives a bearer token rather than a cookie.
 *
 * Repeated calls with the same code share one exchange, so a remounted
 * callback page cannot spend the code twice.
 */
export const exchangeHandoff = (code: string): Promise<AuthResponse> => {
  let exchange = exchanges.get(code);
  if (!exchange) {
    exchange = requestSession(code);
    exchanges.set(code, exchange);
  }
  return exchange;
};

/**
 * Login user with email and password
 *
 * @param credentials - Login credentials containing email and password
 * @returns Authentication response with access token and user data
 * @throws {ApiError} If login fails (invalid credentials, server error, etc.)
 *
 * @example
 * ```typescript
 * const response = await authService.login({
 *   email: 'user@example.com',
 *   password: 'securepassword'
 * });
 * ```
 */
export const login = async (credentials: LoginRequest): Promise<AuthResponse> => {
  const response = await apiClient.post<ServerResponse<AuthResponse>>("/api/v1/auth/login", credentials);
  return ensureData(response.data.data, "Login failed: No authentication data received");
};

/**
 * Register a new user account
 *
 * @param credentials - Registration data including email, password, and optional confirmPassword
 * @returns Registration response with user data
 * @throws {ApiError} If registration fails (email already exists, validation error, etc.)
 *
 * @example
 * ```typescript
 * const response = await authService.register({
 *   email: 'user@example.com',
 *   password: 'securepassword',
 *   name: 'John Doe'
 * });
 * ```
 */
export const register = async (
  credentials: { confirmPassword?: string } & RegisterRequest,
): Promise<RegisterResponse> => {
  // The exposure-management API currently accepts only email and password.
  // Keep the name fields in the UI, but do not send unknown JSON fields to its
  // strict request decoder.
  const registerData = {
    email: credentials.email,
    password: credentials.password,
  };
  const response = await apiClient.post<ServerResponse<RegisterResponse>>("/api/v1/auth/register", registerData);
  return ensureData(response.data.data, "Registration failed: No response data received");
};

/**
 * Logout the current user
 *
 * Invalidates the current session and clears authentication cookies, or the
 * bearer token in a whitelabel build.
 *
 * @throws {ApiError} If logout fails
 *
 * @example
 * ```typescript
 * await authService.logout();
 * ```
 */
export const logout = async (): Promise<void> => {
  try {
    await apiClient.post("/api/v1/auth/logout");
  } finally {
    clearSessionToken();
  }
};
