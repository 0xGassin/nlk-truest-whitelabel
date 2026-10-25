"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  className?: string;
  label?: string;
  status: string;
}

export function StatusBadge({ className, label, status }: StatusBadgeProps) {
  const s = status.toLowerCase();

  // Design from the Feed's premium table
  if (s === "dismissed" || s === "auto_ignored" || s === "ignored") {
    return (
      <Badge
        className={cn("border-transparent bg-muted/50 text-xs font-normal text-muted-foreground/70", className)}
        variant="secondary"
      >
        {label ?? (s === "ignored" ? "Ignored" : "Auto ignored")}
      </Badge>
    );
  }

  if (s === "fixed" || s === "solved") {
    return (
      <Badge
        className={cn(
          "border-transparent bg-green-500/15 text-xs font-normal text-green-700 dark:text-green-400",
          className,
        )}
        variant="secondary"
      >
        {label ?? (s === "solved" ? "Solved" : "Fixed")}
      </Badge>
    );
  }

  // Fallback for active/new issues
  return (
    <Badge className={cn("text-xs font-normal text-muted-foreground", className)} variant="outline">
      {label ?? "Active"}
    </Badge>
  );
}
