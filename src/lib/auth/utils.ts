"use client";

/**
 * Authentication Utilities
 *
 * Provides password validation, token utilities, and auth-related helpers.
 * Follows security best practices for client-side authentication.
 */

// =============================================================================
// PASSWORD VALIDATION
// =============================================================================

export interface PasswordValidationResult {
  errors: string[];
  isValid: boolean;
  score: number; // 0-100
  strength: "fair" | "good" | "strong" | "weak";
}

export interface PasswordRequirements {
  minLength: number;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecialChar: boolean;
  requireUppercase: boolean;
}

export const DEFAULT_PASSWORD_REQUIREMENTS: PasswordRequirements = {
  minLength: 8,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: false, // Optional but adds to strength
  requireUppercase: true,
};

/**
 * Validates a password against security requirements
 */
export function validatePassword(
  password: string,
  requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS,
): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  // Length check
  if (password.length < requirements.minLength) {
    errors.push(`Password must be at least ${String(requirements.minLength)} characters`);
  } else {
    score += 25;
    // Bonus for longer passwords
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;
  }

  // Uppercase check
  const hasUppercase = /[A-Z]/.test(password);
  if (requirements.requireUppercase && !hasUppercase) {
    errors.push("Password must contain at least one uppercase letter");
  } else if (hasUppercase) {
    score += 15;
  }

  // Lowercase check
  const hasLowercase = /[a-z]/.test(password);
  if (requirements.requireLowercase && !hasLowercase) {
    errors.push("Password must contain at least one lowercase letter");
  } else if (hasLowercase) {
    score += 15;
  }

  // Number check
  const hasNumber = /[0-9]/.test(password);
  if (requirements.requireNumber && !hasNumber) {
    errors.push("Password must contain at least one number");
  } else if (hasNumber) {
    score += 15;
  }

  // Special character check
  const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  if (requirements.requireSpecialChar && !hasSpecialChar) {
    errors.push("Password must contain at least one special character");
  } else if (hasSpecialChar) {
    score += 20;
  }

  // Cap score at 100
  score = Math.min(score, 100);

  // Determine strength
  let strength: PasswordValidationResult["strength"];
  if (score < 40) {
    strength = "weak";
  } else if (score < 60) {
    strength = "fair";
  } else if (score < 80) {
    strength = "good";
  } else {
    strength = "strong";
  }

  return {
    errors,
    isValid: errors.length === 0,
    score,
    strength,
  };
}

/**
 * Quick check if password meets minimum requirements
 */
export function isPasswordValid(password: string): boolean {
  return validatePassword(password).isValid;
}

// =============================================================================
// EMAIL VALIDATION
// =============================================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

// =============================================================================
// TOKEN UTILITIES
// =============================================================================

interface JWTPayload {
  [key: string]: unknown;
  exp?: number;
  iat?: number;
  sub?: string;
  user_id?: string;
}

/**
 * Decodes a JWT token without verifying the signature.
 * Only use this for reading non-sensitive claims like expiry time.
 * Server-side validation is still required for security.
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1];
    // Handle URL-safe base64
    const base64 = String(payload ?? "").replaceAll("-", "+").replaceAll("_", "/");
    const decoded = atob(base64);
    return JSON.parse(decoded) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Checks if a JWT token is expired or about to expire
 * @param token - The JWT token to check
 * @param bufferSeconds - Consider token expired this many seconds before actual expiry (default: 60)
 */
export function isTokenExpired(token: null | string, bufferSeconds = 60): boolean {
  if (!token) return true;

  const payload = decodeJWT(token);
  if (!payload?.exp) return true;

  const expiryTime = payload.exp * 1000; // Convert to milliseconds
  const bufferMs = bufferSeconds * 1000;
  return Date.now() >= expiryTime - bufferMs;
}

/**
 * Gets the remaining time until token expires
 * @returns Remaining time in seconds, or 0 if expired
 */
export function getTokenRemainingTime(token: null | string): number {
  if (!token) return 0;

  const payload = decodeJWT(token);
  if (!payload?.exp) return 0;

  const expiryTime = payload.exp * 1000;
  const remaining = Math.max(0, expiryTime - Date.now());
  return Math.floor(remaining / 1000);
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

export interface AuthError {
  code: string;
  field?: string;
  message: string;
}

/**
 * Parses API error responses into a user-friendly format
 */
export function parseAuthError(error: unknown): AuthError {
  // Handle axios errors
  if (typeof error === "object" && error !== null && "response" in error) {
    const axiosError = error as { response?: { data?: { error?: string; message?: string }; status?: number } };
    const status = axiosError.response?.status;
    const data = axiosError.response?.data;

    // Common HTTP status codes
    switch (status) {
      case 400:
        return {
          code: "BAD_REQUEST",
          message: data?.message ?? "Invalid request. Please check your input.",
        };
      case 401:
        return {
          code: "UNAUTHORIZED",
          message: "Invalid email or password.",
        };
      case 403:
        return {
          code: "FORBIDDEN",
          message: "You do not have permission to perform this action.",
        };
      case 409:
        return {
          code: "CONFLICT",
          field: "email",
          message: "This email is already registered.",
        };
      case 429:
        return {
          code: "RATE_LIMITED",
          message: "Too many attempts. Please try again later.",
        };
      case 500:
      case 502:
      case 503:
        return {
          code: "SERVER_ERROR",
          message: "Something went wrong. Please try again later.",
        };
      default:
        return {
          code: "UNKNOWN",
          message: data?.message ?? data?.error ?? "An unexpected error occurred.",
        };
    }
  }

  // Handle generic errors
  if (error instanceof Error) {
    return {
      code: "ERROR",
      message: error.message,
    };
  }

  return {
    code: "UNKNOWN",
    message: "An unexpected error occurred.",
  };
}

// =============================================================================
// AUTH STATE HELPERS
// =============================================================================

/**
 * Gets the return URL from query params for post-login redirect
 */
export function getReturnUrl(): string {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- SSR guard
  if (globalThis.window === undefined) return "/dashboard";

  const params = new URLSearchParams(globalThis.location.search);
  const returnUrl = params.get("returnUrl");

  // Validate return URL to prevent open redirect attacks
  if (returnUrl && returnUrl.startsWith("/") && !returnUrl.startsWith("//")) {
    return returnUrl;
  }

  return "/dashboard";
}

/**
 * Builds a login URL with optional return path
 */
export function buildLoginUrl(returnPath?: string): string {
  if (!returnPath || returnPath === "/login" || returnPath === "/register") {
    return "/login";
  }
  return `/login?returnUrl=${encodeURIComponent(returnPath)}`;
}
