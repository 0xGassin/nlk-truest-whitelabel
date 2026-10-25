"use client";

import type { ColumnDef } from "./data-table-column-header";
import type { StateIcon } from "@/components/state";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { StackedCardsIllustration } from "@/components/ui/stacked-cards-illustration";
import { cn } from "@/lib/utils";

import { DataTableColumnHeader } from "./data-table-column-header";
import { DataTableFooter } from "./data-table-footer";
import { DataTableToolbar } from "./data-table-toolbar";
import { columnsToSkeletonLayout, TableLoadingSkeleton, TableSkeletonBody } from "./table-skeleton";

import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";

const DATA_TABLE_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export type { ColumnDef } from "./data-table-column-header";

interface DataTableProps<T> {
  actions?: React.ReactNode;
  className?: string;

  columns: ColumnDef<T>[];
  data: T[];

  // Pagination
  defaultPageSize?: number;
  infiniteScroll?: boolean;

  // Sorting
  defaultSort?: { direction: "asc" | "desc"; key: string } | null;
  emptyAction?: React.ReactNode;

  emptyIcon?: StateIcon;
  emptyMessage?: string;
  emptyStateClassName?: string;
  emptyTitle?: string;
  hideToolbarWhenEmpty?: boolean;
  expandedRowKeys?: Set<string>;
  extraToolbarContent?: React.ReactNode;
  // Custom slots
  /** Detail route to prefetch when a user hovers or presses a navigable row. */
  getRowHref?: (item: T) => string | undefined;
  getRowKey: (item: T) => string;
  // Loading
  isLoading?: boolean;
  loadingRows?: number;
  /** When true, keeps the real toolbar visible and only skeletons the table body. */
  keepToolbarWhileLoading?: boolean;
  /** Use "content" only for embedded tables (drawers, cards). Default shrinks to rows and scrolls when needed. */
  layout?: "content" | "fill";
  leadingToolbarContent?: React.ReactNode;

  loadingMessage?: string;
  onExpandedRowKeysChange?: (keys: Set<string>) => void;

  // Row handling
  onRowClick?: (item: T) => void;
  pageSizeOptions?: number[];
  // Expansion
  renderSubComponent?: (item: T) => React.ReactNode;
  // Context menu
  renderContextMenu?: (item: T) => React.ReactNode;
  contextMenuClassName?: string;
  rowClassName?: (item: T, index: number) => string;
  searchKey?: ((item: T) => string) | keyof T;
  // Search
  searchPlaceholder?: string;
  showBodyColumnSeparators?: boolean;
  showHeaderColumnSeparators?: boolean;
  showScrollShadow?: boolean;
  showRowSeparators?: boolean;
  tableCellClassName?: string;
  tableClassName?: string;
  tableContainerClassName?: string;
  footerClassName?: string;
  tableHeaderCellClassName?: string;
  tableHeaderClassName?: string;

  tableRowClassName?: string;
  toolbarButtonClassName?: string;
  toolbarInputClassName?: string;
}

export function DataTable<T>({
  actions,
  className,
  columns,
  data,
  defaultPageSize = 25,
  infiniteScroll = false,
  defaultSort = null,
  emptyAction,
  emptyMessage = "No results found.",
  emptyStateClassName,
  emptyTitle,
  hideToolbarWhenEmpty = false,
  expandedRowKeys,
  extraToolbarContent,
  getRowHref,
  getRowKey,
  isLoading = false,
  loadingRows = 15,
  keepToolbarWhileLoading = false,
  layout = "fill",
  leadingToolbarContent,
  loadingMessage = "Loading...",
  onExpandedRowKeysChange,
  onRowClick,
  pageSizeOptions = DATA_TABLE_PAGE_SIZE_OPTIONS,
  renderSubComponent,
  renderContextMenu,
  contextMenuClassName,
  rowClassName,
  searchKey,
  searchPlaceholder = "Search...",
  showBodyColumnSeparators = true,
  showHeaderColumnSeparators = true,
  showScrollShadow = true,
  showRowSeparators = true,
  tableCellClassName,
  tableClassName,
  tableContainerClassName,
  footerClassName,
  tableHeaderCellClassName,
  tableHeaderClassName,
  tableRowClassName,
  toolbarButtonClassName,
  toolbarInputClassName,
}: DataTableProps<T>) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(defaultPageSize);
  const [infiniteRowCount, setInfiniteRowCount] = React.useState(defaultPageSize);
  const [sortConfig, setSortConfig] = React.useState<{ direction: "asc" | "desc"; key: string } | null>(defaultSort);
  const [uncontrolledExpandedRows, setUncontrolledExpandedRows] = React.useState<Set<string>>(() => new Set());
  const isExpansionControlled = expandedRowKeys !== undefined;
  const expandedRows = isExpansionControlled ? expandedRowKeys : uncontrolledExpandedRows;

  // Scroll shadow state
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const prefetchedRowHrefs = React.useRef(new Set<string>());
  const [scrollShadow, setScrollShadow] = React.useState({ bottom: false, top: false });

  const prefetchRow = React.useCallback(
    (item: T) => {
      const href = getRowHref?.(item);
      if (!href || prefetchedRowHrefs.current.has(href)) return;

      prefetchedRowHrefs.current.add(href);
      void router.prefetch(href);
    },
    [getRowHref, router],
  );

  const toggleRow = React.useCallback(
    (key: string) => {
      const next = new Set(expandedRows);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      if (isExpansionControlled) {
        onExpandedRowKeysChange?.(next);
      } else {
        setUncontrolledExpandedRows(next);
      }
    },
    [expandedRows, isExpansionControlled, onExpandedRowKeysChange],
  );

  // Handle sorting
  const handleSort = React.useCallback((key: string) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        if (current.direction === "desc") return { direction: "asc", key };
        return null;
      }
      return { direction: "desc", key };
    });
  }, []);

  // Filter and sort data
  const processedData = React.useMemo(() => {
    let result = [...data];

    // Search
    if (searchQuery && searchKey) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) => {
        const value = typeof searchKey === "function" ? searchKey(item) : String(item[searchKey] || "");
        return value.toLowerCase().includes(query);
      });
    }

    // Sort
    if (sortConfig) {
      const column = columns.find((col) => col.id === sortConfig.key);
      if (column) {
        result.sort((a, b) => {
          const aValue = column.sortValue
            ? column.sortValue(a)
            : (a as Record<string, number | string>)[sortConfig.key];
          const bValue = column.sortValue
            ? column.sortValue(b)
            : (b as Record<string, number | string>)[sortConfig.key];

          if (aValue == null || bValue == null) return 0;
          if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
          if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
          return 0;
        });
      }
    }

    return result;
  }, [data, searchQuery, searchKey, sortConfig, columns]);

  const hasMoreInfiniteRows = infiniteScroll && infiniteRowCount < processedData.length;
  const updateScrollShadow = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { clientHeight, scrollHeight, scrollTop } = el;
    setScrollShadow({
      bottom: hasMoreInfiniteRows || scrollTop + clientHeight < scrollHeight - 1,
      top: scrollTop > 0,
    });
  }, [hasMoreInfiniteRows]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / pageSize);
  const paginatedData = React.useMemo(() => {
    if (infiniteScroll) {
      return processedData.slice(0, infiniteRowCount);
    }
    const start = (currentPage - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [currentPage, infiniteRowCount, infiniteScroll, pageSize, processedData]);

  const handleInfiniteScroll = React.useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (!hasMoreInfiniteRows) return;
      const element = event.currentTarget;
      if (element.scrollTop + element.clientHeight < element.scrollHeight - 160) return;
      setInfiniteRowCount((current) => Math.min(current + pageSize, processedData.length));
    },
    [hasMoreInfiniteRows, pageSize, processedData.length],
  );

  // Attach scroll shadow listeners after paginatedData is ready
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollShadow();
    el.addEventListener("scroll", updateScrollShadow, { passive: true });
    const ro = new ResizeObserver(updateScrollShadow);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollShadow);
      ro.disconnect();
    };
  }, [updateScrollShadow, paginatedData]);

  // Reset page when filters or data change
  React.useEffect(() => {
    setCurrentPage(1);
    setInfiniteRowCount(pageSize);
  }, [data, searchQuery, pageSize, sortConfig]);

  const handlePageSizeChange = React.useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  const rowSeparatorClass = showRowSeparators
    ? "border-b border-border/50 dark:border-border/30 last:border-b-0"
    : "border-b-0";

  if (isLoading && !keepToolbarWhileLoading) {
    return (
      <TableLoadingSkeleton
        className={cn(layout !== "content" && "h-full min-h-0", className)}
        columns={columnsToSkeletonLayout(columns)}
        label={loadingMessage}
        rows={loadingRows}
      />
    );
  }

  const skeletonColumns = columnsToSkeletonLayout(columns);

  const isFillLayout = layout !== "content";

  return (
    <div
      className={cn(
        isFillLayout
          ? "flex h-full min-h-0 min-w-0 flex-col gap-4 overflow-x-hidden px-px pt-px"
          : "flex max-h-full min-w-0 flex-col gap-4 px-px pt-px",
        className,
      )}
    >
      {/* Toolbar */}
      {!(hideToolbarWhenEmpty && !isLoading && paginatedData.length === 0) ? (
        <DataTableToolbar
          actions={actions}
          extraToolbarContent={extraToolbarContent}
          leadingToolbarContent={leadingToolbarContent}
          onSearchChange={setSearchQuery}
          searchPlaceholder={searchPlaceholder}
          searchValue={searchQuery}
          toolbarButtonClassName={toolbarButtonClassName}
          toolbarInputClassName={toolbarInputClassName}
        />
      ) : null}
      {isLoading ? (
        <div className="flex min-h-0 flex-1 flex-col items-start overflow-hidden">
          <TableSkeletonBody
            className="h-max max-h-full"
            columns={skeletonColumns}
            label={loadingMessage}
            rows={loadingRows}
          />
        </div>
      ) : paginatedData.length === 0 ? (
        <div
          className={cn(
            "isolate flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-hidden rounded-lg border bg-card",
            tableContainerClassName,
            emptyStateClassName,
          )}
        >
          <Empty className="size-full rounded-none border-0 !bg-transparent p-6 md:p-8">
            <EmptyHeader className="!bg-transparent">
              <EmptyMedia className="mb-4 !bg-transparent">
                <StackedCardsIllustration />
              </EmptyMedia>
              <EmptyTitle>{emptyTitle || "No data"}</EmptyTitle>
              <EmptyDescription>{emptyMessage}</EmptyDescription>
            </EmptyHeader>
            {emptyAction ? <EmptyContent>{emptyAction}</EmptyContent> : null}
          </Empty>
        </div>
      ) : isFillLayout ? (
        <div className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300 flex min-h-0 flex-1 flex-col items-start overflow-hidden">
          <div
            className={cn(
              "isolate grid h-max max-h-full w-full grid-rows-[minmax(0,1fr)_auto] overflow-hidden rounded-lg border bg-card",
              tableContainerClassName,
            )}
          >
            <div className="relative min-h-0 overflow-hidden">
              <div
                className={cn(
                  "pointer-events-none absolute inset-x-0 top-0 z-10 h-8 transition-opacity duration-300",
                  scrollShadow.top ? "opacity-100" : "opacity-0",
                )}
                style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.035), transparent)" }}
              />
              <div className="h-full min-h-0 overflow-auto" onScroll={handleInfiniteScroll} ref={scrollRef}>
                <table className={cn("w-full table-fixed", tableClassName)}>
                  <thead
                    className={cn("sticky top-0 z-20 bg-muted/30 text-foreground dark:bg-card", tableHeaderClassName)}
                    style={{ boxShadow: "inset 0 -0.5px 0 var(--border)" }}
                  >
                    <tr>
                      {columns.map((column, columnIndex) => (
                        <DataTableColumnHeader
                          column={column}
                          headerCellClassName={tableHeaderCellClassName}
                          key={column.id}
                          onSort={handleSort}
                          showColumnSeparator={
                            showHeaderColumnSeparators ? columnIndex < columns.length - 1 : undefined
                          }
                          sortConfig={sortConfig}
                        />
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((item, index) => {
                      const key = getRowKey(item);
                      const isExpanded = expandedRows.has(key);
                      const contextMenuContent = renderContextMenu?.(item);
                      const row = (
                        <tr
                          className={cn(
                            "group h-16 bg-card text-sm font-medium text-foreground/80 transition-colors hover:bg-accent/50",
                            rowSeparatorClass,
                            tableRowClassName,
                            (onRowClick ?? renderSubComponent) && "cursor-pointer",
                            rowClassName?.(item, index),
                            isExpanded && "bg-accent/30 dark:bg-accent/10",
                          )}
                          data-state={isExpanded ? "expanded" : "collapsed"}
                          onClick={() => {
                            if (renderSubComponent) {
                              toggleRow(key);
                            }
                            onRowClick?.(item);
                          }}
                          onPointerDown={() => prefetchRow(item)}
                          onPointerEnter={() => prefetchRow(item)}
                        >
                          {columns.map((column, columnIndex) => (
                            <td
                              className={cn(
                                "px-4 py-3 align-middle",
                                showBodyColumnSeparators &&
                                  columnIndex < columns.length - 1 &&
                                  "border-r border-border/50",
                                tableCellClassName,
                                column.align === "center" && "text-center",
                                column.align === "right" && "text-right",
                                column.cellClassName,
                              )}
                              key={column.id}
                            >
                              {column.cell(item)}
                            </td>
                          ))}
                        </tr>
                      );
                      const wrappedRow = contextMenuContent ? (
                        <ContextMenu modal={false}>
                          <ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
                          <ContextMenuContent className={cn("w-40", contextMenuClassName)}>
                            {contextMenuContent}
                          </ContextMenuContent>
                        </ContextMenu>
                      ) : (
                        row
                      );
                      return (
                        <React.Fragment key={key}>
                          {wrappedRow}
                          {isExpanded && renderSubComponent ? (
                            <tr>
                              <td
                                className={cn("p-0", showRowSeparators && "border-b border-border/50")}
                                colSpan={columns.length}
                              >
                                {renderSubComponent(item)}
                              </td>
                            </tr>
                          ) : null}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {showScrollShadow ? (
                <div
                  className={cn(
                    "pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 transition-opacity duration-300",
                    scrollShadow.bottom ? "opacity-100" : "opacity-0",
                  )}
                  style={{ background: "linear-gradient(to top, rgba(0,0,0,0.035), transparent)" }}
                />
              ) : null}
            </div>
            {!infiniteScroll ? (
              <DataTableFooter
                className={footerClassName}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                onPageSizeChange={handlePageSizeChange}
                pageSize={pageSize}
                pageSizeOptions={pageSizeOptions}
                totalItems={processedData.length}
                totalPages={totalPages}
              />
            ) : null}
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "isolate flex w-full shrink-0 flex-col overflow-hidden rounded-lg border bg-card",
            tableContainerClassName,
          )}
        >
          <div className="relative overflow-hidden">
            <div className="overflow-visible" onScroll={handleInfiniteScroll} ref={scrollRef}>
              <table className={cn("w-full table-auto", tableClassName)}>
                <thead
                  className={cn("sticky top-0 z-20 bg-muted/30 text-foreground dark:bg-card", tableHeaderClassName)}
                  style={{ boxShadow: "inset 0 -0.5px 0 var(--border)" }}
                >
                  <tr>
                    {columns.map((column, columnIndex) => (
                      <DataTableColumnHeader
                        column={column}
                        headerCellClassName={tableHeaderCellClassName}
                        key={column.id}
                        onSort={handleSort}
                        showColumnSeparator={showHeaderColumnSeparators ? columnIndex < columns.length - 1 : undefined}
                        sortConfig={sortConfig}
                      />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((item, index) => {
                    const key = getRowKey(item);
                    const isExpanded = expandedRows.has(key);
                    const contextMenuContent = renderContextMenu?.(item);
                    const row = (
                      <tr
                        className={cn(
                          "group h-16 bg-card text-sm font-medium text-foreground/80 transition-colors hover:bg-accent/50",
                          rowSeparatorClass,
                          tableRowClassName,
                          (onRowClick ?? renderSubComponent) && "cursor-pointer",
                          rowClassName?.(item, index),
                          isExpanded && "bg-accent/30 dark:bg-accent/10",
                        )}
                        data-state={isExpanded ? "expanded" : "collapsed"}
                        onClick={() => {
                          if (renderSubComponent) {
                            toggleRow(key);
                          }
                          onRowClick?.(item);
                        }}
                        onPointerDown={() => prefetchRow(item)}
                        onPointerEnter={() => prefetchRow(item)}
                      >
                        {columns.map((column, columnIndex) => (
                          <td
                            className={cn(
                              "px-4 py-3 align-middle",
                              showBodyColumnSeparators &&
                                columnIndex < columns.length - 1 &&
                                "border-r border-border/50",
                              tableCellClassName,
                              column.align === "center" && "text-center",
                              column.align === "right" && "text-right",
                              column.cellClassName,
                            )}
                            key={column.id}
                          >
                            {column.cell(item)}
                          </td>
                        ))}
                      </tr>
                    );
                    const wrappedRow = contextMenuContent ? (
                      <ContextMenu>
                        <ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
                        <ContextMenuContent className={cn("w-40", contextMenuClassName)}>
                          {contextMenuContent}
                        </ContextMenuContent>
                      </ContextMenu>
                    ) : (
                      row
                    );
                    return (
                      <React.Fragment key={key}>
                        {wrappedRow}
                        {isExpanded && renderSubComponent ? (
                          <tr>
                            <td
                              className={cn("p-0", showRowSeparators && "border-b border-border/50")}
                              colSpan={columns.length}
                            >
                              {renderSubComponent(item)}
                            </td>
                          </tr>
                        ) : null}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {!infiniteScroll ? (
            <DataTableFooter
              className={footerClassName}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onPageSizeChange={handlePageSizeChange}
              pageSize={pageSize}
              pageSizeOptions={pageSizeOptions}
              totalItems={processedData.length}
              totalPages={totalPages}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
