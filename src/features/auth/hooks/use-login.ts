"use client";

import type { LoginRequest } from "@/types";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { authService } from "@/features/auth";
import { getReturnUrl, isValidEmail, parseAuthError } from "@/lib/auth/utils";
import { useAuthStore } from "@/stores/auth-store";

interface UseLoginReturn {
  clearError: () => void;
  error: null | string;
  fieldErrors: Record<string, string>;
  formData: LoginRequest;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  isLoading: boolean;
}

/**
 * Hook for handling user login with validation and error handling.
 *
 * Features:
 * - Email format validation
 * - Field-level error messages
 * - Proper error parsing
 * - Automatic profile fetch + state update
 * - Smart redirect logic (handles returnUrl)
 */
export function useLogin(): UseLoginReturn {
  const router = useRouter();
  const { setAuthWithOrganization } = useAuthStore();

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
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      // Validate form before API call
      if (!validateForm()) {
        return;
      }

      setIsLoading(true);

      try {
        // Call login API
        const response = await authService.login({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        });

        // The API authenticates with an HttpOnly cookie and returns the user.
        await setAuthWithOrganization(response.user);

        // Redirect to dashboard or return URL
        router.push(getReturnUrl());
      } catch (error_) {
        const authError = parseAuthError(error_);

        if (authError.field) {
          setFieldErrors({ [authError.field]: authError.message });
        } else {
          setError(authError.message);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [formData, validateForm, setAuthWithOrganization, router],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { id, value } = e.target;

      setFormData((prev) => ({
        ...prev,
        [id]: value,
      }));

      // Clear field error when user starts typing
      if (fieldErrors[id]) {
        setFieldErrors((prev) => {
          const { [id]: _removed, ...next } = prev;
          return next;
        });
      }

      // Clear general error if it exists
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
