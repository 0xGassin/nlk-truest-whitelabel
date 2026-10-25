"use client";

import { ArrowDown, ChevronsUpDown } from "lucide-react";
import * as React from "react";

import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface DataTableColumnHeaderProps<T> {
  column: ColumnDef<T>;
  headerCellClassName?: string;
  onSort: (key: string) => void;
  showColumnSeparator?: boolean;
  sortConfig: { direction: "asc" | "desc"; key: string } | null;
}

export interface ColumnDef<T> {
  align?: "center" | "left" | "right";
  cell: (item: T) => React.ReactNode;
  cellClassName?: string;
  header: React.ReactNode;
  headerClassName?: string;
  id: string;
  skeletonVariant?: "badge" | "default" | "icon-action" | "mono-chip" | "primary-subtext";
  sortable?: boolean;
  sortValue?: (item: T) => number | string;
  width?: string;
}

export function DataTableColumnHeader<T>({
  column,
  headerCellClassName,
  onSort,
  showColumnSeparator = false,
  sortConfig,
}: DataTableColumnHeaderProps<T>) {
  const isSorted = sortConfig?.key === column.id;
  const align = column.align ?? "left";

  const alignClass = {
    center: "text-center justify-center",
    left: "text-left justify-start",
    right: "text-right justify-end",
  }[align];

  const headerClassName = cn(
    "relative h-10 px-4 text-[13px] font-medium text-muted-foreground",
    column.sortable && "group cursor-pointer transition-colors hover:bg-accent/50",
    alignClass,
    column.width && `w-[${column.width}]`,
    showColumnSeparator && "border-r border-border",
    headerCellClassName,
    column.headerClassName,
  );

  const headerContent = column.sortable ? (
    <div className={cn("flex items-center justify-between gap-2", alignClass)}>
      <div className="flex items-center gap-1">
        <span>{column.header}</span>
        {isSorted ? (
          <ArrowDown className={cn("size-3 text-primary", sortConfig.direction === "asc" && "rotate-180")} />
        ) : null}
      </div>
      <ChevronsUpDown className="size-3.5 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  ) : (
    <div className={cn("flex items-center", alignClass)}>
      <span>{column.header}</span>
    </div>
  );

  return (
    <TableHead
      className={headerClassName}
      onClick={
        column.sortable
          ? () => {
              onSort(column.id);
            }
          : undefined
      }
      style={{
        ...(column.width ? { width: column.width } : {}),
        ...(showColumnSeparator ? { borderRight: "1px solid #d4d4d4" } : {}),
      }}
    >
      {headerContent}
    </TableHead>
  );
}
