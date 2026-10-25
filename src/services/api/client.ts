import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";

import axios from "axios";

import { API_BASE_URL } from "@/config";
import { IS_WHITELABEL_MODE } from "@/config/whitelabel";
import { sendToRootLogin } from "@/lib/auth/root";
import { clearSessionToken, getSessionToken } from "@/lib/auth/session-token";
import { sendToWhitelabelSignIn } from "@/lib/auth/whitelabel";

/**
 * Shared API client for the exposure-management server.
 *
 * Authentication is handled by the server's HttpOnly cookie. A 401 outside
 * the handoff callback sends the browser back to the sign-in screen.
 *
 * A whitelabel build runs on another site, where the browser drops that
 * cookie, so it sends the bearer token from the callback exchange instead. A
 * 401 there discards the token and signs in again automatically.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: !IS_WHITELABEL_MODE,
});

apiClient.interceptors.request.use((config) => {
  const token = getSessionToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const url = (error.config as InternalAxiosRequestConfig | undefined)?.url ?? "";
    if (
      error.response?.status === 401 &&
      !url.includes("/auth/callback") &&
      !url.includes("/auth/login") &&
      globalThis.window !== undefined &&
      globalThis.location.pathname !== "/auth/callback"
    ) {
      if (IS_WHITELABEL_MODE) {
        clearSessionToken();
        sendToWhitelabelSignIn();
      } else {
        sendToRootLogin();
      }
    }
    throw error;
  },
);
