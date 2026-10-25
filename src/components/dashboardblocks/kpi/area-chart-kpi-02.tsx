"use client";

import { useState } from "react";

import { EChartsLineChart } from "@/components/evilcharts/charts/echarts-line-chart";
import type { ChartConfig } from "@/components/evilcharts/charts/echarts-line-chart";
import { KPI, KPIChange, KPIContent, type KPIFormat, KPIValue } from "@/components/dashboardblocks/kpi";

import { CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DailyValue {
  findings: number;
  label: string;
  value: number;
}

type AssetDiscoveryPoint = {
  [key: string]: unknown;
  discoveries: number;
  findings: number;
  label: string;
};

type VisibleSeries = "all" | "discoveries" | "findings";

interface AreaChartKPI2Props {
  /** What the change is measured against, e.g. "vs last week". */
  comparison: string;
  /** One point per period, drawn behind the value. The headline is their total. */
  data: DailyValue[];
  format?: KPIFormat;
  /** @default 220 */
  height?: number;
  /** The total for the previous period. */
  previous: number;
  title: string;
}

const exampleProps: AreaChartKPI2Props = {
  comparison: "vs last week",
  data: [
    { findings: 3_100, label: "Mon", value: 14_200 },
    { findings: 3_240, label: "Tue", value: 17_100 },
    { findings: 3_355, label: "Wed", value: 12_800 },
    { findings: 3_470, label: "Thu", value: 19_600 },
    { findings: 3_610, label: "Fri", value: 22_300 },
    { findings: 3_690, label: "Sat", value: 18_400 },
    { findings: 3_810, label: "Sun", value: 24_000 },
  ],
  format: "currency",
  previous: 108_450,
  title: "Transaction volume",
};

const assetDiscoveryChartConfig = {
  discoveries: {
    label: "New Assets",
    colors: {
      dark: ["#60a5fa"],
      light: ["#2563eb"],
    },
  },
  findings: {
    label: "Total Findings",
    colors: {
      dark: ["#93c5fd"],
      light: ["#60a5fa"],
    },
  },
} satisfies ChartConfig;

const AreaChartKPI2 = (props: AreaChartKPI2Props) => {
  const { comparison, data, format, height = 220, previous, title } = props;
  const [visibleSeries, setVisibleSeries] = useState<VisibleSeries>("all");
  const total = data.reduce((sum, point) => sum + point.value, 0);
  const chartData: AssetDiscoveryPoint[] = data.map((point) => ({
    discoveries: point.value,
    findings: point.findings,
    label: point.label,
  }));

  return (
    <KPI className="min-w-0 border-border/70 bg-transparent py-4 shadow-none ring-0">
      <KPIContent className="min-w-0 gap-4 px-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CardTitle className="text-label-14">{title}</CardTitle>
          <div className="flex flex-wrap items-center justify-end gap-4">
            <div aria-label="Chart legend" className="flex items-center gap-3 text-[14px] text-muted-foreground">
              <span className={cn("flex items-center gap-1.5", visibleSeries === "findings" && "opacity-35")}>
                <span aria-hidden className="size-2 rounded-full bg-[#2563eb]" />
                New Assets
              </span>
              <span className={cn("flex items-center gap-1.5", visibleSeries === "discoveries" && "opacity-35")}>
                <span aria-hidden className="size-2 rounded-full bg-[#60a5fa]" />
                Total Findings
              </span>
            </div>
            <div aria-label="Visible chart series" className="flex" role="group">
              {(
                [
                  ["all", "Both"],
                  ["discoveries", "New Assets"],
                  ["findings", "Total Findings"],
                ] as const
              ).map(([series, label]) => (
                <button
                  aria-pressed={visibleSeries === series}
                  className={cn(
                    "border-y border-r border-border/70 bg-transparent px-2 py-1 text-[14px] first:rounded-l-md first:border-l last:rounded-r-md",
                    visibleSeries === series
                      ? "border-border/70 bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                  key={series}
                  onClick={() => setVisibleSeries(series)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
            <KPIChange
              changeType="absolute"
              className="text-[14px]"
              comparison={comparison}
              previous={previous}
              value={total}
            />
          </div>
        </div>
        <KPIValue className="text-[32px] leading-9" value={total} format={format} animated />
        <span aria-hidden className="h-5" />
        <div style={{ height }}>
          <EChartsLineChart
            className="h-full w-full"
            config={assetDiscoveryChartConfig}
            data={chartData}
            enableHoverHighlight
            xDataKey="label"
          >
            <EChartsLineChart.XAxis dataKey="label" tickFormatter={(value) => value.slice(0, 3)} />
            <EChartsLineChart.Brush formatLabel={(value) => String(value).slice(0, 3)} />
            <EChartsLineChart.Tooltip />
            {visibleSeries !== "findings" ? (
              <EChartsLineChart.Line area areaOpacity={0.16} dataKey="discoveries" isClickable strokeVariant="solid">
                <EChartsLineChart.Dot variant="border" />
                <EChartsLineChart.ActiveDot variant="colored-border" />
              </EChartsLineChart.Line>
            ) : null}
            {visibleSeries !== "discoveries" ? (
              <EChartsLineChart.Line area areaOpacity={0.1} dataKey="findings" isClickable strokeVariant="solid">
                <EChartsLineChart.Dot variant="border" />
                <EChartsLineChart.ActiveDot variant="colored-border" />
              </EChartsLineChart.Line>
            ) : null}
          </EChartsLineChart>
        </div>
      </KPIContent>
    </KPI>
  );
};

export { AreaChartKPI2, exampleProps as areaChartKpi2ExampleProps, type AreaChartKPI2Props, type DailyValue };
