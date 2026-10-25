"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ListFilter } from "lucide-react";

import type { ColumnDef } from "@/components/ui/data-table";
import type { Filter, FilterFieldConfig } from "@/components/ui/filters";
import {
  DataTable,
  DataTableRefreshButton,
  dataTableToolbarButtonClassName,
  dataTableToolbarInputClassName,
} from "@/components/ui/data-table";
import { Filters } from "@/components/ui/filters";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast/toast";
import { parseApiError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { listDomainTechnologyFindings, type DomainCrawlerFinding } from "@/services/api/domains";

type TechnologyRow = {
  categories: string;
  host: string;
  id: string;
  name: string;
  urls: string[];
  version: string;
};

function detailString(finding: DomainCrawlerFinding, key: string): string {
  const value = finding.details?.[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function detailStrings(finding: DomainCrawlerFinding, key: string): string[] {
  const value = finding.details?.[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
}

function matchesFilter(value: string, filter: Filter): boolean {
  const query = String(filter.values[0] ?? "").toLowerCase();
  const normalized = value.toLowerCase();
  if (filter.operator === "is_not") return normalized !== query;
  if (filter.operator === "not_contains") return !normalized.includes(query);
  return normalized.includes(query);
}

export function DomainTechnologies({
  activeDiscoveryEnabled,
  className,
  domainId,
  organizationId,
}: {
  activeDiscoveryEnabled: boolean;
  className?: string;
  domainId: string;
  organizationId: string;
}) {
  const [findings, setFindings] = useState<DomainCrawlerFinding[]>([]);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setFindings(await listDomainTechnologyFindings(organizationId, domainId));
    } catch (error) {
      toast.error("Could not load Technologies", { description: parseApiError(error).message });
    } finally {
      setLoading(false);
    }
  }, [domainId, organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo<TechnologyRow[]>(
    () =>
      findings.map((finding) => ({
        categories: detailStrings(finding, "categories").join(", "),
        host: detailString(finding, "host"),
        id: finding.id,
        name: detailString(finding, "name") || finding.title,
        urls: detailStrings(finding, "urls"),
        version: detailString(finding, "version"),
      })),
    [findings],
  );

  const filterFields = useMemo<FilterFieldConfig[]>(
    () => [
      {
        key: "host",
        label: "Host",
        operators: [
          { label: "contains", value: "contains" },
          { label: "does not contain", value: "not_contains" },
        ],
        type: "text",
      },
      {
        key: "name",
        label: "Technology",
        operators: [
          { label: "contains", value: "contains" },
          { label: "is not", value: "is_not" },
        ],
        type: "text",
      },
      {
        key: "version",
        label: "Version",
        operators: [
          { label: "contains", value: "contains" },
          { label: "is not", value: "is_not" },
        ],
        type: "text",
      },
      {
        key: "categories",
        label: "Category",
        operators: [
          { label: "contains", value: "contains" },
          { label: "does not contain", value: "not_contains" },
        ],
        type: "text",
      },
    ],
    [],
  );

  const visibleRows = useMemo(
    () =>
      rows.filter((row) =>
        filters.every((filter) => matchesFilter(String(row[filter.field as keyof TechnologyRow] ?? ""), filter)),
      ),
    [filters, rows],
  );

  const columns = useMemo<ColumnDef<TechnologyRow>[]>(
    () => [
      {
        cell: (row) => (
          <span className="block truncate text-[14px] font-normal" title={row.name}>
            {row.name}
          </span>
        ),
        header: "Technology",
        id: "name",
        sortable: true,
        sortValue: (row) => row.name,
        width: "1.3fr",
      },
      {
        cell: (row) => <span className="text-[14px] font-normal">{row.version || "—"}</span>,
        header: "Version",
        id: "version",
        sortable: true,
        sortValue: (row) => row.version,
        width: "0.8fr",
      },
      {
        cell: (row) => (
          <span className="block truncate text-[14px] font-normal text-foreground" title={row.host}>
            {row.host || "—"}
          </span>
        ),
        header: "Host",
        id: "host",
        sortable: true,
        sortValue: (row) => row.host,
        width: "1fr",
      },
      {
        cell: (row) => (
          <span className="block truncate text-[14px] font-normal text-foreground" title={row.categories}>
            {row.categories || "—"}
          </span>
        ),
        header: "Category",
        id: "categories",
        sortable: true,
        sortValue: (row) => row.categories,
        width: "1fr",
      },
      {
        cell: (row) =>
          row.urls.length > 0 ? (
            <a
              className="block truncate text-[14px] font-normal text-foreground underline-offset-4 hover:text-primary hover:underline"
              href={row.urls[0]}
              rel="noreferrer"
              target="_blank"
              title={row.urls.join("\n")}
            >
              {row.urls.length > 1 ? `${row.urls[0]} +${row.urls.length - 1}` : row.urls[0]}
            </a>
          ) : (
            <span className="text-[14px] font-normal text-foreground">—</span>
          ),
        header: "Detected on",
        id: "urls",
        sortable: true,
        sortValue: (row) => row.urls.join(" "),
        width: "1.5fr",
      },
    ],
    [],
  );

  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}>
      <DataTable
        className="h-full min-h-0"
        actions={
          <DataTableRefreshButton
            className={cn(dataTableToolbarButtonClassName, "shadow-none")}
            isLoading={loading}
            onClick={() => void load()}
          />
        }
        columns={columns}
        data={visibleRows}
        defaultPageSize={25}
        emptyMessage={
          activeDiscoveryEnabled
            ? "Run an active scan to fingerprint technologies used by discovered pages."
            : "Active Discovery is required to detect technologies. Enable it in Advanced Settings and run a scan."
        }
        emptyTitle="Nothing discovered"
        footerClassName="h-9 border-t border-border/70 bg-[#fafafa] px-3 text-[14px] font-normal dark:bg-[#2f2f2f]"
        getRowKey={(row) => row.id}
        isLoading={loading}
        searchKey={(row) => `${row.name} ${row.version} ${row.host} ${row.categories} ${row.urls.join(" ")}`}
        searchPlaceholder="Search Technologies"
        showHeaderColumnSeparators={false}
        tableCellClassName="border-border/70 px-4 py-2 align-middle"
        tableContainerClassName="rounded-lg border border-border bg-card"
        tableHeaderCellClassName="h-9 border-r border-border/70 px-3 text-[14px] font-normal last:border-r-0"
        tableHeaderClassName="!bg-[#fafafa] dark:!bg-card"
        tableClassName="table-fixed w-full"
        tableRowClassName="h-12 w-full bg-card text-foreground font-normal hover:bg-muted/30"
        toolbarInputClassName={dataTableToolbarInputClassName}
        toolbarButtonClassName={cn(dataTableToolbarButtonClassName, "shadow-none")}
        extraToolbarContent={
          <div className="flex items-center gap-2">
            <Filters
              fields={filterFields}
              filters={filters}
              onChange={setFilters}
              trigger={
                <Button className={cn(dataTableToolbarButtonClassName, "gap-1.5 shadow-none")} variant="outline">
                  <ListFilter className="size-4" />
                  Add Filter
                </Button>
              }
            />
            {filters.length > 0 ? (
              <Button
                className={cn(dataTableToolbarButtonClassName, "gap-1.5 shadow-none")}
                onClick={() => setFilters([])}
                variant="outline"
              >
                <ListFilter className="size-4" />
                Clear
              </Button>
            ) : null}
          </div>
        }
      />
    </div>
  );
}
