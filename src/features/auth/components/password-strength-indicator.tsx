"use client";

import { Check, X } from "lucide-react";
import * as React from "react";

import { validatePassword } from "@/lib/auth/utils";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  className?: string;
  password: string;
  showRequirements?: boolean;
}

const strengthColors = {
  fair: "bg-orange-500",
  good: "bg-yellow-500",
  strong: "bg-green-500",
  weak: "bg-destructive",
} as const;

const strengthLabels = {
  fair: "Fair",
  good: "Good",
  strong: "Strong",
  weak: "Weak",
} as const;

/**
 * Visual password strength indicator with optional requirement checklist.
 * Shows a progress bar indicating strength and lists unfulfilled requirements.
 */
export function PasswordStrengthIndicator({
  className,
  password,
  showRequirements = true,
}: PasswordStrengthIndicatorProps) {
  const validation = React.useMemo(() => validatePassword(password), [password]);

  if (!password) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Password strength</span>
          <span
            className={cn(
              "font-medium",
              validation.strength === "weak" && "text-destructive",
              validation.strength === "fair" && "text-orange-500",
              validation.strength === "good" && "text-yellow-600 dark:text-yellow-500",
              validation.strength === "strong" && "text-green-600 dark:text-green-500",
            )}
          >
            {strengthLabels[validation.strength]}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all duration-300", strengthColors[validation.strength])}
            style={{ width: `${String(validation.score)}%` }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      {showRequirements ? (
        <ul className="space-y-1 text-xs">
          <RequirementItem met={password.length >= 8} text="At least 8 characters" />
          <RequirementItem met={/[A-Z]/.test(password)} text="One uppercase letter" />
          <RequirementItem met={/[a-z]/.test(password)} text="One lowercase letter" />
          <RequirementItem met={/[0-9]/.test(password)} text="One number" />
          <RequirementItem
            met={/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)}
            optional
            text="One special character (optional)"
          />
        </ul>
      ) : null}
    </div>
  );
}

interface RequirementItemProps {
  met: boolean;
  optional?: boolean;
  text: string;
}

function RequirementItem({ met, optional, text }: RequirementItemProps) {
  return (
    <li
      className={cn(
        "flex items-center gap-1.5 transition-colors",
        met ? "text-green-600 dark:text-green-500" : optional ? "text-muted-foreground" : "text-muted-foreground",
      )}
    >
      {met ? <Check className="size-3 shrink-0" /> : <X className="size-3 shrink-0 opacity-50" />}
      <span className={cn(optional && !met && "opacity-70")}>{text}</span>
    </li>
  );
}

export { type PasswordValidationResult } from "@/lib/auth/utils";
