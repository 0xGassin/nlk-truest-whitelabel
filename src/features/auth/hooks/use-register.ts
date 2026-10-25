"use client";

import type { RegisterRequest } from "@/types";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { authService } from "@/features/auth";
import { getReturnUrl, isValidEmail, parseAuthError, validatePassword } from "@/lib/auth/utils";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Form data extends RegisterRequest with confirmPassword for validation
 */
interface RegisterFormData extends Omit<RegisterRequest, "first_name" | "last_name"> {
  confirmPassword: string;
  first_name: string;
  last_name: string;
}

interface UseRegisterReturn {
  clearError: () => void;
  error: null | string;
  fieldErrors: Record<string, string>;
  formData: RegisterFormData;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  isLoading: boolean;
}

/**
 * Hook for handling user registration with comprehensive validation.
 *
 * Features:
 * - Email format validation
 * - Password strength validation (8+ chars, upper, lower, number)
 * - Password confirmation matching
 * - Field-level error messages
 * - Automatic redirect after success
 */
export function useRegister(): UseRegisterReturn {
  const router = useRouter();
  const { setAuthWithOrganization } = useAuthStore();

  const [formData, setFormData] = useState<RegisterFormData>({
    confirmPassword: "",
    email: "",
    first_name: "",
    last_name: "",
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

    // Email validation
    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!isValidEmail(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    // Name validation
    if (!formData.first_name.trim()) {
      errors.first_name = "First name is required";
    }
    if (!formData.last_name.trim()) {
      errors.last_name = "Last name is required";
    }

    // Password validation
    if (formData.password) {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        errors.password = passwordValidation.errors[0];
      }
    } else {
      errors.password = "Password is required";
    }

    // Confirm password
    if (!formData.confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      // Validate form
      if (!validateForm()) {
        return;
      }

      setIsLoading(true);

      try {
        // Call register API
        await authService.register({
          email: formData.email.trim().toLowerCase(),
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          password: formData.password,
        });

        // Registration creates the account; login establishes the HttpOnly
        // session cookie because the API keeps those operations separate.
        const loginResponse = await authService.login({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        });
        await setAuthWithOrganization(loginResponse.user);

        // Redirect to dashboard or return URL
        router.push(getReturnUrl());
      } catch (error_) {
        const authError = parseAuthError(error_);

        // Set field-specific error if applicable
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

      // Clear general error
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
