"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type SeverityLevel = string;

interface SeverityBadgeProps {
  className?: string;
  severity: SeverityLevel;
}

const severityLabels: Record<string, string> = {
  critical: "Critical",
  high: "High",
  info: "Info",
  low: "Low",
  medium: "Medium",
};

/** Chart segment colors aligned with SeverityBadge fill colors */
export const severityChartColors = {
  critical: "#8A3238",
  high: "#EA4444",
  low: "#0ea5e9",
  medium: "#facc15",
} as const;

/** Pill styles for severity count badges (repos, containers, connectors, etc.) */
export const severityCountPillClassNames: Record<"critical" | "high" | "low" | "medium", string> = {
  critical:
    "border-[#9B2C42]/25 bg-[#9B2C42]/[0.08] text-[#9B2C42] dark:border-[#B84050]/30 dark:bg-[#B84050]/[0.12] dark:text-[#F0A8B0]",
  high: "border-[#DC2626]/25 bg-[#DC2626]/[0.08] text-[#B91C1C] dark:border-[#EF4444]/30 dark:bg-[#EF4444]/[0.12] dark:text-[#F87171]",
  low: "border-sky-500/18 bg-sky-500/[0.07] text-sky-700/85 dark:border-sky-400/22 dark:bg-sky-400/[0.12] dark:text-sky-200/90",
  medium:
    "border-yellow-400/20 bg-yellow-400/[0.10] text-yellow-700/90 dark:border-yellow-300/25 dark:bg-yellow-300/[0.14] dark:text-yellow-200/90",
};

export function getSeverityPillClassName(severity?: string): string {
  const normalized = severity?.toLowerCase() || "info";
  return normalized in severityCountPillClassNames
    ? severityCountPillClassNames[normalized as keyof typeof severityCountPillClassNames]
    : "border-muted-foreground/25 bg-muted-foreground/10 text-muted-foreground";
}

export function getSeverityPillLabel(severity?: string): string {
  const normalized = severity?.toLowerCase() || "info";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

/** Emphasized pill styles when a matching pie segment is hovered */
export const severityCountPillHoverClassNames: Record<"critical" | "high" | "low" | "medium", string> = {
  critical:
    "border-[#8A3238]/50 bg-[#8A3238]/20 text-[#8A3238] shadow-sm dark:border-[#96353C]/55 dark:bg-[#96353C]/25 dark:text-[#F0A8B0]",
  high: "border-[#DC2626]/55 bg-[#DC2626]/20 text-[#B91C1C] shadow-sm dark:border-[#EF4444]/55 dark:bg-[#EF4444]/25 dark:text-[#F87171]",
  low: "border-sky-500/45 bg-sky-500/18 text-sky-800 shadow-sm dark:border-sky-400/50 dark:bg-sky-400/25 dark:text-sky-100",
  medium:
    "border-yellow-400/45 bg-yellow-400/20 text-yellow-800 shadow-sm dark:border-yellow-300/50 dark:bg-yellow-300/25 dark:text-yellow-100",
};

export function getSeverityWeight(severity: string): number {
  const weights: Record<string, number> = {
    critical: 4,
    high: 3,
    info: 0,
    low: 1,
    medium: 2,
  };
  return weights[severity.toLowerCase()] ?? 0;
}

function getSeverityLabel(severity: string): string {
  const normalized = severity.toLowerCase();
  return severityLabels[normalized] ?? severity;
}

/** Shared vulnerability severity pill used across tables, cards, and drawers. */
export function SeverityBadge({ className, severity }: SeverityBadgeProps) {
  if (!severity) return null;

  const label = getSeverityLabel(severity);

  return (
    <Badge
      aria-label={`${label} severity`}
      className={cn("px-1.5 text-[14px] font-normal", getSeverityPillClassName(severity), className)}
      role="img"
      title={label}
      variant="outline"
    >
      {label}
    </Badge>
  );
}
