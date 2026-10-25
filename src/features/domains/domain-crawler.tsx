"use client";

import { ListFilter, Play } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import type { ColumnDef } from "@/components/ui/data-table";
import {
  DataTable,
  DataTableRefreshButton,
  dataTableToolbarButtonClassName,
  dataTableToolbarInputClassName,
} from "@/components/ui/data-table";
import type { Filter, FilterFieldConfig } from "@/components/ui/filters";
import { Filters } from "@/components/ui/filters";
import { Button } from "@/components/ui/button";
import { getSeverityPillClassName, getSeverityPillLabel } from "@/components/ui/severity-badge";
import { toast } from "@/components/ui/toast/toast";
import { parseApiError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import {
  listDomainCrawlerFindings,
  listDomainNetworkAssets,
  startDomainCrawler,
  type DomainCrawlerFinding,
  type DomainNetworkAsset,
} from "@/services/api/domains";

type CrawlerRow = {
  contentType: string;
  flagged: boolean;
  finding?: DomainCrawlerFinding;
  host: string;
  id: string;
  kind: "finding" | "url";
  path: string;
  resource: string;
  source: string;
  status: string;
  url?: string;
};

function attrString(asset: DomainNetworkAsset, key: string): string {
  const value = asset.attrs?.[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function findingDetail(finding: DomainCrawlerFinding, key: string): string {
  const value = finding.details?.[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function matchesFilter(value: string, filter: Filter): boolean {
  const query = String(filter.values[0] ?? "").toLowerCase();
  const normalized = value.toLowerCase();
  if (filter.operator === "is_not") return normalized !== query;
  if (filter.operator === "not_contains") return !normalized.includes(query);
  if (filter.operator === "starts_with") return normalized.startsWith(query);
  if (filter.operator === "ends_with") return normalized.endsWith(query);
  if (filter.operator === "empty") return normalized.length === 0;
  if (filter.operator === "not_empty") return normalized.length > 0;
  if (filter.operator === "is") return normalized === query;
  return normalized.includes(query);
}

export function DomainCrawler({
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
  const [assets, setAssets] = useState<DomainNetworkAsset[]>([]);
  const [findings, setFindings] = useState<DomainCrawlerFinding[]>([]);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [assetsResult, findingsResult] = await Promise.allSettled([
      listDomainNetworkAssets(organizationId, domainId),
      listDomainCrawlerFindings(organizationId, domainId),
    ]);

    if (assetsResult.status === "fulfilled") setAssets(assetsResult.value);
    else toast.error("Could not load discovered URLs", { description: parseApiError(assetsResult.reason).message });

    if (findingsResult.status === "fulfilled") setFindings(findingsResult.value);
    else toast.error("Could not load crawler findings", { description: parseApiError(findingsResult.reason).message });

    setLoading(false);
  }, [domainId, organizationId]);

  const start = useCallback(async () => {
    setStarting(true);
    try {
      const queued = await startDomainCrawler(organizationId, domainId);
      if (queued) {
        toast.success("Directory scan started", { description: "The scan is running in the background." });
      } else {
        toast.info("Directory scan already running", { description: "Refresh in a moment to see the latest results." });
      }
    } catch (error) {
      toast.error("Could not start directory scan", { description: parseApiError(error).message });
    } finally {
      setStarting(false);
    }
  }, [domainId, organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo<CrawlerRow[]>(() => {
    const flaggedUrls = new Set(findings.map((finding) => findingDetail(finding, "url")).filter(Boolean));
    return [
      ...assets
        .filter((asset) => asset.type === "url")
        .map((asset) => ({
          contentType: attrString(asset, "content_type"),
          flagged: flaggedUrls.has(asset.value),
          host: attrString(asset, "host"),
          id: `url-${asset.value}`,
          kind: "url" as const,
          path: attrString(asset, "path"),
          resource: asset.value,
          source: attrString(asset, "via") || asset.source,
          status: attrString(asset, "status"),
          url: asset.value,
        })),
      ...findings.map((finding) => ({
        contentType: "",
        finding,
        flagged: true,
        host: findingDetail(finding, "host"),
        id: `finding-${finding.id}`,
        kind: "finding" as const,
        path: findingDetail(finding, "path"),
        resource: finding.title,
        source: finding.severity,
        status: finding.status,
        url: findingDetail(finding, "url"),
      })),
    ];
  }, [assets, findings]);

  const filterFields = useMemo<FilterFieldConfig[]>(
    () => [
      {
        key: "kind",
        label: "Result type",
        operators: [
          { label: "is", value: "is" },
          { label: "is not", value: "is_not" },
        ],
        options: [
          { label: "URL", value: "url" },
          { label: "Finding", value: "finding" },
        ],
        type: "select",
      },
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
        key: "source",
        label: "Source / severity",
        operators: [
          { label: "contains", value: "contains" },
          { label: "does not contain", value: "not_contains" },
        ],
        type: "text",
      },
      {
        key: "content_type",
        label: "Content type",
        operators: [
          { label: "contains", value: "contains" },
          { label: "does not contain", value: "not_contains" },
        ],
        type: "text",
      },
      {
        key: "status",
        label: "Status",
        operators: [
          { label: "is", value: "is" },
          { label: "is not", value: "is_not" },
        ],
        options: [...new Set(rows.map((row) => row.status).filter(Boolean))].map((value) => ({ label: value, value })),
        type: "select",
      },
    ],
    [rows],
  );

  const visibleRows = useMemo(
    () =>
      rows.filter((row) =>
        filters.every((filter) => {
          const value =
            filter.field === "kind"
              ? row.kind
              : filter.field === "host"
                ? row.host
                : filter.field === "source"
                  ? row.source
                  : filter.field === "content_type"
                    ? row.contentType
                    : row.status;
          return matchesFilter(value, filter);
        }),
      ),
    [filters, rows],
  );

  const columns = useMemo<ColumnDef<CrawlerRow>[]>(
    () => [
      {
        cell: (row) =>
          row.url ? (
            <a
              className="block min-w-0 truncate text-[14px] font-normal text-foreground underline-offset-4 hover:text-primary hover:underline"
              href={row.url}
              rel="noreferrer"
              target="_blank"
              title={row.resource}
            >
              {row.resource}
            </a>
          ) : (
            <span className="block min-w-0 truncate text-[14px] font-normal" title={row.resource}>
              {row.resource}
            </span>
          ),
        header: "Resource",
        id: "resource",
        sortable: true,
        sortValue: (row) => row.resource,
        width: "35%",
      },
      {
        cell: (row) => (
          <span className="text-[14px] font-normal capitalize">
            {row.kind === "url" ? "URL" : row.finding?.type ? row.finding.type.replaceAll("_", " ") : "Finding"}
          </span>
        ),
        header: "Type",
        id: "kind",
        sortable: true,
        sortValue: (row) => (row.kind === "url" ? "url" : (row.finding?.type ?? "")),
        width: "11%",
      },
      {
        cell: (row) => (
          <span className="block truncate text-[14px] font-normal" title={row.host}>
            {row.host || "—"}
          </span>
        ),
        header: "Host",
        id: "host",
        sortable: true,
        sortValue: (row) => row.host,
        width: "12%",
      },
      {
        cell: (row) => (
          <span className="block truncate text-[14px] font-normal text-foreground" title={row.path}>
            {row.path || "—"}
          </span>
        ),
        header: "Path",
        id: "path",
        sortable: true,
        sortValue: (row) => row.path,
        width: "14%",
      },
      {
        cell: (row) =>
          row.kind === "finding" ? (
            <Badge
              className={cn("px-1.5 text-[14px] font-normal", getSeverityPillClassName(row.source))}
              variant="outline"
            >
              {getSeverityPillLabel(row.source)}
            </Badge>
          ) : (
            <span className="block truncate text-[14px] font-normal text-foreground" title={row.source}>
              {row.source || "—"}
            </span>
          ),
        header: "Source",
        id: "source",
        sortable: true,
        sortValue: (row) => row.source,
        width: "9%",
      },
      {
        cell: (row) =>
          row.flagged ? (
            <Badge
              className="border-red-300/70 bg-red-500/10 px-1.5 text-[14px] font-normal text-red-700 dark:border-red-400/30 dark:text-red-300"
              variant="outline"
            >
              Flagged
            </Badge>
          ) : (
            <span className="text-[14px] font-normal text-foreground">—</span>
          ),
        header: "Flag",
        id: "flagged",
        sortable: true,
        sortValue: (row) => (row.flagged ? 1 : 0),
        width: "11%",
      },
      {
        cell: (row) => (
          <span
            className={cn(
              "font-mono text-[14px] font-normal text-foreground",
              row.kind === "url" && row.status === "200" && "text-emerald-600 dark:text-emerald-500",
            )}
          >
            {row.status || "—"}
          </span>
        ),
        header: "Status",
        id: "status",
        sortable: true,
        sortValue: (row) => row.status,
        width: "8%",
      },
    ],
    [],
  );

  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}>
      <DataTable
        actions={
          <div className="flex items-center gap-2">
            <Button
              className={cn(dataTableToolbarButtonClassName, "gap-1.5 shadow-none")}
              disabled={starting}
              onClick={() => void start()}
              variant="outline"
            >
              <Play className="size-4" />
              {starting ? "Starting" : "Start scan"}
            </Button>
            <DataTableRefreshButton
              className={cn(dataTableToolbarButtonClassName, "shadow-none")}
              isLoading={loading}
              onClick={() => void load()}
            />
          </div>
        }
        columns={columns}
        data={visibleRows}
        defaultPageSize={25}
        emptyMessage={
          activeDiscoveryEnabled
            ? "No directory scan results found."
            : "Active Discovery is required to collect directory scan results. Enable it in Advanced Settings and run a scan."
        }
        emptyTitle="Nothing discovered"
        getRowKey={(row) => row.id}
        isLoading={loading}
        className="h-full min-h-0"
        searchKey={(row) => `${row.resource} ${row.host} ${row.path} ${row.source} ${row.status} ${row.contentType}`}
        searchPlaceholder="Search Scan Results"
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
          <div className="flex flex-wrap items-center gap-2.5">
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
