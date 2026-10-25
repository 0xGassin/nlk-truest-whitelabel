"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { UniversalLoader } from "@/components/ui/universal-loader";
import { isSignInConfigured, sendToRootLogin } from "@/lib/auth/root";
import { useAuthStore } from "@/stores/auth-store";

export default function Page() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.push("/dashboard");
      } else {
        sendToRootLogin();
      }
    }
  }, [isAuthenticated, isLoading, router]);

  if (!isLoading && !isAuthenticated && !isSignInConfigured()) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
        Sign-in is not configured.
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <UniversalLoader />
    </div>
  );
}
