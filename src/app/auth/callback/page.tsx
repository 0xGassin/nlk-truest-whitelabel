"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { UniversalLoader } from "@/components/ui/universal-loader";
import { IS_WHITELABEL_MODE } from "@/config/whitelabel";
import { exchangeHandoff } from "@/features/auth/api/auth";
import { isSignInConfigured, sendToRootHome, sendToRootLogin } from "@/lib/auth/root";
import { getReturnUrl } from "@/lib/auth/utils";
import { logger } from "@/lib/logger";
import { userService } from "@/services/api";
import { useAuthStore } from "@/stores/auth-store";

function HandoffCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuthWithOrganization = useAuthStore((state) => state.setAuthWithOrganization);
  const [error, setError] = useState<null | string>(null);
  const started = useRef(false);
  const code = searchParams.get("code")?.trim() ?? "";
  const signInUnavailable = !code && !isSignInConfigured();

  useEffect(() => {
    if (!code) {
      if (isSignInConfigured()) {
        sendToRootLogin();
      }
      return;
    }
    if (started.current) return;
    started.current = true;

    const gate: { cancelled: boolean } = { cancelled: false };
    void (async () => {
      try {
        const response = await exchangeHandoff(code);
        const user = await userService.getProfile().catch(() => response.user);
        if (gate.cancelled) return;
        await setAuthWithOrganization(user);
        // Read the destination before clearing the query, since the one-time
        // code and the returnUrl live in the same search string.
        const destination = getReturnUrl();
        globalThis.history.replaceState(null, "", "/auth/callback");
        router.replace(destination);
      } catch (error_) {
        logger.error("Handoff exchange failed", { error: error_ });
        if (gate.cancelled) return;
        setError(
          IS_WHITELABEL_MODE
            ? "This sign-in link has expired or is no longer valid. Please sign in again."
            : "This sign-in link is invalid or you do not have a seat yet.",
        );
      }
    })();

    return () => {
      gate.cancelled = true;
    };
  }, [code, router, setAuthWithOrganization]);

  if (signInUnavailable) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-sm text-muted-foreground">
        Sign-in is not configured.
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
        {isSignInConfigured() ? (
          <button
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            onClick={sendToRootHome}
            type="button"
          >
            {IS_WHITELABEL_MODE ? "Back to sign in" : "Back to Home"}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <UniversalLoader />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen w-full items-center justify-center">
          <UniversalLoader />
        </div>
      }
    >
      <HandoffCallback />
    </Suspense>
  );
}
