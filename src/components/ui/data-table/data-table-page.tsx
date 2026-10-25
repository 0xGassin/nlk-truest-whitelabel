"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface DataTablePageProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padded?: boolean;
}

/**
 * Standard page wrapper for full-height DataTable views.
 * Tables shrink to their row count when short and scroll within the viewport when tall.
 */
export function DataTablePage({ children, className, padded = true, ...props }: DataTablePageProps) {
  return (
    <div className={cn("flex h-full min-h-0 flex-col", padded && "p-4", className)} {...props}>
      {children}
    </div>
  );
}
