"use client";

import type { TableSkeletonColumn } from "@/components/ui/data-table/table-skeleton";

import { PageLoadingSkeleton } from "@/components/page-loading-skeleton";
import { ISSUES_TABLE_LAYOUT } from "@/components/ui/data-table/issues-table-layout";
import { REPOSITORIES_TABLE_LAYOUT } from "@/components/ui/data-table/repositories-table-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_TABLE_LAYOUT } from "@/components/ui/data-table/table-skeleton";

interface PageLoadingProps {
  message?: string;
}

export function PageLoading({ message }: PageLoadingProps) {
  return (
    <div aria-label={message ?? "Loading"} className="flex size-full min-h-[calc(100vh-64px)] overflow-hidden" role="status">
      <GenericPageSkeleton />
    </div>
  );
}

interface PageDrilldownLoadingProps {
  label?: string;
  rows?: number;
  tableColumns?: TableSkeletonColumn[];
}

/**
 * Generic skeleton for non-table pages (dashboard, feed, integrations, settings)
 */
export function GenericPageSkeleton() {
  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <Skeleton className="aspect-video rounded-xl" />
        <Skeleton className="aspect-video rounded-xl" />
        <Skeleton className="aspect-video rounded-xl" />
      </div>
      <Skeleton className="min-h-[60vh] flex-1 rounded-xl" />
    </div>
  );
}

/**
 * Skeleton loading for table-based routes
 */
export function PageTableSkeleton({
  label = "Loading",
  rows = 20,
  tableColumns = DEFAULT_TABLE_LAYOUT,
}: PageDrilldownLoadingProps) {
  return <PageLoadingSkeleton label={label} rows={rows} tableColumns={tableColumns} />;
}

/** @deprecated Use PageTableSkeleton instead */
export const PageDrilldownLoading = PageTableSkeleton;

// eslint-disable-next-line react-refresh/only-export-components
export function getTableColumns(pathname: string): TableSkeletonColumn[] {
  if (isRepositoryDetailPath(pathname)) {
    return ISSUES_TABLE_LAYOUT;
  }

  if (isRepositoriesListPath(pathname)) {
    return REPOSITORIES_TABLE_LAYOUT;
  }

  return DEFAULT_TABLE_LAYOUT;
}

// eslint-disable-next-line react-refresh/only-export-components
export function isTablePage(pathname: string): boolean {
  return isRepositoryDetailPath(pathname) || isRepositoriesListPath(pathname);
}

// eslint-disable-next-line react-refresh/only-export-components
export function isRepositoryDetailPath(pathname: string): boolean {
  return /^\/assets\/repositories\/[^/]+/.test(pathname);
}

// eslint-disable-next-line react-refresh/only-export-components
export function isRepositoriesListPath(pathname: string): boolean {
  return pathname === "/assets/repositories";
}
