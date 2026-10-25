"use client";

import { Check, CircleHelp, ListFilter, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { ColumnDef } from "@/components/ui/data-table";
import {
  DataTable,
  DataTableRefreshButton,
  dataTableToolbarButtonClassName,
  dataTableToolbarInputClassName,
} from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import type { Filter, FilterFieldConfig } from "@/components/ui/filters";
import { Filters } from "@/components/ui/filters";
import { toast } from "@/components/ui/toast/toast";
import { formatTimeAgo } from "@/lib/date-utils";
import { parseApiError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { listCTFindings, setCTFindingReviewed, type CTFinding } from "@/services/api/ctlog";
import { useTheme } from "@/features/settings/context/theme-context";

function SelectionCheckbox({
  checked,
  className,
  label,
  onChange,
}: {
  checked: boolean;
  className?: string;
  label: string;
  onChange: () => void;
}) {
  return (
    <label
      aria-label={label}
      className={cn("inline-flex size-4 shrink-0 cursor-pointer items-center justify-center leading-none", className)}
      onClick={(event) => event.stopPropagation()}
    >
      <input checked={checked} className="peer sr-only" onChange={onChange} type="checkbox" />
      <span className="flex size-4 shrink-0 items-center justify-center rounded-[3px] border border-[#e9e9e9] bg-[#fafafa] text-white leading-none transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[#0033ff]/30 peer-checked:border-[#0033ff] peer-checked:bg-[#0033ff] dark:border-border dark:bg-background">
        {checked ? <Check className="size-3 shrink-0" strokeWidth={3} /> : null}
      </span>
    </label>
  );
}

function issuerName(finding: CTFinding): string {
  return typeof finding.certificate?.issuer === "string" ? finding.certificate.issuer : "—";
}

function firstSeenAt(finding: CTFinding): string {
  return typeof finding.certificate?.first_seen_at === "string" ? finding.certificate.first_seen_at : "";
}

export function CTLogs({
  domainId,
  onUnreviewedCount,
  organizationId,
}: {
  domainId: string;
  onUnreviewedCount?: (count: number) => void;
  organizationId: string;
}) {
  const { highContrastPopups } = useTheme();
  const [findings, setFindings] = useState<CTFinding[]>([]);
  const [filters, setFilters] = useState<Filter[]>([
    { field: "status", id: "ct-logs-default-status", operator: "is", values: ["unreviewed"] },
  ]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const toolbarButtonClassName = cn(dataTableToolbarButtonClassName, "shadow-none");
  const selectionActionClassName = cn(
    toolbarButtonClassName,
    highContrastPopups !== "off" && "!border-[#444] !bg-[#1a1a1a] !text-white hover:!bg-[#333]",
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setFindings(await listCTFindings(organizationId, domainId));
    } catch (error) {
      toast.error("Could not load CT logs", { description: parseApiError(error).message });
    } finally {
      setLoading(false);
    }
  }, [domainId, organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filterFields = useMemo<FilterFieldConfig[]>(
    () => [
      {
        key: "status",
        label: "Status",
        operators: [
          { label: "is", value: "is" },
          { label: "is not", value: "is_not" },
        ],
        options: [
          { label: "Reviewed", value: "reviewed" },
          { label: "Needs review", value: "unreviewed" },
        ],
        type: "select",
      },
      {
        key: "match_type",
        label: "Match type",
        operators: [
          { label: "is", value: "is" },
          { label: "is not", value: "is_not" },
        ],
        options: [...new Set(findings.map((finding) => finding.match_type))].map((value) => ({
          label: (typeof value === "string" ? value : "Unknown match")
            .replaceAll("_", " ")
            .replace(/\b\w/g, (character) => character.toUpperCase()),
          value,
        })),
        type: "select",
      },
      {
        key: "issuer",
        label: "Issuer",
        operators: [
          { label: "contains", value: "contains" },
          { label: "does not contain", value: "not_contains" },
        ],
        type: "text",
      },
      {
        key: "matched_san",
        label: "SAN",
        operators: [
          { label: "contains", value: "contains" },
          { label: "does not contain", value: "not_contains" },
        ],
        type: "text",
      },
    ],
    [findings],
  );

  const visible = useMemo(
    () =>
      findings.filter((finding) =>
        filters.every((filter) => {
          const value = typeof filter.values[0] === "string" ? filter.values[0].toLowerCase() : "";
          if (filter.field === "status") {
            const status = finding.reviewed ? "reviewed" : "unreviewed";
            return filter.operator === "is_not" ? status !== value : status === value;
          }
          if (filter.field === "match_type") {
            const matchType = finding.match_type.toLowerCase();
            return filter.operator === "is_not" ? matchType !== value : matchType === value;
          }
          if (filter.field === "issuer") {
            const issuer = issuerName(finding).toLowerCase();
            return filter.operator === "not_contains" ? !issuer.includes(value) : issuer.includes(value);
          }
          if (filter.field === "matched_san") {
            const san = finding.matched_san.toLowerCase();
            return filter.operator === "not_contains" ? !san.includes(value) : san.includes(value);
          }
          return true;
        }),
      ),
    [findings, filters],
  );

  useEffect(() => {
    const validIds = new Set(findings.map((finding) => finding.id));
    setSelectedIds((current) => new Set([...current].filter((id) => validIds.has(id))));
    onUnreviewedCount?.(findings.filter((finding) => !finding.reviewed).length);
  }, [findings, onUnreviewedCount]);

  const toggleSelection = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      const allSelected = visible.length > 0 && visible.every((finding) => next.has(finding.id));
      visible.forEach((finding) => (allSelected ? next.delete(finding.id) : next.add(finding.id)));
      return next;
    });
  };

  const toggleReviewed = async (finding: CTFinding) => {
    setUpdating(finding.id);
    try {
      await setCTFindingReviewed(organizationId, finding.id, !finding.reviewed);
      setFindings((current) =>
        current.map((item) => (item.id === finding.id ? { ...item, reviewed: !item.reviewed } : item)),
      );
      toast.success(finding.reviewed ? "CT Log Reopened" : "CT Log Reviewed", {
        description: finding.reviewed
          ? `${finding.matched_san} is back in your review queue.`
          : `${finding.matched_san} has been marked as reviewed.`,
      });
    } catch (error) {
      toast.error("Could not update CT log", { description: parseApiError(error).message });
    } finally {
      setUpdating(null);
    }
  };

  const getLogName = (finding: CTFinding) => {
    const names = [
      ...new Set(
        (finding.observations ?? [])
          .map((observation) => observation?.log_name || observation?.log_source)
          .filter(Boolean),
      ),
    ];
    return names.length > 0 ? names.join(", ") : "Unknown CT log";
  };

  const bulkSetReviewed = async (reviewed: boolean) => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setUpdating("bulk");
    try {
      await Promise.all(ids.map((id) => setCTFindingReviewed(organizationId, id, reviewed)));
      setFindings((current) => current.map((item) => (selectedIds.has(item.id) ? { ...item, reviewed } : item)));
      setSelectedIds(new Set());
      toast.success(`${ids.length} CT Log${ids.length === 1 ? "" : "s"} ${reviewed ? "Reviewed" : "Reopened"}`, {
        description: reviewed
          ? "The selected findings have been marked as reviewed."
          : "The selected findings are back in your review queue.",
      });
    } catch (error) {
      toast.error("Could not update CT logs", { description: parseApiError(error).message });
    } finally {
      setUpdating(null);
    }
  };

  const columns = useMemo<ColumnDef<CTFinding>[]>(
    () => [
      {
        align: "center",
        cell: (finding) => (
          <div className="flex h-full items-center justify-center">
            <SelectionCheckbox
              checked={selectedIds.has(finding.id)}
              label={`Select ${finding.matched_san}`}
              onChange={() => toggleSelection(finding.id)}
            />
          </div>
        ),
        header: (
          <SelectionCheckbox
            checked={visible.length > 0 && visible.every((finding) => selectedIds.has(finding.id))}
            className="translate-y-[2px]"
            label="Select all CT logs"
            onChange={toggleAll}
          />
        ),
        id: "select",
        sortable: false,
        width: "44px",
      },
      {
        cell: (finding) => (
          <span className="block truncate text-[14px] font-normal" title={finding.matched_san}>
            {finding.matched_san}
          </span>
        ),
        header: "Matched SAN",
        id: "matched_san",
        sortable: true,
        sortValue: (finding) => finding.matched_san,
        width: "2fr",
      },
      {
        cell: (finding) => <span className="text-[14px] font-normal capitalize">{finding.match_type}</span>,
        header: "Match type",
        id: "match_type",
        sortable: true,
        sortValue: (finding) => finding.match_type,
        width: "1fr",
      },
      {
        cell: (finding) => (
          <span className="block truncate text-[14px] font-normal" title={getLogName(finding)}>
            {getLogName(finding)}
          </span>
        ),
        header: "CT log",
        id: "ct_log",
        sortable: true,
        sortValue: (finding) => getLogName(finding),
        width: "2fr",
      },
      {
        cell: (finding) => (
          <span className="block truncate text-[14px] font-normal text-foreground" title={issuerName(finding)}>
            {issuerName(finding)}
          </span>
        ),
        header: "Issuer",
        id: "issuer",
        sortable: true,
        sortValue: issuerName,
        width: "2fr",
      },
      {
        cell: (finding) => (
          <span className="whitespace-nowrap text-[14px] font-normal text-foreground">
            {firstSeenAt(finding) ? formatTimeAgo(firstSeenAt(finding)) : "—"}
          </span>
        ),
        header: "First seen",
        id: "first_seen",
        sortable: true,
        sortValue: firstSeenAt,
        width: "1fr",
      },
      {
        cell: (finding) => (
          <span className="text-[14px] font-normal">{finding.reviewed ? "Reviewed" : "Needs review"}</span>
        ),
        header: "Status",
        id: "status",
        sortable: true,
        sortValue: (finding) => (finding.reviewed ? "Reviewed" : "Needs review"),
        width: "1fr",
      },
      {
        align: "right",
        cell: (finding) => (
          <Button
            aria-label={finding.reviewed ? "Reopen CT log" : "Review CT log"}
            className="group size-8"
            disabled={updating !== null}
            onClick={(event) => {
              event.stopPropagation();
              void toggleReviewed(finding);
            }}
            size="sm"
            variant="ghost"
          >
            {finding.reviewed ? (
              <>
                <Check className="size-4 text-emerald-600 transition-opacity group-hover:hidden" />
                <Undo2 className="hidden size-4 text-muted-foreground group-hover:block" />
              </>
            ) : (
              <CircleHelp className="size-4" />
            )}
          </Button>
        ),
        header: "Actions",
        id: "actions",
        sortable: false,
        width: "72px",
      },
    ],
    [selectedIds, updating, visible],
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <DataTable
        actions={
          <DataTableRefreshButton className={toolbarButtonClassName} isLoading={loading} onClick={() => void load()} />
        }
        columns={columns}
        data={visible}
        defaultPageSize={25}
        emptyMessage="No CT logs found."
        emptyTitle="No CT logs"
        footerClassName="h-9 border-t border-border/70 bg-[#fafafa] px-3 text-[14px] font-normal dark:bg-[#2f2f2f]"
        getRowKey={(finding) => finding.id}
        className="h-full min-h-0"
        isLoading={loading}
        onRowClick={(finding) => toggleSelection(finding.id)}
        rowClassName={(finding) =>
          selectedIds.has(finding.id)
            ? "bg-[#eef4ff] hover:bg-[#e5efff] dark:bg-blue-950/30 dark:hover:bg-blue-950/40"
            : ""
        }
        searchKey={(finding) => `${finding.matched_san} ${finding.match_type} ${issuerName(finding)}`}
        searchPlaceholder="Search CT Logs"
        showHeaderColumnSeparators={false}
        tableCellClassName="border-border/70 px-4 py-2 align-middle"
        tableContainerClassName="rounded-lg border border-border bg-card"
        tableHeaderCellClassName="h-9 border-r border-border/70 px-3 text-[14px] font-normal last:border-r-0"
        tableHeaderClassName="!bg-[#fafafa] dark:!bg-card"
        tableClassName="table-fixed w-full"
        tableRowClassName="h-12 w-full bg-card text-foreground font-normal hover:bg-muted/30"
        toolbarInputClassName={dataTableToolbarInputClassName}
        toolbarButtonClassName={toolbarButtonClassName}
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
      <div
        className={cn(
          "pointer-events-none absolute bottom-10 left-1/2 z-20 -translate-x-1/2 translate-y-2 opacity-0 transition-all duration-200",
          selectedIds.size > 0 && "pointer-events-auto translate-y-0 opacity-100",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg border border-border bg-card/95 px-3 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.16)] backdrop-blur-sm",
            highContrastPopups !== "off" && "border-[#262626] bg-black text-white",
          )}
        >
          <span
            className={cn(
              "whitespace-nowrap text-sm text-muted-foreground",
              highContrastPopups !== "off" && "text-white/70",
            )}
          >
            {selectedIds.size} selected
          </span>
          <Button
            className={selectionActionClassName}
            disabled={updating !== null}
            onClick={() => void bulkSetReviewed(true)}
            size="sm"
            variant="outline"
          >
            Review
          </Button>
          <Button
            className={selectionActionClassName}
            disabled={updating !== null}
            onClick={() => void bulkSetReviewed(false)}
            size="sm"
            variant="outline"
          >
            Unreview
          </Button>
        </div>
      </div>
    </div>
  );
}
