"use client";

import { AlertCircle } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

type AlertVariant = "error" | "info" | "success" | "warning";

interface AlertMessageProps {
  className?: string;
  icon?: React.ReactNode;
  message: string;
  variant?: AlertVariant;
}

const variantStyles: Record<AlertVariant, string> = {
  error: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  success: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20",
};

/**
 * A reusable alert message component for displaying errors, warnings, and success messages.
 *
 * @example
 * ```tsx
 * <AlertMessage variant="error" message="Something went wrong" />
 * <AlertMessage variant="success" message="Profile updated successfully" />
 * <AlertMessage variant="warning" message="Your session will expire soon" />
 * ```
 */
export function AlertMessage({ className, icon, message, variant = "error" }: AlertMessageProps) {
  const IconComponent = icon ?? <AlertCircle className="mt-0.5 size-4 shrink-0" />;

  return (
    <div
      aria-live="polite"
      className={cn(
        "animate-in fade-in slide-in-from-top-1 flex items-start gap-2 rounded-md border p-3 text-sm",
        variantStyles[variant],
        className,
      )}
      role={variant === "error" ? "alert" : "status"}
    >
      {IconComponent}
      <span>{message}</span>
    </div>
  );
}

/**
 * Inline error display for compact spaces
 */
export function InlineError({ className, message }: { className?: string; message: string }) {
  return (
    <div
      className={cn("flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive", className)}
      role="alert"
    >
      <AlertCircle className="size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
