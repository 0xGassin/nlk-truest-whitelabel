"use client";

import type { ColumnDef } from "@/components/ui/data-table";
import type { Filter, FilterFieldConfig } from "@/components/ui/filters";
import type { CloudResource } from "@/types";

import { AlertCircle, ListFilter, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableRefreshButton,
  dataTableToolbarButtonClassName,
  dataTableToolbarInputClassName,
} from "@/components/ui/data-table";
import { Drawer } from "@/components/ui/drawer";
import { Filters } from "@/components/ui/filters";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ViewOptions } from "@/components/ui/view-options";
import { parseApiError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { inventoryService } from "@/services/api";

import { useResources } from "../hooks/use-resources";
import { RESOURCE_TABLE_LAYOUT } from "../lib/resource-table-layout";
import { formatResourceType } from "../lib/resource-type";
import { ResourceDetailsDrawer } from "./resource-details-drawer";
import { ResourceTypeIcon } from "./resource-type-icon";

const resourceColumnLayout = Object.fromEntries(RESOURCE_TABLE_LAYOUT.map((column) => [column.id, column]));

const columns: ColumnDef<CloudResource>[] = [
  {
    align: "center",
    cell: (resource) => (
      <div className="flex items-center justify-center">
        <ResourceTypeIcon className="size-6" type={resource.resource_type} />
      </div>
    ),
    header: "Type",
    id: "type",
    skeletonVariant: resourceColumnLayout.type.skeletonVariant,
    width: "70px",
  },
  {
    cell: (resource) => {
      return (
        <div className="flex flex-col gap-1">
          <span
            className="block truncate text-[14px] leading-5 font-normal text-foreground"
            title={resource.resource_name ?? resource.resource_id}
          >
            {resource.resource_name ?? resource.resource_id}
          </span>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="truncate text-[13px] leading-5 font-normal text-foreground/80">
              {formatResourceType(resource.resource_type, "plural")}
            </span>
          </div>
        </div>
      );
    },
    header: "Name",
    id: "name",
    skeletonVariant: resourceColumnLayout.name.skeletonVariant,
    sortable: true,
    sortValue: (item) => item.resource_name ?? item.resource_id,
    width: "calc(100% - 70px - 38%)",
  },
  {
    cell: (resource) => (
      <span className="rounded border border-border/50 bg-muted/50 px-1.5 py-0.5 font-mono text-xs font-medium text-foreground/90">
        {resource.region || "global"}
      </span>
    ),
    header: "Region",
    id: "region",
    skeletonVariant: resourceColumnLayout.region.skeletonVariant,
    sortable: true,
    width: "20%",
  },
  {
    cell: (resource) => (
      <span className="text-[13px] leading-5 font-normal text-foreground/80">
        {resource.source_type === "iac"
          ? "Infrastructure as Code"
          : resource.source_type === "manual"
            ? "ClickOps"
            : "-"}
      </span>
    ),
    header: "Source",
    id: "source_type",
    skeletonVariant: resourceColumnLayout.source_type.skeletonVariant,
    sortable: true,
    width: "18%",
  },
];

interface ResourcesTableProps {
  connectionId: string;
  connectionName?: null | string;
  organizationId: string;
}

export function ResourcesTable({ connectionId, connectionName, organizationId }: ResourcesTableProps) {
  const [showDefaults, setShowDefaults] = useState(false);
  const { error, fetchResources, isLoading, resources } = useResources(organizationId, connectionId, !showDefaults);

  const [selectedResource, setSelectedResource] = useState<CloudResource | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [metadataError, setMetadataError] = useState<null | string>(null);

  const [filters, setFilters] = useState<Filter[]>([]);

  const resourceTypes = useMemo(() => {
    const types = new Set(resources.map((r) => r.resource_type));
    return [...types].sort();
  }, [resources]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    resources.forEach((r) => {
      counts[r.resource_type] = (counts[r.resource_type] || 0) + 1;
    });
    return counts;
  }, [resources]);

  const filterFields = useMemo<FilterFieldConfig[]>(
    () => [
      {
        key: "type",
        label: "Resource Type",
        operators: [
          { label: "is", value: "is" },
          { label: "is not", value: "is_not" },
        ],
        options: resourceTypes.map((type) => ({
          label: `${formatResourceType(type, "plural")} (${String(typeCounts[type])})`,
          value: type,
        })),
        type: "select",
      },
    ],
    [resourceTypes, typeCounts],
  );

  const handleResourceClick = async (resource: CloudResource) => {
    setSelectedResource(resource);
    setIsDrawerOpen(true);
    setIsLoadingMetadata(true);
    setMetadataError(null);

    try {
      const resourceWithMetadata = await inventoryService.getCloudResourceById(
        organizationId,
        connectionId,
        resource.id,
      );
      setSelectedResource(resourceWithMetadata);
    } catch (error_: unknown) {
      logger.error("Failed to fetch resource metadata", error_);
      const apiError = parseApiError(error_);
      setMetadataError(apiError.message);
    } finally {
      setIsLoadingMetadata(false);
    }
  };

  const filteredResources = useMemo(() => {
    if (filters.length === 0) return resources;
    return resources.filter((r) => {
      return filters.every((filter) => {
        if (filter.field !== "type") return true;
        const value = typeof filter.values[0] === "string" ? filter.values[0] : "";
        const matches = r.resource_type === value;
        return filter.operator === "is_not" ? !matches : matches;
      });
    });
  }, [resources, filters]);

  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <AlertCircle className="size-12 text-destructive" />
        <div className="text-center">
          <h3 className="mb-2 text-lg font-semibold text-foreground">Error</h3>
          <p className="mb-4 text-sm text-foreground">{error}</p>
          <Button
            onClick={() => {
              void fetchResources();
            }}
            variant="outline"
          >
            <RefreshCw className="mr-2 size-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col p-4">
      <DataTable
        actions={
          <DataTableRefreshButton
            className={dataTableToolbarButtonClassName}
            isLoading={isLoading}
            onClick={() => {
              void fetchResources();
            }}
          />
        }
        className="h-full min-h-0"
        columns={columns}
        data={filteredResources}
        extraToolbarContent={
          <div className="flex flex-wrap items-center gap-2.5">
            <Filters
              fields={filterFields}
              filters={filters}
              onChange={setFilters}
              trigger={
                <Button className={cn(dataTableToolbarButtonClassName, "gap-1.5")} variant="outline">
                  <ListFilter className="size-4" />
                  Add Filter
                </Button>
              }
            />
            {filters.length > 0 ? (
              <Button
                className={cn(dataTableToolbarButtonClassName, "gap-1.5")}
                onClick={() => {
                  setFilters([]);
                }}
                variant="outline"
              >
                <ListFilter className="size-4" />
                Clear
              </Button>
            ) : null}
            <ViewOptions buttonClassName={dataTableToolbarButtonClassName}>
              <div
                aria-checked={showDefaults}
                className="flex cursor-pointer items-center justify-between gap-4 rounded-sm px-2 py-1.5 hover:bg-accent"
                onClick={() => {
                  setShowDefaults(!showDefaults);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setShowDefaults(!showDefaults);
                  }
                }}
                role="switch"
                tabIndex={0}
              >
                <Label className="text-sm text-foreground/90" htmlFor="filter-show-defaults">
                  Show defaults
                </Label>
                <Switch checked={showDefaults} id="filter-show-defaults" onCheckedChange={setShowDefaults} />
              </div>
            </ViewOptions>
          </div>
        }
        getRowKey={(r) => r.id}
        isLoading={isLoading}
        keepToolbarWhileLoading
        loadingMessage="Loading resources"
        onRowClick={(resource) => {
          void handleResourceClick(resource);
        }}
        searchKey={(r) => `${String(r.resource_name)} ${r.resource_id}`}
        searchPlaceholder="Search Resources"
        tableClassName="table-fixed w-full"
        toolbarButtonClassName={dataTableToolbarButtonClassName}
        toolbarInputClassName={dataTableToolbarInputClassName}
      />

      <Drawer direction="right" onOpenChange={setIsDrawerOpen} open={isDrawerOpen}>
        <ResourceDetailsDrawer
          connectionId={connectionId}
          connectionName={connectionName}
          isLoadingMetadata={isLoadingMetadata}
          metadataError={metadataError}
          organizationId={organizationId}
          resource={selectedResource}
        />
      </Drawer>
    </div>
  );
}
