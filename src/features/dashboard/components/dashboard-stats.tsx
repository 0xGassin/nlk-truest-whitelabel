"use client";

import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { DailyValue } from "@/components/dashboardblocks/kpi/area-chart-kpi-02";
import type { KPIChangeInput, KPIFormat } from "@/components/dashboardblocks/kpi";
import type { ChartConfig } from "@/components/evilcharts/charts/echarts-radar-chart";

import { AreaChartKPI2 } from "@/components/dashboardblocks/kpi/area-chart-kpi-02";
import { KPI1 } from "@/components/dashboardblocks/kpi/kpi-01";
import { EChartsLineChart } from "@/components/evilcharts/charts/echarts-line-chart";
import { EChartsRadarChart } from "@/components/evilcharts/charts/echarts-radar-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SeverityDatum = {
  [key: string]: unknown;
  count: number;
  severity: string;
};

const severityChartConfig = {
  count: {
    label: "Findings",
    colors: {
      dark: ["#60a5fa"],
      light: ["#2563eb"],
    },
  },
} satisfies ChartConfig;

const ctLogChartConfig = {
  value: {
    label: "Incoming CT logs",
    colors: {
      dark: ["#60a5fa"],
      light: ["#2563eb"],
    },
  },
} satisfies ChartConfig;

export interface DashboardStatsData {
  assets: number;
  assetTrend: DailyValue[];
  previousAssetTrend: number;
  previousDayAssets: number;
  previousDayFindings: number;
  findings: number;
  hosts: number;
  lookalikes: number;
  services: number;
  ctLogTrend: Array<{ label: string; value: number }>;
  severity: Record<"critical" | "high" | "info" | "low" | "medium", number>;
}

function LookalikeMapPreview({ children, map }: { children: ReactNode; map: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ left: 0, top: 0 });
  const closeTimer = useRef<number | null>(null);
  const triggerReference = useRef<HTMLDivElement>(null);

  const cancelClose = () => {
    if (closeTimer.current === null) return;
    window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };

  const showPreview = () => {
    cancelClose();
    setOpen(true);
  };

  const hidePreview = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      setOpen(false);
    }, 700);
  };

  useEffect(
    () => () => {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    },
    [],
  );

  useLayoutEffect(() => {
    if (!open || !triggerReference.current) return;
    const trigger = triggerReference.current.getBoundingClientRect();
    setPanelPosition({ left: trigger.left + trigger.width / 2, top: trigger.bottom + 12 });
  }, [open]);

  return (
    <>
      <div
        className="h-full min-w-0 cursor-pointer"
        onPointerEnter={showPreview}
        onPointerLeave={hidePreview}
        ref={triggerReference}
      >
        {children}
      </div>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div className="pointer-events-none fixed inset-0 z-50 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200">
              <div
                aria-label="Lookalike host map"
                className="pointer-events-auto isolate absolute flex aspect-[2/1] min-h-0 min-w-0 w-[min(88vw,1080px)] -translate-x-1/2 flex-col overflow-hidden rounded-xl border-0 bg-black p-2 shadow-2xl shadow-black/50 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-200"
                onPointerEnter={cancelClose}
                onPointerLeave={hidePreview}
                role="tooltip"
                style={{ left: panelPosition.left, top: panelPosition.top }}
              >
                <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg bg-black">
                  {map}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export function DashboardStats({
  data,
  domainName,
  lookalikeMap,
}: {
  data: DashboardStatsData;
  domainName?: string;
  lookalikeMap?: ReactNode;
}) {
  const comparison = "vs prior 7 days";
  const metrics: Array<{
    changeType?: KPIChangeInput["changeType"];
    comparison?: string;
    format?: KPIFormat;
    key: string;
    previous?: number;
    title: string;
    value: number;
  }> = [
    {
      changeType: "absolute",
      comparison: "vs prior day",
      key: "assets",
      previous: data.previousDayAssets,
      title: "Total assets",
      value: data.assets,
    },
    { key: "hosts", title: "Hosts", value: data.hosts },
    { key: "services", title: "Services", value: data.services },
    {
      changeType: "absolute",
      key: "findings",
      comparison: "vs prior day",
      previous: data.previousDayFindings,
      title: "Total findings",
      value: data.findings,
    },
    { key: "lookalikes", title: "Lookalikes", value: data.lookalikes },
  ];
  const severityData: SeverityDatum[] = [
    { count: data.severity.critical, severity: "Critical" },
    { count: data.severity.high, severity: "High" },
    { count: data.severity.medium, severity: "Medium" },
    { count: data.severity.low, severity: "Low" },
    { count: data.severity.info, severity: "Info" },
  ];
  return (
    <section aria-label="Domain statistics" className="grid min-w-0 shrink-0 gap-3 font-sans text-[14px]">
      <div className="grid min-w-0 auto-rows-fr grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {metrics.map((metric) => {
          const card = (
            <KPI1
              comparison={metric.comparison}
              changeType={metric.changeType}
              format={metric.format ?? "number"}
              previous={metric.previous}
              title={metric.title}
              value={metric.value}
            />
          );

          if (metric.key !== "lookalikes" || !lookalikeMap) {
            return (
              <div className="min-w-0" key={metric.key}>
                {card}
              </div>
            );
          }

          return (
            <LookalikeMapPreview key={metric.key} map={lookalikeMap}>
              {card}
            </LookalikeMapPreview>
          );
        })}
      </div>
      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,2.15fr)_minmax(280px,0.85fr)]">
        <div className="min-w-0">
          <AreaChartKPI2
            comparison={comparison}
            data={data.assetTrend}
            format="number"
            previous={data.previousAssetTrend}
            title={domainName ? `${domainName} asset discoveries` : "Asset discoveries"}
          />
        </div>
        <Card className="h-full min-h-[300px] min-w-0 border border-border/70 bg-transparent py-4 shadow-none ring-0">
          <CardHeader className="flex min-w-0 items-center justify-between gap-4 px-4 pb-0 pt-0">
            <CardTitle className="text-label-14">Finding severity</CardTitle>
            <div aria-label="Chart legend" className="flex items-center gap-1.5 text-[14px] text-muted-foreground">
              <span aria-hidden className="size-2 rounded-full bg-[#2563eb] dark:bg-[#60a5fa]" />
              Findings
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 min-w-0 flex-1 px-3 pb-3 pt-1">
            <EChartsRadarChart className="h-full min-h-[300px] w-full" config={severityChartConfig} data={severityData}>
              <EChartsRadarChart.PolarGrid />
              <EChartsRadarChart.PolarAngleAxis dataKey="severity" />
              <EChartsRadarChart.Tooltip />
              <EChartsRadarChart.Radar dataKey="count" isClickable variant="filled">
                <EChartsRadarChart.Dot variant="colored-border" />
                <EChartsRadarChart.ActiveDot variant="default" />
              </EChartsRadarChart.Radar>
            </EChartsRadarChart>
          </CardContent>
        </Card>
      </div>
      <Card className="min-w-0 border border-border/70 bg-transparent py-4 shadow-none ring-0">
        <CardHeader className="flex min-w-0 items-center justify-between gap-4 px-4 pb-0 pt-0">
          <CardTitle className="text-label-14">Incoming CT logs</CardTitle>
          <div className="flex items-center gap-4 text-copy-14 text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="size-2 rounded-full bg-[#2563eb] dark:bg-[#60a5fa]" />
              Incoming CT logs
            </span>
            <span>Last 7 days</span>
          </div>
        </CardHeader>
        <CardContent className="flex min-h-[220px] min-w-0 px-3 pb-2 pt-2">
          <EChartsLineChart
            className="h-full min-h-[210px] w-full"
            config={ctLogChartConfig}
            data={data.ctLogTrend}
            enableHoverHighlight
            xDataKey="label"
          >
            <EChartsLineChart.XAxis dataKey="label" tickFormatter={(value) => value.slice(0, 3)} />
            <EChartsLineChart.Brush formatLabel={(value) => String(value).slice(0, 3)} />
            <EChartsLineChart.Tooltip />
            <EChartsLineChart.Line area areaOpacity={0.16} dataKey="value" isClickable strokeVariant="solid">
              <EChartsLineChart.Dot variant="border" />
              <EChartsLineChart.ActiveDot variant="colored-border" />
            </EChartsLineChart.Line>
          </EChartsLineChart>
        </CardContent>
      </Card>
    </section>
  );
}
