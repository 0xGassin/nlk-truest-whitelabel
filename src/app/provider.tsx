"use client";

import * as React from "react";

import { ErrorBoundary } from "@/components/error-boundary";
import { QueryProvider } from "@/components/query-provider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ToastProvider } from "@/components/ui/toast/toast";
import { ThemeProvider } from "@/features/settings";
import { useAuthStore } from "@/stores/auth-store";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const initAuth = useAuthStore((state) => state.initAuth);

  React.useEffect(() => {
    if (window.location.pathname === "/auth/callback") return;
    void initAuth();
  }, [initAuth]);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <SidebarProvider>
            <QueryProvider>{children}</QueryProvider>
          </SidebarProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
