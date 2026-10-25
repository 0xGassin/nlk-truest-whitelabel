import type { TableSkeletonColumn } from "@/components/ui/data-table/table-skeleton";

import { DEFAULT_TABLE_LAYOUT, TableLoadingSkeleton } from "@/components/ui/data-table/table-skeleton";
import { cn } from "@/lib/utils";

interface PageLoadingSkeletonProps {
  className?: string;
  label?: string;
  rows?: number;
  tableColumns?: TableSkeletonColumn[];
}

export function PageLoadingSkeleton({
  className,
  label = "Loading",
  rows = 8,
  tableColumns = DEFAULT_TABLE_LAYOUT,
}: PageLoadingSkeletonProps) {
  return (
    <div aria-label={label} className={cn("flex size-full min-h-0 flex-col overflow-hidden", className)} role="status">
      <div className="flex min-h-0 flex-1 flex-col p-4">
        <TableLoadingSkeleton className="min-h-0 flex-1" columns={tableColumns} label={label} rows={rows} />
      </div>
    </div>
  );
}
