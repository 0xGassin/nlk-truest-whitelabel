"use client";

import { useEffect } from "react";

import { PageSkeleton } from "@/components/page-skeleton";
import { isSignInConfigured, sendToRootHome, sendToRootLogin } from "@/lib/auth/root";
import { logger } from "@/lib/logger";
import { useAuthStore } from "@/stores/auth-store";

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * AuthGuard component to protect routes that require authentication.
 * An unauthenticated visitor is sent to the sign-in screen.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading || isAuthenticated) return;
    sendToRootLogin();
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (!isAuthenticated) {
    if (!isSignInConfigured()) {
      return (
        <div className="flex min-h-screen items-center justify-center px-6 text-center text-sm text-muted-foreground">
          Sign-in is not configured.
        </div>
      );
    }
    return null;
  }

  return <>{children}</>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const { isAuthenticated, isLoading, setUser, user } = useAuthStore();

  return {
    isAuthenticated,
    isLoading,
    setUser,
    user,
  };
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuthActions() {
  const { clearAuth } = useAuthStore();

  const returnToHome = async () => {
    try {
      const { authService } = await import("@/features/auth");
      await authService.logout();
    } catch (error) {
      logger.error("Failed to end the Exposure session", { error });
    } finally {
      clearAuth();
    }

    sendToRootHome();
  };

  return {
    returnToHome,
  };
}
