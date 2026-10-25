"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ListFilter, Server } from "lucide-react";

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
import { toast } from "@/components/ui/toast/toast";
import { parseApiError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { listDomainNetworkAssets, type DomainNetworkAsset } from "@/services/api/domains";

type ServiceRow = {
  id: string;
  ip: string;
  port: string;
  product: string;
  service: string;
  tls: string;
  vulnerabilities: number;
};

function matchesFilter(value: string, filter: Filter): boolean {
  const query = String(filter.values[0] ?? "").toLowerCase();
  const normalized = value.toLowerCase();
  if (filter.operator === "is_not") return normalized !== query;
  if (filter.operator === "not_contains") return !normalized.includes(query);
  return normalized.includes(query);
}

function attrString(asset: DomainNetworkAsset, key: string): string {
  const value = asset.attrs?.[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function tlsDetails(asset: DomainNetworkAsset): string {
  const value = asset.attrs?.tls;
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const tls = value as Record<string, unknown>;
  const subject = typeof tls.subject_cn === "string" ? tls.subject_cn : "";
  const issuer = typeof tls.issuer_cn === "string" ? tls.issuer_cn : "";
  return [subject, issuer ? `issued by ${issuer}` : ""].filter(Boolean).join(" · ");
}

export function DomainServices({
  className,
  domainId,
  organizationId,
}: {
  className?: string;
  domainId: string;
  organizationId: string;
}) {
  const [assets, setAssets] = useState<DomainNetworkAsset[]>([]);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAssets(await listDomainNetworkAssets(organizationId, domainId));
    } catch (error) {
      toast.error("Could not load services", { description: parseApiError(error).message });
    } finally {
      setLoading(false);
    }
  }, [domainId, organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo<ServiceRow[]>(
    () =>
      assets
        .filter((asset) => asset.type === "service")
        .map((asset, index) => ({
          id: `${asset.type}-${asset.value}-${index}`,
          ip: attrString(asset, "ip"),
          port: [attrString(asset, "port"), attrString(asset, "transport")].filter(Boolean).join(" / "),
          product: [attrString(asset, "product"), attrString(asset, "version")].filter(Boolean).join(" "),
          service: attrString(asset, "service_name") || asset.value,
          tls: tlsDetails(asset),
          vulnerabilities: Array.isArray(asset.attrs?.shodan_vulns) ? asset.attrs.shodan_vulns.length : 0,
        })),
    [assets],
  );

  const filterFields = useMemo<FilterFieldConfig[]>(
    () => [
      {
        key: "service",
        label: "Service",
        operators: [
          { label: "contains", value: "contains" },
          { label: "does not contain", value: "not_contains" },
        ],
        type: "text",
      },
      {
        key: "product",
        label: "Product",
        operators: [
          { label: "contains", value: "contains" },
          { label: "does not contain", value: "not_contains" },
        ],
        type: "text",
      },
      {
        key: "ip",
        label: "IP",
        operators: [
          { label: "contains", value: "contains" },
          { label: "does not contain", value: "not_contains" },
        ],
        type: "text",
      },
      {
        key: "port",
        label: "Port",
        operators: [
          { label: "is", value: "contains" },
          { label: "is not", value: "not_contains" },
        ],
        type: "text",
      },
      {
        key: "tls",
        label: "TLS",
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
        filters.every((filter) => matchesFilter(String(row[filter.field as keyof ServiceRow] ?? ""), filter)),
      ),
    [filters, rows],
  );

  const columns = useMemo<ColumnDef<ServiceRow>[]>(
    () => [
      {
        cell: (row) => (
          <span className="block truncate text-[14px] font-normal" title={row.product}>
            {row.product || "—"}
          </span>
        ),
        header: "Product",
        id: "product",
        sortable: true,
        sortValue: (row) => row.product,
        width: "1.2fr",
      },
      {
        cell: (row) => (
          <span className="block truncate font-mono text-[14px] font-normal" title={row.ip}>
            {row.ip || "—"}
          </span>
        ),
        header: "IP",
        id: "ip",
        sortable: true,
        sortValue: (row) => row.ip,
        width: "1fr",
      },
      {
        cell: (row) => <span className="text-[14px] font-normal">{row.port || "—"}</span>,
        header: "Port",
        id: "port",
        sortable: true,
        sortValue: (row) => row.port,
        width: "0.8fr",
      },
      {
        cell: (row) => (
          <span className="block truncate text-[14px] font-normal" title={row.tls}>
            {row.tls || "—"}
          </span>
        ),
        header: "TLS",
        id: "tls",
        sortable: true,
        sortValue: (row) => row.tls,
        width: "1.5fr",
      },
      {
        cell: (row) => <span className="text-[14px] font-normal">{row.vulnerabilities || "—"}</span>,
        header: "Vulnerabilities",
        id: "vulnerabilities",
        sortable: true,
        sortValue: (row) => row.vulnerabilities,
        width: "1fr",
      },
    ],
    [],
  );

  const toolbarButtonClassName = cn(dataTableToolbarButtonClassName, "shadow-none");

  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}>
      <DataTable
        actions={
          <DataTableRefreshButton className={toolbarButtonClassName} isLoading={loading} onClick={() => void load()} />
        }
        className="h-full min-h-0"
        columns={columns}
        data={visibleRows}
        defaultPageSize={25}
        emptyIcon={Server}
        emptyMessage="No services were found for this domain."
        emptyTitle="No services"
        footerClassName="h-9 border-t border-border/70 bg-[#fafafa] px-3 text-[14px] font-normal dark:bg-[#2f2f2f]"
        getRowKey={(row) => row.id}
        isLoading={loading}
        searchKey={(row) => `${row.service} ${row.product} ${row.ip} ${row.port} ${row.tls}`}
        searchPlaceholder="Search Services"
        showHeaderColumnSeparators={false}
        tableCellClassName="border-border/70 px-4 py-2 align-middle"
        tableClassName="table-fixed w-full"
        tableContainerClassName="rounded-lg border border-border bg-card"
        tableHeaderCellClassName="h-9 border-r border-border/70 px-3 text-[14px] font-normal last:border-r-0"
        tableHeaderClassName="!bg-[#fafafa] dark:!bg-card"
        tableRowClassName="h-12 w-full bg-card text-foreground font-normal hover:bg-muted/30"
        toolbarButtonClassName={toolbarButtonClassName}
        toolbarInputClassName={dataTableToolbarInputClassName}
        extraToolbarContent={
          <div className="flex flex-wrap items-center gap-2.5">
            <Filters
              fields={filterFields}
              filters={filters}
              onChange={setFilters}
              trigger={
                <Button className={cn(toolbarButtonClassName, "gap-1.5")} variant="outline">
                  <ListFilter className="size-4" />
                  Add Filter
                </Button>
              }
            />
            {filters.length > 0 ? (
              <Button
                className={cn(toolbarButtonClassName, "gap-1.5")}
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
