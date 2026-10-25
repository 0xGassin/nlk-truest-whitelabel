"use client";

import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface ContainerPackageVersionUpgradeProps {
  className?: string;
  fixedVersion?: string;
  installedVersion?: string;
}

export function ContainerPackageVersionUpgrade({
  className,
  fixedVersion,
  installedVersion,
}: ContainerPackageVersionUpgradeProps) {
  const hasFix = !!fixedVersion && fixedVersion !== installedVersion;

  if (!hasFix) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="relative inline-flex overflow-hidden rounded-md bg-muted px-2.5 py-1 font-mono text-xs text-muted-foreground/80 tabular-nums">
        {installedVersion ?? "unknown"}
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 size-full"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <line
            className="text-muted-foreground/40"
            stroke="currentColor"
            strokeWidth="0.75"
            vectorEffect="non-scaling-stroke"
            x1="0"
            x2="100"
            y1="0"
            y2="100"
          />
        </svg>
      </span>
      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground/60" />
      <span className="rounded-md border border-green-500/25 bg-green-500/10 px-2.5 py-1 font-mono text-xs font-medium text-green-700 tabular-nums dark:text-green-400">
        {fixedVersion}
      </span>
    </div>
  );
}
