import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";

import axios from "axios";

import { API_BASE_URL } from "@/config";
import { sendToRootLogin } from "@/lib/auth/root";

/**
 * Shared API client for the exposure-management server.
 *
 * Authentication is handled by the server's HttpOnly cookie. A 401 outside
 * the handoff callback sends the browser back to nulink-root, matching Cloud.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
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
      sendToRootLogin();
    }
    throw error;
  },
);
