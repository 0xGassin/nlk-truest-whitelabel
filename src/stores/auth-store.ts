import type { User } from "@/types";

import { create } from "zustand";

import { organizationService, userService } from "@/services/api";

interface AuthState {
  error: null | string;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: null | User;
}

interface AuthActions {
  clearAuth: () => void;
  initAuth: () => Promise<void>;
  setAuth: (user: User) => void;
  setAuthWithOrganization: (user: User) => Promise<void>;
  setError: (error: null | string) => void;
  setLoading: (loading: boolean) => void;
  setUser: (user: null | User) => void;
}

type AuthStore = AuthActions & AuthState;

/**
 * Authentication state for the exposure-management API.
 *
 * The API stores the JWT in an HttpOnly cookie, so the browser does not keep
 * or send an access token from JavaScript. The store only tracks the current
 * user and asks the API to validate the cookie on startup.
 */
export const useAuthStore = create<AuthStore>((set, get) => ({
  clearAuth: () => {
    set({
      error: null,
      isAuthenticated: false,
      isLoading: false,
      user: null,
    });
  },

  error: null,

  initAuth: async () => {
    const state = get();

    if (state.isAuthenticated && state.user) {
      set({ isLoading: false });
      return;
    }

    set({ error: null, isLoading: true });

    try {
      const user = await userService.getProfile();
      let hydratedUser = user;

      if (user.organization_id && !user.organization) {
        try {
          const organization = await organizationService.getOrganization(user.organization_id);
          hydratedUser = { ...user, organization };
        } catch {
          // Keep authentication usable so the app can present its no-organization state.
        }
      }

      set({
        error: null,
        isAuthenticated: true,
        isLoading: false,
        user: hydratedUser,
      });
    } catch {
      set({
        error: null,
        isAuthenticated: false,
        isLoading: false,
        user: null,
      });
    }
  },

  isAuthenticated: false,
  isLoading: true,

  setAuth: (user: User) => {
    set({
      error: null,
      isAuthenticated: true,
      isLoading: false,
      user,
    });
  },

  setAuthWithOrganization: async (user: User) => {
    if (!user.organization_id || user.organization) {
      set({
        error: null,
        isAuthenticated: true,
        isLoading: false,
        user,
      });
      return;
    }

    try {
      const organization = await organizationService.getOrganization(user.organization_id);
      set({
        error: null,
        isAuthenticated: true,
        isLoading: false,
        user: { ...user, organization },
      });
    } catch {
      set({
        error: null,
        isAuthenticated: true,
        isLoading: false,
        user,
      });
    }
  },

  setError: (error: null | string) => {
    set({ error });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setUser: (user: null | User) => {
    set({ user });
  },

  user: null,
}));

export const selectUser = (state: AuthStore) => state.user;
export const selectIsAuthenticated = (state: AuthStore) => state.isAuthenticated;
export const selectIsLoading = (state: AuthStore) => state.isLoading;
export const selectError = (state: AuthStore) => state.error;
