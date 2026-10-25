"use client";

import type { LoginRequest } from "@/types";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { WHITELABEL_SESSION_PATH } from "@/config/whitelabel";
import { isValidEmail } from "@/lib/auth/utils";
import { logger } from "@/lib/logger";

interface UseWhitelabelLoginReturn {
  clearError: () => void;
  error: null | string;
  fieldErrors: Record<string, string>;
  formData: LoginRequest;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.SyntheticEvent) => Promise<void>;
  isLoading: boolean;
}

/** Keeps an attacker from bouncing the user off-site through returnUrl. */
function safeReturnUrl(): null | string {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- SSR guard
  if (globalThis.window === undefined) return null;

  const returnUrl = new URLSearchParams(globalThis.location.search).get("returnUrl");
  if (returnUrl && returnUrl.startsWith("/") && !returnUrl.startsWith("//")) {
    return returnUrl;
  }
  return null;
}

/**
 * Whitelabel sign-in.
 *
 * The form posts to this app's own server, which checks the credentials and
 * mints a one-time access code through the partner API. The code is then
 * handed to /auth/callback, the same route the partner API's handoff uses, which
 * exchanges it for a bearer token. This app runs on a different site from the
 * API, where the API's session cookie would be dropped, so every API call
 * after that carries the token instead, against the existing routes.
 *
 * The code is single-use and expires in 60 seconds, so it goes straight to
 * the callback and is stripped from the URL there.
 */
export function useWhitelabelLogin(): UseWhitelabelLoginReturn {
  const router = useRouter();

  const [formData, setFormData] = useState<LoginRequest>({
    email: "",
    password: "",
  });

  const [error, setError] = useState<null | string>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const clearError = useCallback(() => {
    setError(null);
    setFieldErrors({});
  }, []);

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!isValidEmail(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      errors.password = "Password is required";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(
    async (e: React.SyntheticEvent) => {
      e.preventDefault();
      setError(null);

      if (!validateForm()) return;

      setIsLoading(true);

      try {
        const response = await fetch(WHITELABEL_SESSION_PATH, {
          body: JSON.stringify({
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });

        const body = (await response.json().catch(() => ({}))) as { code?: string; error?: string };

        if (!response.ok || !body.code) {
          setError(body.error ?? "Sign-in failed. Please try again.");
          return;
        }

        // /auth/callback performs the exchange and lands on the dashboard.
        const params = new URLSearchParams({ code: body.code });
        const returnUrl = safeReturnUrl();
        if (returnUrl) params.set("returnUrl", returnUrl);
        router.replace(`/auth/callback?${params.toString()}`);
      } catch (error_) {
        logger.error("Whitelabel sign-in failed", { error: error_ });
        setError("Sign-in failed. Please check your connection and try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [formData, validateForm, router],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { id, value } = e.target;

      setFormData((prev) => ({
        ...prev,
        [id]: value,
      }));

      if (fieldErrors[id]) {
        setFieldErrors((prev) => {
          const { [id]: _removed, ...next } = prev;
          return next;
        });
      }

      if (error) {
        setError(null);
      }
    },
    [fieldErrors, error],
  );

  return {
    clearError,
    error,
    fieldErrors,
    formData,
    handleChange,
    handleSubmit,
    isLoading,
  };
}
