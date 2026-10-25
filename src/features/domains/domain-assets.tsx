"use client";

import type { ColumnDef } from "@/components/ui/data-table";

import { Boxes } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DataTable,
  DataTableRefreshButton,
  dataTableToolbarButtonClassName,
  dataTableToolbarInputClassName,
} from "@/components/ui/data-table";
import { toast } from "@/components/ui/toast/toast";
import { parseApiError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { listDomainAssets, type DomainAsset } from "@/services/api/domains";

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function formatAssetType(value?: string, source?: string): string {
  const normalized = typeof value === "string" ? value : "";
  const typeKey = normalized.trim().toLowerCase().replaceAll(/[ -]/g, "_");
  const sourceKey = typeof source === "string" ? source.trim().toLowerCase().replaceAll(/[ -]/g, "_") : "";
  if (typeKey === "wayback_url" || (typeKey === "url" && sourceKey === "wayback")) return "URL (Wayback)";
  return normalized
    ? normalized
        .replaceAll("_", " ")
        .replaceAll(/\b\w/g, (character) => character.toUpperCase())
        .replaceAll(/\bUrl\b/g, "URL")
    : "Unknown asset";
}

function assetSearchValue(asset: DomainAsset): string {
  return [asset.type, asset.value, asset.source, JSON.stringify(asset.attrs ?? {})].join(" ");
}

export function DomainAssets({
  className,
  domainId,
  organizationId,
}: {
  className?: string;
  domainId: string;
  organizationId: string;
}) {
  const [assets, setAssets] = useState<DomainAsset[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const nextAssets = await listDomainAssets(organizationId, domainId);
      setAssets(nextAssets);
    } catch (error) {
      toast.error("Could not load asset inventory", { description: parseApiError(error).message });
    } finally {
      setLoading(false);
    }
  }, [domainId, organizationId]);

  useEffect(() => {
    // The request synchronizes this component with the API; the lint rule cannot distinguish that from a synchronous update.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const columns = useMemo<ColumnDef<DomainAsset>[]>(
    () => [
      {
        cell: (asset) => <span className="text-[14px] font-normal">{formatAssetType(asset.type, asset.source)}</span>,
        header: "Asset type",
        id: "type",
        sortable: true,
        sortValue: (asset) => asset.type,
        width: "1fr",
      },
      {
        cell: (asset) => (
          <span className="block truncate text-[14px] font-normal" title={asset.value}>
            {asset.value}
          </span>
        ),
        header: "Asset",
        id: "value",
        sortable: true,
        sortValue: (asset) => asset.value,
        width: "2.4fr",
      },
      {
        cell: (asset) => (
          <span className="whitespace-nowrap text-[14px] font-normal">{formatDate(asset.first_seen_at)}</span>
        ),
        header: "First seen",
        id: "first_seen_at",
        sortable: true,
        sortValue: (asset) => asset.first_seen_at,
        width: "1.2fr",
      },
      {
        cell: (asset) => (
          <span className="whitespace-nowrap text-[14px] font-normal">{formatDate(asset.last_seen_at)}</span>
        ),
        header: "Last seen",
        id: "last_seen_at",
        sortable: true,
        sortValue: (asset) => asset.last_seen_at,
        width: "1.2fr",
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
        data={assets}
        defaultPageSize={25}
        emptyIcon={Boxes}
        emptyMessage="No assets have been discovered for this domain yet."
        emptyTitle="No assets"
        footerClassName="h-9 border-t border-border/70 bg-[#fafafa] px-3 text-[14px] font-normal dark:bg-[#2f2f2f]"
        getRowKey={(asset) => asset.id}
        isLoading={loading}
        searchKey={assetSearchValue}
        searchPlaceholder="Search Assets"
        showHeaderColumnSeparators={false}
        tableCellClassName="border-border/70 px-4 py-2 align-middle"
        tableClassName="table-fixed w-full"
        tableContainerClassName="rounded-lg border border-border bg-card"
        tableHeaderCellClassName="h-9 border-r border-border/70 px-3 text-[14px] font-normal last:border-r-0"
        tableHeaderClassName="!bg-[#fafafa] dark:!bg-card"
        tableRowClassName="h-12 w-full bg-card text-foreground font-normal hover:bg-muted/30"
        toolbarButtonClassName={toolbarButtonClassName}
        toolbarInputClassName={dataTableToolbarInputClassName}
      />
    </div>
  );
}
