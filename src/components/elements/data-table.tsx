"use client";

import { Maximize2 } from "lucide-react";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { mono } from "@/lib/surfaces";
import { cn } from "@/lib/utils";

export interface DataTableProps {
  className?: string;
  data: readonly Record<string, unknown>[];
}

const COLLAPSED_ROWS = 6;
const MAX_CELL_TEXT = 240;

function truncate(text: string): string {
  return text.length > MAX_CELL_TEXT ? `${text.slice(0, MAX_CELL_TEXT - 3)}...` : text;
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return truncate(value);
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return truncate(String(value));
  }
  if (typeof value === "symbol" || typeof value === "function") return "—";
  return truncate(JSON.stringify(value));
}

function TableFrame({
  columns,
  data,
  detail = false,
}: {
  columns: readonly string[];
  data: readonly Record<string, unknown>[];
  detail?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <div className={cn("flex items-center px-3 pt-2 pb-1.5", !detail && "min-w-max")}>
        {columns.map((column) => (
          <span
            className={cn(
              mono,
              "border-l border-foreground/[0.06] px-2 text-foreground/35 uppercase first:border-l-0 first:pl-0",
              detail ? "min-w-32 flex-1" : "w-40 shrink-0 truncate",
            )}
            key={column}
          >
            {column}
          </span>
        ))}
      </div>
      <div className="mx-3 h-px bg-foreground/[0.06]" />
      <div>
        {data.map((row, index) => (
          <div
            className={cn(
              "fade-in animate-in flex px-3 py-1.5 transition-colors duration-300 hover:bg-foreground/[0.05]",
              detail ? "items-start" : "min-w-max items-center",
            )}
            key={`row-${JSON.stringify(row)}-${String(index)}`}
          >
            {columns.map((column) => (
              <span
                className={cn(
                  "border-l border-foreground/[0.06] px-2 text-foreground/75 first:border-l-0 first:pl-0",
                  detail ? "min-w-32 flex-1 break-all" : "w-40 shrink-0 truncate",
                )}
                key={column}
              >
                {cellText(row[column])}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Renders structured output (an array of records) as a compact mono table with
 * adjacent, horizontally scrollable columns. A maximize button opens the full
 * table in a larger dialog where every value is readable.
 */
export function DataTable({ className, data }: DataTableProps) {
  const [expanded, setExpanded] = useState(false);

  const columns = (() => {
    const seen = new Set<string>();
    const cols: string[] = [];
    for (const row of data) {
      for (const key of Object.keys(row)) {
        if (!seen.has(key)) {
          seen.add(key);
          cols.push(key);
        }
      }
    }
    return cols;
  })();

  if (columns.length === 0) return null;

  const visible = expanded ? data : data.slice(0, COLLAPSED_ROWS);
  const hasMore = data.length > COLLAPSED_ROWS;

  return (
    <Dialog>
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-xl bg-foreground/[0.04] font-mono text-[11px]",
          className,
        )}
      >
        <DialogTrigger asChild>
          <button
            aria-label="Expand table"
            className="absolute top-1.5 right-1.5 z-10 flex size-5 items-center justify-center rounded-md text-foreground/40 transition-colors outline-none hover:bg-foreground/[0.06] hover:text-foreground/80"
            type="button"
          >
            <Maximize2 className="size-3" />
          </button>
        </DialogTrigger>
        <TableFrame columns={columns} data={visible} />
        {hasMore && (
          <button
            className="w-full border-t border-foreground/[0.06] py-1.5 text-foreground/45 transition-colors hover:bg-foreground/[0.04] hover:text-foreground/80"
            onClick={() => {
              setExpanded((value) => !value);
            }}
            type="button"
          >
            {expanded ? "Show fewer" : `Show all (${String(data.length)})`}
          </button>
        )}
      </div>
      <DialogContent className="max-h-[80dvh] w-[min(760px,calc(100vw-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(760px,calc(100vw-2rem))]">
        <DialogHeader className="shrink-0 border-b border-foreground/[0.06] px-4 py-3">
          <DialogTitle className="font-mono text-[13px] font-medium tracking-tight">
            All rows ({String(data.length)})
          </DialogTitle>
        </DialogHeader>
        <div className="bg-foreground/[0.04] font-mono text-[11px]">
          <TableFrame columns={columns} data={data} detail />
        </div>
      </DialogContent>
    </Dialog>
  );
}
