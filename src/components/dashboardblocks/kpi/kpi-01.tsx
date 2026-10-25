"use client";

import type { ReactNode } from "react";

import {
  KPI,
  KPIChange,
  KPIContent,
  type KPIChangeInput,
  type KPIFormat,
  KPIValue,
} from "@/components/dashboardblocks/kpi";

import { CardDescription } from "@/components/ui/card";

interface KPI1Props {
  changeType?: KPIChangeInput["changeType"];
  /** What the change is measured against, e.g. "vs last month". */
  comparison?: string;
  format?: KPIFormat;
  headerAction?: ReactNode;
  previous?: number;
  title: string;
  value: number;
}

const exampleProps: KPI1Props = {
  comparison: "vs last month",
  format: "currency",
  previous: 37_660,
  title: "Total revenue",
  value: 45_231,
};

const KPI1 = (props: KPI1Props) => {
  const { changeType, comparison, format, headerAction, previous, title, value } = props;

  return (
    <KPI className="relative h-full min-w-0 border-border/70 bg-transparent py-4 shadow-none ring-0">
      {headerAction ? <div className="pointer-events-none absolute top-2.5 right-3">{headerAction}</div> : null}
      <KPIContent className="gap-1 px-4">
        <CardDescription className="min-w-0 text-label-14">{title}</CardDescription>
        <KPIValue className="text-[32px] leading-9" value={value} format={format} animated />
        {comparison && previous !== undefined ? (
          <KPIChange
            className="text-[14px]"
            changeType={changeType}
            comparison={comparison}
            previous={previous}
            value={value}
            variant="default"
            showComparison
          />
        ) : (
          <span aria-hidden className="h-5" />
        )}
      </KPIContent>
    </KPI>
  );
};

export { KPI1, exampleProps as kpi1ExampleProps, type KPI1Props };
