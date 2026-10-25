"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const DATA_TABLE_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

interface DataTableFooterProps {
	className?: string;
  currentPage: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSize: number;
  pageSizeOptions?: number[];
  totalItems: number;
  totalPages: number;
}

function getPageNumbers(currentPage: number, totalPages: number): ("ellipsis" | number)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: ("ellipsis" | number)[] = [];

  // Always show first 3 pages if near start, or first page
  if (currentPage <= 3) {
    pages.push(1, 2, 3, "ellipsis");
  } else {
    pages.push(1, "ellipsis");
  }

  // Middle pages
  if (currentPage > 3 && currentPage < totalPages - 2) {
    pages.push(currentPage - 1, currentPage, currentPage + 1, "ellipsis");
  }

  // Always show last 3 pages if near end, or last page
  if (currentPage >= totalPages - 2) {
    pages.push(totalPages - 2, totalPages - 1, totalPages);
  } else {
    pages.push(totalPages - 1, totalPages);
  }

  // Deduplicate and filter
  const seen = new Set<"ellipsis" | number>();
  return pages.filter((p) => {
    if (p === "ellipsis") {
      if (seen.has("ellipsis")) {
        // Allow multiple ellipses by tracking position
        return true;
      }
      seen.add("ellipsis");
      return true;
    }
    if (seen.has(p)) return false;
    seen.add(p);
    return true;
  });
}

export function DataTableFooter({
	className,
  currentPage,
  onPageChange,
  onPageSizeChange,
  pageSize,
  pageSizeOptions = DATA_TABLE_PAGE_SIZE_OPTIONS,
  totalItems,
  totalPages,
}: DataTableFooterProps) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const pageNumbers = React.useMemo(() => getPageNumbers(currentPage, totalPages), [currentPage, totalPages]);

  return (
    <div
      className={cn("relative z-10 flex h-10 shrink-0 items-center justify-between border-t border-border bg-white px-4 text-foreground dark:bg-card", className)}
      data-slot="table-footer"
    >
      {/* Left: Showing X-Y of Z results */}
      <div className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
        <span>Showing</span>
        <Select
          onValueChange={(v) => {
            onPageSizeChange(Number(v));
          }}
          value={pageSize.toString()}
        >
          <SelectTrigger className="my-1 h-8 w-auto gap-1 border-0 bg-transparent px-2.5 text-sm font-medium text-inherit shadow-none transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:border-transparent focus-visible:ring-0">
            <SelectValue>
              {startItem}-{endItem}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={size.toString()}>
                {size} per page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span>of {totalItems} results</span>
      </div>

      {/* Right: Pagination */}
      {totalPages > 1 ? (
        <div className="flex items-center gap-1">
          <Button
            className="h-8 gap-1 px-2.5 text-sm text-muted-foreground"
            disabled={currentPage === 1}
            onClick={() => {
              onPageChange(currentPage - 1);
            }}
            size="sm"
            variant="ghost"
          >
            <ChevronLeft className="size-4" />
            Previous
          </Button>

          {pageNumbers.map((page, index) =>
            page === "ellipsis" ? (
              <span
                className="px-1 text-sm text-muted-foreground select-none"
                key={`ellipsis-${String(pageNumbers[index - 1] ?? "start")}-${String(pageNumbers[index + 1] ?? "end")}`}
              >
                ...
              </span>
            ) : (
              <Button
                className={`size-8 p-0 text-sm ${page === currentPage ? "font-medium" : "text-muted-foreground"}`}
                key={page}
                onClick={() => {
                  onPageChange(page);
                }}
                size="sm"
                variant={page === currentPage ? "outline" : "ghost"}
              >
                {page}
              </Button>
            ),
          )}

          <Button
            className="h-8 gap-1 px-2.5 text-sm text-muted-foreground"
            disabled={currentPage === totalPages}
            onClick={() => {
              onPageChange(currentPage + 1);
            }}
            size="sm"
            variant="ghost"
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
