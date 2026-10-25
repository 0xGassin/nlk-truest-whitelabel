"use client";

import type { ColumnDef } from "./data-table-column-header";

import * as React from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type TableSkeletonColumn = Pick<ColumnDef<unknown>, "align" | "id" | "skeletonVariant" | "width">;

export const DEFAULT_TABLE_LAYOUT: TableSkeletonColumn[] = [
  { id: "primary", skeletonVariant: "primary-subtext", width: "2fr" },
  { id: "secondary", width: "1fr" },
  { id: "tertiary", width: "1fr" },
  { align: "right", id: "actions", skeletonVariant: "icon-action", width: "80px" },
];

function inferSkeletonVariant<T>(
  column: ColumnDef<T>,
  index: number,
  total: number,
): NonNullable<ColumnDef<T>["skeletonVariant"]> {
  if (column.skeletonVariant) {
    return column.skeletonVariant;
  }

  if (column.align === "right" || (index === total - 1 && total >= 4)) {
    return "icon-action";
  }

  if (index === 0) {
    return "primary-subtext";
  }

  return "default";
}

export function getTableSkeletonGridTemplate<T>(columns: Pick<ColumnDef<T>, "width">[]): string {
  if (columns.length === 0) {
    return "minmax(0, 1fr)";
  }

  return columns
    .map((column) => {
      if (!column.width) {
        return "minmax(0, 1fr)";
      }

      const width = column.width;
      if (width.endsWith("fr")) {
        return `minmax(0, ${width})`;
      }

      if (width.endsWith("px") || width.endsWith("rem")) {
        return width;
      }

      if (width.endsWith("%")) {
        return `minmax(0, ${width})`;
      }

      return "minmax(0, 1fr)";
    })
    .join(" ");
}

function TableSkeletonCell({ variant }: { variant: NonNullable<ColumnDef<unknown>["skeletonVariant"]> }) {
  switch (variant) {
    case "badge":
      return <Skeleton className="h-5 w-20" />;
    case "icon-action":
      return <Skeleton className="size-7" />;
    case "mono-chip":
      return <Skeleton className="h-5 w-16 rounded border border-border/50" />;
    case "primary-subtext":
      return (
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      );
    default:
      return <Skeleton className="h-4 w-2/3" />;
  }
}

interface TableSkeletonBodyProps {
  className?: string;
  columns: TableSkeletonColumn[];
  label?: string;
  rows?: number;
}

export function TableSkeletonBody({ className, columns, label = "Loading", rows = 8 }: TableSkeletonBodyProps) {
  const resolvedColumns = React.useMemo(
    () =>
      columns.map((column, index) => ({
        ...column,
        skeletonVariant: inferSkeletonVariant(column as ColumnDef<unknown>, index, columns.length),
      })),
    [columns],
  );

  const gridTemplateColumns = React.useMemo(() => getTableSkeletonGridTemplate(resolvedColumns), [resolvedColumns]);

  const rowIndexes = React.useMemo(() => Array.from({ length: Math.max(rows, 0) }, (_, index) => index), [rows]);

  return (
    <div className={cn("skeleton-loading flex h-full w-full flex-col rounded-lg border bg-card", className)}>
      <div className="grid h-11 shrink-0 items-center gap-4 border-b bg-sidebar px-4" style={{ gridTemplateColumns }}>
        {resolvedColumns.map((column) => (
          <Skeleton className="h-3 w-20 max-w-full min-w-0 bg-sidebar-accent" key={column.id} />
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        <div aria-hidden={label ? undefined : true} className="divide-y divide-border/50">
          {rowIndexes.map((rowIndex) => (
            <div className="grid h-16 min-w-0 items-center gap-4 px-4" key={rowIndex} style={{ gridTemplateColumns }}>
              {resolvedColumns.map((column) => (
                <div
                  className={cn("min-w-0 overflow-hidden", column.align === "right" && "flex justify-end")}
                  key={column.id}
                >
                  <TableSkeletonCell variant={column.skeletonVariant} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex h-12 shrink-0 items-center justify-between border-t px-4">
        <Skeleton className="h-4 w-36" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
  );
}

interface TableLoadingSkeletonProps {
  className?: string;
  columns: TableSkeletonColumn[];
  label?: string;
  rows?: number;
  showToolbar?: boolean;
}

export function TableLoadingSkeleton({
  className,
  columns,
  label = "Loading",
  rows = 8,
  showToolbar = true,
}: TableLoadingSkeletonProps) {
  return (
    <div
      aria-label={label}
      className={cn("skeleton-loading flex h-full min-h-0 flex-col gap-4 overflow-hidden", className)}
      role="status"
    >
      {showToolbar ? (
        <div className="flex shrink-0 items-center justify-between gap-4">
          <Skeleton className="h-9 w-full max-w-sm" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="size-9" />
          </div>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col items-start overflow-hidden">
        <TableSkeletonBody className="h-max max-h-full" columns={columns} label={label} rows={rows} />
      </div>
    </div>
  );
}

export function columnsToSkeletonLayout<T>(columns: ColumnDef<T>[]): TableSkeletonColumn[] {
  return columns.map((column) => ({
    align: column.align,
    id: column.id,
    skeletonVariant: column.skeletonVariant,
    width: column.width,
  }));
}
