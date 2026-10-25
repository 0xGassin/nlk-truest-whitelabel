"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { AlertMessage } from "@/components/ui/alert-message";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IS_WHITELABEL_MODE } from "@/config/whitelabel";
import { enableLocalAuthMode, isRootSSOEnabled, sendToRootLogin } from "@/lib/auth/root";
import { cn } from "@/lib/utils";

import { useLogin } from "../hooks/use-login";
import { useWhitelabelLogin } from "../hooks/use-whitelabel-login";

export function LoginForm({ className, local = false, ...props }: React.ComponentProps<"form"> & { local?: boolean }) {
  // A whitelabel build signs in through the partner API; a normal build posts
  // email and password to the Exposure API. Both hooks expose the same shape.
  const whitelabel = useWhitelabelLogin();
  const standard = useLogin();
  const { error, fieldErrors, formData, handleChange, handleSubmit, isLoading } = IS_WHITELABEL_MODE
    ? whitelabel
    : standard;

  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl");
  const showSessionExpired = returnUrl && !error;
  const allowLocal = local || searchParams.get("local") === "1";
  const handoffFailed = searchParams.get("error") === "handoff";
  const ssoEnabled = isRootSSOEnabled();

  useEffect(() => {
    if (allowLocal) {
      enableLocalAuthMode();
      return;
    }

    if (ssoEnabled && !allowLocal) {
      sendToRootLogin();
    }
  }, [allowLocal, ssoEnabled]);

  if (ssoEnabled && !allowLocal) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <Spinner className="size-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Continuing to Truest…</p>
      </div>
    );
  }

  return (
    <form
      className={cn("flex flex-col gap-5", className)}
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(e);
      }}
      {...props}
    >
      {/* Header */}
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Login to your account</h1>
        <p className="text-sm text-muted-foreground">Enter your credentials to access your dashboard.</p>
      </div>

      {/* Social sign-in, self-service sign-up and password reset are not wired
          up in a whitelabel build: the partner owns its own user directory.
          These branches are not rendered rather than hidden with CSS, so they
          are not reachable in the DOM. The flag is a cross-module constant, so
          the bundler still keeps this JSX in the chunk; delete the blocks
          outright if the strings must not ship at all. */}
      {IS_WHITELABEL_MODE ? null : (
        <div className="flex flex-col gap-2.5 pt-1">
          <Button className="w-full gap-2.5" type="button" variant="outline">
            <svg className="size-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Login with Google
          </Button>

          <Button className="w-full gap-2.5" type="button" variant="outline">
            <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
            Login with GitHub
          </Button>
        </div>
      )}

      {/* OR Divider */}
      {IS_WHITELABEL_MODE ? null : (
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium text-muted-foreground">OR</span>
          <div className="h-px flex-1 bg-border" />
        </div>
      )}

      {/* Error Messages */}
      {handoffFailed ? (
        <AlertMessage
          message="Sign-in from Truest failed. Ask an organization admin to give you a seat, then try again."
          variant="error"
        />
      ) : null}

      {error ? <AlertMessage message={error} variant="error" /> : null}

      {showSessionExpired ? (
        <AlertMessage message="Your session has expired. Please log in again." variant="warning" />
      ) : null}

      {/* Email Field */}
      <div className="space-y-1.5">
        <Label className={cn(fieldErrors.email && "text-destructive")} htmlFor="email">
          Email address
        </Label>
        <Input
          autoComplete="email"
          className={cn(fieldErrors.email && "border-destructive focus-visible:ring-destructive/20")}
          disabled={isLoading}
          id="email"
          onChange={handleChange}
          required
          type="email"
          value={formData.email}
        />
        {fieldErrors.email ? <p className="text-xs text-destructive">{fieldErrors.email}</p> : null}
      </div>

      {/* Password Field */}
      <div className="space-y-1.5">
        <Label className={cn(fieldErrors.password && "text-destructive")} htmlFor="password">
          Password
        </Label>
        <Input
          autoComplete="current-password"
          className={cn(fieldErrors.password && "border-destructive focus-visible:ring-destructive/20")}
          disabled={isLoading}
          id="password"
          onChange={handleChange}
          required
          type="password"
          value={formData.password}
        />
        {fieldErrors.password ? <p className="text-xs text-destructive">{fieldErrors.password}</p> : null}
      </div>

      {/* Remember Me + Forgot Password */}
      {IS_WHITELABEL_MODE ? null : (
        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 select-none">
            <input className="size-3.5 rounded-sm border border-border accent-primary" type="checkbox" />
            <span className="text-sm text-muted-foreground">Remember me</span>
          </label>
          <Link className="text-sm font-medium text-primary underline-offset-4 hover:underline" href="/forgot-password">
            Forgot password?
          </Link>
        </div>
      )}

      {/* Submit Button */}
      <Button
        className="w-full bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
        disabled={isLoading}
        type="submit"
      >
        {isLoading ? (
          <>
            <Spinner className="mr-2 size-4" />
            Checking...
          </>
        ) : (
          "Login now"
        )}
      </Button>

      {/* Register Link */}
      {IS_WHITELABEL_MODE ? null : (
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link className="font-medium text-foreground underline-offset-4 hover:underline" href="/register">
            Create one now.
          </Link>
        </p>
      )}
    </form>
  );
}
