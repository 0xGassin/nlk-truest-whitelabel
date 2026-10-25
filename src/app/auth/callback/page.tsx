"use client";

import type { AuthResponse } from "@/types";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { UniversalLoader } from "@/components/ui/universal-loader";
import { IS_WHITELABEL_MODE } from "@/config/whitelabel";
import { exchangeHandoff } from "@/features/auth/api/auth";
import { isSignInConfigured, sendToRootHome, sendToRootLogin } from "@/lib/auth/root";
import { getReturnUrl } from "@/lib/auth/utils";
import { logger } from "@/lib/logger";
import { userService } from "@/services/api";
import { useAuthStore } from "@/stores/auth-store";

/**
 * One exchange per code, shared across remounts.
 *
 * A handoff code is single-use: nulink-root deletes the row as it redeems it,
 * so a second attempt with the same code always comes back 401. React Strict
 * Mode, Fast Refresh and a manual reload all remount this component, so the
 * request is kept here, outside the component, and every mount awaits the one
 * promise instead of starting a new exchange.
 */
const exchanges = new Map<string, Promise<AuthResponse>>();

function exchangeOnce(code: string): Promise<AuthResponse> {
  const pending = exchanges.get(code);
  if (pending) return pending;

  const started = exchangeHandoff(code);
  exchanges.set(code, started);
  return started;
}

function HandoffCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuthWithOrganization = useAuthStore((state) => state.setAuthWithOrganization);
  const [error, setError] = useState<null | string>(null);
  const code = searchParams.get("code")?.trim() ?? "";
  const signInUnavailable = !code && !isSignInConfigured();

  useEffect(() => {
    if (!code) {
      if (isSignInConfigured()) {
        sendToRootLogin();
      }
      return;
    }

    const mount: { active: boolean } = { active: true };

    // Read the destination, then drop the code from the address bar before
    // the exchange. The code and the returnUrl share one search string, and a
    // reload that still carried a spent code could only ever fail.
    const destination = getReturnUrl();
    globalThis.history.replaceState(null, "", "/auth/callback");

    void (async () => {
      try {
        const response = await exchangeOnce(code);
        const user = await userService.getProfile().catch(() => response.user);
        await setAuthWithOrganization(user);
        // Navigate even when this mount has already been torn down. Strict
        // Mode discards the first mount immediately, and by this point the
        // session is live, so stranding the user on the loader is the worse
        // outcome.
        router.replace(destination);
      } catch (error_) {
        logger.error("Handoff exchange failed", { error: error_ });
        if (!mount.active) return;
        setError(
          IS_WHITELABEL_MODE
            ? "This sign-in link has expired or is no longer valid. Please sign in again."
            : "This sign-in link is invalid or you do not have a seat yet.",
        );
      }
    })();

    return () => {
      active = false;
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
