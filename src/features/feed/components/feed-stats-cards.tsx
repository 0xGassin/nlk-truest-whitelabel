"use client";

import type { HasCreatedAt } from "../lib/build-issues-trend";
import type { ChartConfig } from "@/components/ui/chart";
import type { FeedStats, GroupedStats } from "@/services/api/feed";

import { useMemo, useState } from "react";
import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  severityChartColors,
  severityCountPillClassNames,
  severityCountPillHoverClassNames,
} from "@/components/ui/severity-badge";
import { cn } from "@/lib/utils";

import { buildIssuesOverTimeTrend } from "../lib/build-issues-trend";

const severityChartConfig = {
  critical: { color: severityChartColors.critical, label: "Critical" },
  high: { color: severityChartColors.high, label: "High" },
  low: { color: severityChartColors.low, label: "Low" },
  medium: { color: severityChartColors.medium, label: "Medium" },
} satisfies ChartConfig;

const issuesTrendChartConfig = {
  issues: {
    color: "#3b82f6",
    label: "Open issues",
  },
} satisfies ChartConfig;

const SEVERITY_KEYS = ["critical", "high", "medium", "low"] as const;

const SEVERITY_LABELS: Record<(typeof SEVERITY_KEYS)[number], string> = {
  critical: "CRITICAL",
  high: "HIGH",
  low: "LOW",
  medium: "MEDIUM",
};

type SeverityBreakdown = GroupedStats["severity"];
type SeverityKey = (typeof SEVERITY_KEYS)[number];

const FEED_STAT_CARD_CLASS = "flex h-full min-h-[288px] flex-col rounded-lg border border-border px-4 pb-4 pt-5";

function SeverityCountBadges({
  counts,
  hoveredSeverity,
}: {
  counts: SeverityBreakdown;
  hoveredSeverity: null | SeverityKey;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {SEVERITY_KEYS.map((key) => (
        <Badge
          className={cn(
            "gap-1.5 font-normal transition-all duration-200",
            hoveredSeverity === key
              ? severityCountPillHoverClassNames[key]
              : hoveredSeverity === null
                ? severityCountPillClassNames[key]
                : cn(severityCountPillClassNames[key], "opacity-40"),
          )}
          key={key}
          variant="outline"
        >
          <span className="font-bold">{counts[key]}</span> {key}
        </Badge>
      ))}
    </div>
  );
}

export function FeedStatsCards({
  groupedStats,
  issuesOverTime,
  stats,
}: {
  groupedStats?: GroupedStats;
  issuesOverTime?: HasCreatedAt[];
  stats: FeedStats;
}) {
  const { open_issues, severity_breakdown: sev } = stats;
  const displaySev = groupedStats?.severity ?? { critical: 0, high: 0, low: 0, medium: 0 };
  const [hoveredSeverity, setHoveredSeverity] = useState<null | SeverityKey>(null);

  return (
    <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-3">
      <HoverCard closeDelay={0} openDelay={0}>
        <HoverCardTrigger asChild>
          <div className="h-full">
            <SeverityDonutCard
              onSeverityHover={setHoveredSeverity}
              severity={displaySev}
              title="Open issues by severity"
            />
          </div>
        </HoverCardTrigger>
        <HoverCardContent align="start" className="w-[400px] p-0">
          <div className="space-y-6 p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">
                  <span className="mr-2 text-lg font-bold">{groupedStats?.total ?? 0}</span>
                  Grouped Issues
                </h4>
              </div>
              <SeverityCountBadges
                counts={groupedStats?.severity ?? { critical: 0, high: 0, low: 0, medium: 0 }}
                hoveredSeverity={hoveredSeverity}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">
                  <span className="mr-2 text-lg font-bold">{open_issues}</span>
                  Individual Issues
                </h4>
              </div>
              <SeverityCountBadges counts={sev} hoveredSeverity={hoveredSeverity} />
            </div>
          </div>

          <div className="border-t bg-muted/50 p-4 text-xs leading-relaxed text-muted-foreground">
            Truest groups issues developers usually fix together. For example, CVEs in the same package count as one
            group.
          </div>
        </HoverCardContent>
      </HoverCard>

      <IssuesOverTimeLineChart className="md:col-span-2" issues={issuesOverTime ?? []} />
    </div>
  );
}

function SeverityDonutCard({
  onSeverityHover,
  severity,
  title,
}: {
  onSeverityHover: (severity: null | SeverityKey) => void;
  severity: SeverityBreakdown;
  title: string;
}) {
  const chartData = SEVERITY_KEYS.map((key) => ({
    fill: `var(--color-${key})`,
    key,
    value: severity[key],
  })).filter((item) => item.value > 0);

  const hasData = chartData.length > 0;
  const pieData = hasData ? chartData : [{ fill: "hsl(var(--muted))", key: "empty", value: 1 }];

  const handleSegmentHover = (key: string) => {
    if (SEVERITY_KEYS.includes(key as SeverityKey)) {
      onSeverityHover(key as SeverityKey);
    }
  };

  return (
    <div className={cn(FEED_STAT_CARD_CLASS, "bg-white dark:bg-card")}>
      <h3 className="shrink-0 text-center text-sm font-semibold text-foreground">{title}</h3>

      <ChartContainer
        className="mx-auto mt-2 aspect-auto min-h-0 w-full flex-1 [&_.recharts-pie-label-text]:fill-foreground [&_.recharts-responsive-container]:!size-full"
        config={severityChartConfig}
      >
        <PieChart
          onMouseLeave={() => {
            onSeverityHover(null);
          }}
        >
          <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="key" />} cursor={false} />
          <Pie
            data={pieData}
            dataKey="value"
            innerRadius={52}
            nameKey="key"
            outerRadius={78}
            paddingAngle={hasData ? 3 : 0}
            stroke="#ffffff"
            strokeWidth={hasData ? 4 : 0}
          >
            {pieData.map((entry) => (
              <Cell
                fill={entry.fill}
                key={entry.key}
                onMouseEnter={() => {
                  handleSegmentHover(entry.key);
                }}
              />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>

      <div className="mt-1 flex shrink-0 flex-wrap items-center justify-center gap-2">
        {SEVERITY_KEYS.map((key) => (
          <span
            className={cn(
              "rounded-md px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase",
              severityCountPillClassNames[key],
            )}
            key={key}
          >
            {SEVERITY_LABELS[key]}
          </span>
        ))}
      </div>
    </div>
  );
}

function IssuesOverTimeLineChart({ className, issues }: { className?: string; issues: HasCreatedAt[] }) {
  const chartData = useMemo(() => buildIssuesOverTimeTrend(issues), [issues]);

  return (
    <div className={cn(FEED_STAT_CARD_CLASS, "bg-card", className)}>
      <h3 className="shrink-0 text-center text-sm font-semibold text-foreground">Issues over time</h3>

      <ChartContainer
        className="mt-3 aspect-auto min-h-0 w-full flex-1 [&_.recharts-responsive-container]:!size-full"
        config={issuesTrendChartConfig}
      >
        <LineChart data={chartData} margin={{ bottom: 0, left: 4, right: 12, top: 8 }}>
          <CartesianGrid className="stroke-border/50" strokeDasharray="3 3" vertical={false} />
          <XAxis axisLine={false} dataKey="label" minTickGap={24} tickLine={false} tickMargin={8} />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            domain={[0, (max: number) => Math.max(max, 1)]}
            tickLine={false}
            tickMargin={8}
            width={32}
          />
          <ChartTooltip
            content={<ChartTooltipContent indicator="line" labelKey="label" nameKey="issues" />}
            cursor={false}
          />
          <Line
            activeDot={{ r: 5 }}
            connectNulls
            dataKey="issues"
            dot={{
              fill: "var(--color-issues)",
              r: 3,
              stroke: "var(--color-issues)",
            }}
            stroke="var(--color-issues)"
            strokeWidth={2}
            type="monotone"
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
