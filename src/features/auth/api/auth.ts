import type { AuthResponse, LoginRequest, RegisterRequest, RegisterResponse, ServerResponse } from "@/types";

import { ensureData } from "@/lib/errors";
import { apiClient } from "@/services/api";

/**
 * Exchange a nulink-root one-time handoff code for a local session.
 * The browser lands on this app's /auth/callback, then this call talks to the API.
 */
export const exchangeHandoff = async (code: string): Promise<AuthResponse> => {
  const response = await apiClient.post<ServerResponse<AuthResponse>>("/api/v1/auth/callback", { code });
  return ensureData(response.data.data, "Handoff failed: No authentication data received");
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
 * Invalidates the current session and clears authentication cookies.
 *
 * @throws {ApiError} If logout fails
 *
 * @example
 * ```typescript
 * await authService.logout();
 * ```
 */
export const logout = async (): Promise<void> => {
  await apiClient.post("/api/v1/auth/logout");
};
