"use client";

import { Search } from "lucide-react";
import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DataTableToolbarProps {
  // Actions
  actions?: React.ReactNode;
  extraToolbarContent?: React.ReactNode;
  // Custom content
  leadingToolbarContent?: React.ReactNode;

  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;

  // Search
  searchValue: string;

  // Toolbar button styling
  toolbarButtonClassName?: string;

  // Toolbar search styling
  toolbarInputClassName?: string;
}

export function DataTableToolbar({
  actions,
  extraToolbarContent,
  leadingToolbarContent,
  onSearchChange,
  searchPlaceholder = "Search...",
  searchValue,
  toolbarButtonClassName,
  toolbarInputClassName,
}: DataTableToolbarProps) {
  const hasActions = actions !== undefined && actions !== null;

  return (
    <div className={cn("flex w-full min-w-0 shrink-0 items-center justify-between gap-3")}>
      <div className="flex min-w-0 flex-1 basis-0 flex-wrap items-center gap-2">
        {leadingToolbarContent}

        {/* Search */}
        <div className="relative min-w-0 flex-1 basis-0">
          <Input
            className={cn("h-full pl-9", toolbarInputClassName)}
            onChange={(e) => {
              onSearchChange(e.target.value);
            }}
            placeholder={searchPlaceholder}
            value={searchValue}
            wrapperClassName={cn("h-9", toolbarInputClassName)}
          />
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>

        {extraToolbarContent}
      </div>

      {hasActions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </div>
  );
}
