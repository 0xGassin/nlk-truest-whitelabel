// API Services
export * as authService from "./api/auth";
export * from "./api/auth";

export { AuthGuard, useAuth, useAuthActions } from "./components/auth-guard";
export { AuthLayout } from "./components/auth-layout";
export { LoginForm } from "./components/login-form";
// Components
export { LoginPage } from "./components/login-page";
export { PasswordStrengthIndicator } from "./components/password-strength-indicator";
export { RegisterForm } from "./components/register-form";
export { RegisterPage } from "./components/register-page";

// Utils - Re-export from lib/auth for convenience
export {
  type AuthError,
  buildLoginUrl,
  decodeJWT,
  DEFAULT_PASSWORD_REQUIREMENTS,
  getReturnUrl,
  getTokenRemainingTime,
  isPasswordValid,
  isTokenExpired,
  isValidEmail,
  parseAuthError,
  type PasswordRequirements,
  type PasswordValidationResult,
  validatePassword,
} from "@/lib/auth/utils";
