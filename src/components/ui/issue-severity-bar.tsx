"use client";

import { dataTableSecondaryTextClass } from "@/components/ui/data-table/data-table-styles";
import { severityCountPillClassNames } from "@/components/ui/severity-badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SeverityCounts {
  critical: number;
  high: number;
  low: number;
  medium: number;
}

interface IssueSeverityBarProps extends SeverityCounts {
  /** Whether to show "No issues" badge when total is 0. Defaults to true */
  showNoIssues?: boolean;
  /** Width of the bar, defaults to 160px */
  width?: string;
}

const severityPills = (["critical", "high", "medium", "low"] as const).map((key) => ({
  className: severityCountPillClassNames[key],
  key,
  label: key.charAt(0).toUpperCase() + key.slice(1),
}));

/**
 * A row of colored severity count pills.
 * Used across RepositoriesTable and FeedIssuesTable.
 */
export function IssueSeverityBar({ critical, high, low, medium, showNoIssues = true }: IssueSeverityBarProps) {
  const counts: SeverityCounts = { critical, high, low, medium };
  const total = critical + high + medium + low;

  if (total === 0) {
    if (showNoIssues) {
      return (
        <div className={dataTableSecondaryTextClass}>
          <span>No issues</span>
        </div>
      );
    }
    return <span className={dataTableSecondaryTextClass}>—</span>;
  }

  return (
    <div className="flex items-center gap-1.5">
      {severityPills.map(({ className, key, label }) =>
        counts[key] > 0 ? (
          <TooltipProvider key={key}>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <span
                  className={`inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-medium tabular-nums ${className}`}
                >
                  {counts[key]}
                </span>
              </TooltipTrigger>
              <TooltipContent className="text-xs" side="bottom">
                {counts[key]} {label}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null,
      )}
    </div>
  );
}
