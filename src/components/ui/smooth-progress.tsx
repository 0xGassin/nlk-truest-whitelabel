import React from "react";

import { cn } from "@/lib/utils";

interface SmoothProgressProps {
  className?: string;
  message?: string;
  progress: number;
  width?: string;
}

/**
 * A progress component that displays scan progress accurately based on real events.
 * Dimensioned to match the IssueSeverityBar (default 160px).
 */
export function SmoothProgress({ className, message, progress, width = "160px" }: SmoothProgressProps) {
  // Ensure progress is within 0-100 range
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={cn("flex flex-col gap-1.5", className)} style={{ width }}>
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="max-w-[120px] truncate">{message ?? "Scanning..."}</span>
        <span className="ml-2 text-primary tabular-nums">{Math.round(clampedProgress)}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full border border-border/50 bg-muted/40 shadow-inner">
        <div
          className="relative h-full bg-gradient-to-r from-primary/90 to-primary transition-all duration-500 ease-out"
          style={{ width: `${String(clampedProgress)}%` }}
        >
          {/* Subtle pulse effect to indicate active work */}
          <div className="absolute inset-0 animate-pulse bg-white/20" />

          {/* Tip highlight */}
          <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white/30 to-transparent" />
        </div>
      </div>
    </div>
  );
}
