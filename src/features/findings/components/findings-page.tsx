"use client";

import type { ColumnDef } from "@/components/ui/data-table";
import type { Filter, FilterFieldConfig } from "@/components/ui/filters";

import { Check, CircleHelp, ListFilter, Undo2, XIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DataTable,
  DataTableRefreshButton,
  dataTableToolbarButtonClassName,
  dataTableToolbarInputClassName,
} from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerTitle } from "@/components/ui/drawer";
import { Filters } from "@/components/ui/filters";
import { getSeverityPillClassName, getSeverityPillLabel } from "@/components/ui/severity-badge";
import { toast } from "@/components/ui/toast/toast";
import { useAuth } from "@/lib/auth";
import { getOrganizationId } from "@/lib/organization";
import { cn } from "@/lib/utils";
import { formatDetailLabel } from "@/lib/detail-label";
import { getFindingRemediation } from "@/lib/finding-remediation";
import { ghostButton } from "@/lib/surfaces";
import {
  CredentialFields,
  findingBreaches,
  findingCredentials,
  formatBreachDate,
} from "@/features/domain-discoveries/breach-details";
import {
  listAllOrganizationFindings,
  listAllDomainFindings,
  type OrganizationFinding,
  updateOrganizationFindingStatus,
} from "@/services/api/domains";
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

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function formatDetailValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.map(formatDetailValue).join(", ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key.toLowerCase() !== "provider")
      .map(([key, item]) => `${formatDetailLabel(key)}: ${formatDetailValue(item)}`)
      .join(", ");
  }
  return String(value);
}

function formatReasonValue(value: unknown) {
  const formatted = formatDetailValue(value)
    .replace(/[_\s]+/g, " ")
    .trim();
  return formatted ? formatted.charAt(0).toUpperCase() + formatted.slice(1) : formatted;
}

function formatModule(module: string) {
  const normalized = module
    .trim()
    .toLowerCase()
    .replace(/[-_\s]+/g, "");
  if (["header", "headers", "httpheader", "httpheaders", "secheader", "secheaders"].includes(normalized)) {
    return "Headers";
  }
  if (normalized === "dns") return "DNS";
  if (normalized === "nmap") return "Nmap";
  if (normalized === "tlsscan") return "TLS";
  if (["vulnmatch", "vulnerability", "vulnerabilities"].includes(normalized)) return "Vulnerabilities";
  if (normalized === "breachcreds") return "Breaches";
  return module.charAt(0).toUpperCase() + module.slice(1);
}

function findingAssetLabel(finding: OrganizationFinding): string {
  if (finding.module.toLowerCase() === "vulnmatch") {
    return finding.root_domain ?? finding.domain_id;
  }

  return finding.asset_value ?? finding.root_domain ?? "Domain";
}

function severitySortValue(severity: string) {
  return { critical: 4, high: 3, medium: 2, low: 1, info: 0 }[severity.toLowerCase()] ?? -1;
}

function SeverityChip({ severity }: { severity: string }) {
  return (
    <Badge className={cn("px-1.5 text-[14px] font-normal", getSeverityPillClassName(severity))} variant="outline">
      {getSeverityPillLabel(severity)}
    </Badge>
  );
}

function BreachFindingDetails({ findingId, details }: { details: OrganizationFinding["details"]; findingId: string }) {
  const [revealedPasswords, setRevealedPasswords] = useState<Set<string>>(() => new Set());
  const breaches = findingBreaches(details);
  const credentials = findingCredentials(details);
  const credentialsWithoutSource = credentials.map((credential) =>
    Object.fromEntries(Object.entries(credential).filter(([key]) => key.toLowerCase() !== "source")),
  );
  const breachFields = breaches.flatMap((breach) => [
    ["Source", breach.name],
    ...(breach.date ? [["Date", formatBreachDate(breach.date) ?? breach.date]] : []),
    ...(breach.domain ? [["Domain", breach.domain]] : []),
    ...(breach.description ? [["Breach details", breach.description]] : []),
    ...(breach.dataClasses && breach.dataClasses.length > 0
      ? [["Compromised data", breach.dataClasses.join(", ")]]
      : []),
  ]);

  return (
    <>
      {breachFields.length > 0 ? (
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {breachFields.map(([label, value], index) => (
            <div className="min-w-0" key={`${label}-${String(index)}`}>
              <p className="text-[13px] text-muted-foreground">{label}</p>
              <p className="mt-0.5 break-words text-[14px] text-foreground">{value}</p>
            </div>
          ))}
        </div>
      ) : null}
      {credentials.length > 0 ? (
        <div className="space-y-4">
          <p className="text-[13px] text-muted-foreground">Credentials</p>
          <CredentialFields
            credentials={credentialsWithoutSource}
            fieldPrefix={`${findingId}-credentials`}
            isRevealed={(fieldId) => revealedPasswords.has(fieldId)}
            onTogglePassword={(fieldId) => {
              setRevealedPasswords((current) => {
                const next = new Set(current);
                if (next.has(fieldId)) next.delete(fieldId);
                else next.add(fieldId);
                return next;
              });
            }}
          />
        </div>
      ) : null}
    </>
  );
}

export function FindingsPage({ domainId, embedded = false }: { domainId?: string; embedded?: boolean }) {
  const { highContrastPopups } = useTheme();
  const { user } = useAuth();
  const organizationId = getOrganizationId(user) ?? "";
  const [findings, setFindings] = useState<OrganizationFinding[]>([]);
  const [filters, setFilters] = useState<Filter[]>([
    { field: "status", id: "findings-default-status", operator: "is", values: ["open"] },
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<null | string>(null);
  const [updating, setUpdating] = useState<null | string>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [selectedFinding, setSelectedFinding] = useState<OrganizationFinding | null>(null);
  const toolbarButtonClassName = cn(dataTableToolbarButtonClassName, "shadow-none");
  const selectionActionClassName = cn(
    toolbarButtonClassName,
    highContrastPopups !== "off" && "!border-[#444] !bg-[#1a1a1a] !text-white hover:!bg-[#333]",
  );

  const load = useCallback(async () => {
    if (!organizationId) {
      setFindings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = domainId
        ? await listAllDomainFindings(organizationId, domainId)
        : await listAllOrganizationFindings(organizationId);
      setFindings(result.findings);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load findings");
      toast.error("Could not load findings", {
        description: loadError instanceof Error ? loadError.message : undefined,
      });
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
        options: ["open", "reviewed", "resolved"].map((value) => ({
          label: value.charAt(0).toUpperCase() + value.slice(1),
          value,
        })),
        type: "select",
      },
      {
        key: "severity",
        label: "Severity",
        options: ["critical", "high", "medium", "low", "info"].map((value) => ({
          label: value.charAt(0).toUpperCase() + value.slice(1),
          value,
        })),
        type: "select",
      },
      {
        key: "module",
        label: "Module",
        options: [...new Set(findings.map((finding) => finding.module))]
          .sort()
          .map((value) => ({ label: formatModule(value), value })),
        type: "select",
      },
      ...(domainId
        ? []
        : [
            {
              key: "domain",
              label: "Domain",
              options: [
                ...new Set(
                  findings.map((finding) => finding.root_domain).filter((value): value is string => Boolean(value)),
                ),
              ]
                .sort()
                .map((value) => ({ label: value, value })),
              type: "select" as const,
            },
          ]),
    ],
    [domainId, findings],
  );

  const visible = useMemo(
    () =>
      findings.filter((finding) =>
        filters.every((filter) => {
          const selected = filter.values.map(String);
          if (selected.length === 0) return true;
          const value =
            filter.field === "severity"
              ? finding.severity
              : filter.field === "module"
                ? finding.module
                : filter.field === "domain"
                  ? (finding.root_domain ?? "")
                  : finding.status;
          const matches = selected.includes(value);
          return filter.operator === "is_not" || filter.operator === "is_not_any_of" ? !matches : matches;
        }),
      ),
    [findings, filters],
  );

  useEffect(() => {
    const validIds = new Set(findings.map((finding) => finding.id));
    setSelectedIds((current) => new Set([...current].filter((id) => validIds.has(id))));
  }, [findings]);

  const toggleSelection = (id: string) =>
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelectedIds((current) => {
      const next = new Set(current);
      const allSelected = visible.length > 0 && visible.every((finding) => current.has(finding.id));
      visible.forEach((finding) => (allSelected ? next.delete(finding.id) : next.add(finding.id)));
      return next;
    });

  const updateStatus = async (finding: OrganizationFinding, nextStatus: "open" | "reviewed") => {
    setUpdating(finding.id);
    try {
      await updateOrganizationFindingStatus(organizationId, finding.domain_id, finding.id, nextStatus);
      setFindings((current) =>
        current.map((item) => (item.id === finding.id ? { ...item, status: nextStatus } : item)),
      );
      setSelectedFinding((current) => (current?.id === finding.id ? { ...current, status: nextStatus } : current));
      toast.success(nextStatus === "reviewed" ? "Finding reviewed" : "Finding reopened");
    } catch (updateError) {
      toast.error("Could not update finding", {
        description: updateError instanceof Error ? updateError.message : undefined,
      });
    } finally {
      setUpdating(null);
    }
  };

  const bulkUpdate = async (nextStatus: "open" | "reviewed") => {
    const selected = findings.filter(
      (finding) => selectedIds.has(finding.id) && (finding.status === "open" || finding.status === "reviewed"),
    );
    if (selected.length === 0) return;
    setUpdating("bulk");
    try {
      await Promise.all(
        selected.map((finding) =>
          updateOrganizationFindingStatus(organizationId, finding.domain_id, finding.id, nextStatus),
        ),
      );
      setFindings((current) =>
        current.map((finding) => (selectedIds.has(finding.id) ? { ...finding, status: nextStatus } : finding)),
      );
      setSelectedIds(new Set());
      toast.success(
        `${selected.length} finding${selected.length === 1 ? "" : "s"} ${nextStatus === "reviewed" ? "reviewed" : "reopened"}`,
      );
    } catch (updateError) {
      toast.error("Could not update selected findings", {
        description: updateError instanceof Error ? updateError.message : undefined,
      });
    } finally {
      setUpdating(null);
    }
  };

  const columns = useMemo<ColumnDef<OrganizationFinding>[]>(
    () => [
      {
        align: "center",
        cell: (finding) => (
          <div className="flex h-full items-center justify-center">
            <SelectionCheckbox
              checked={selectedIds.has(finding.id)}
              label={`Select ${finding.title}`}
              onChange={() => toggleSelection(finding.id)}
            />
          </div>
        ),
        header: (
          <SelectionCheckbox
            checked={visible.length > 0 && visible.every((finding) => selectedIds.has(finding.id))}
            label="Select all findings"
            onChange={toggleAll}
          />
        ),
        id: "select",
        sortable: false,
        width: "44px",
      },
      {
        cell: (finding) => (
          <span className="block truncate text-[14px] font-normal" title={finding.title}>
            {finding.title}
          </span>
        ),
        header: "Finding",
        id: "title",
        sortable: true,
        sortValue: (finding) => finding.title,
        width: "2.3fr",
      },
      {
        cell: (finding) => (
          <span className="block truncate text-[14px] font-normal" title={findingAssetLabel(finding)}>
            {findingAssetLabel(finding)}
          </span>
        ),
        header: "Asset",
        id: "asset",
        sortable: true,
        sortValue: findingAssetLabel,
        width: "1.7fr",
      },
      {
        cell: (finding) => (
          <span className="block truncate text-[14px] font-normal" title={finding.module}>
            {formatModule(finding.module)}
          </span>
        ),
        header: "Module",
        id: "module",
        sortable: true,
        sortValue: (finding) => finding.module,
        width: "1.2fr",
      },
      {
        cell: (finding) => <SeverityChip severity={finding.severity} />,
        header: "Severity",
        id: "severity",
        sortable: true,
        sortValue: (finding) => severitySortValue(finding.severity),
        width: "1fr",
      },
      {
        cell: (finding) => (
          <Badge
            className="border-transparent bg-muted/50 px-1.5 text-[14px] font-normal text-muted-foreground"
            variant="secondary"
          >
            {finding.status.charAt(0).toUpperCase() + finding.status.slice(1)}
          </Badge>
        ),
        header: "Status",
        id: "status",
        sortable: true,
        sortValue: (finding) => finding.status,
        width: "1fr",
      },
      {
        cell: (finding) => (
          <span className="whitespace-nowrap text-[14px] font-normal">{formatDate(finding.last_seen_at)}</span>
        ),
        header: "Last seen",
        id: "last_seen_at",
        sortable: true,
        sortValue: (finding) => finding.last_seen_at,
        width: "1.1fr",
      },
      {
        align: "right",
        cell: (finding) => (
          <Button
            aria-label={finding.status === "reviewed" ? "Reopen finding" : "Review finding"}
            className="group size-8"
            disabled={updating !== null || finding.status === "resolved"}
            onClick={(event) => {
              event.stopPropagation();
              void updateStatus(finding, finding.status === "reviewed" ? "open" : "reviewed");
            }}
            size="sm"
            variant="ghost"
          >
            {finding.status === "reviewed" ? (
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
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden p-4", embedded && "p-0")}>
      <div className="min-h-0 flex-1">
        {error ? (
          <div className="flex h-full items-center justify-center text-sm text-destructive">{error}</div>
        ) : (
          <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
            <DataTable
              actions={
                <DataTableRefreshButton
                  className={toolbarButtonClassName}
                  isLoading={loading}
                  onClick={() => void load()}
                />
              }
              className="h-full min-h-0"
              columns={columns}
              data={visible}
              defaultSort={{ direction: "desc", key: "severity" }}
              defaultPageSize={25}
              emptyMessage="No findings match the selected filters."
              emptyTitle="No findings"
              footerClassName="h-9 border-t border-border/70 bg-[#fafafa] px-3 text-[14px] font-normal dark:bg-[#2f2f2f]"
              getRowKey={(finding) => finding.id}
              isLoading={loading}
              onRowClick={setSelectedFinding}
              rowClassName={(finding) =>
                selectedIds.has(finding.id)
                  ? "bg-[#eef4ff] hover:bg-[#e5efff] dark:bg-blue-950/30 dark:hover:bg-blue-950/40"
                  : ""
              }
              searchKey={(finding) =>
                `${finding.title} ${finding.type} ${finding.module} ${finding.asset_value ?? ""} ${finding.root_domain ?? ""} ${JSON.stringify(finding.details ?? {})}`
              }
              searchPlaceholder="Search Findings"
              showHeaderColumnSeparators={false}
              showScrollShadow={false}
              tableCellClassName="border-border/70 px-4 py-2 align-middle"
              tableContainerClassName="rounded-lg border border-border bg-card"
              tableHeaderCellClassName="h-9 border-r border-border/70 px-3 text-[14px] font-normal last:border-r-0"
              tableHeaderClassName="!bg-[#fafafa] dark:!bg-card"
              tableClassName="table-fixed w-full"
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
            <Drawer onOpenChange={(open) => !open && setSelectedFinding(null)} open={selectedFinding !== null}>
              {selectedFinding ? (
                <FindingDetails
                  finding={selectedFinding}
                  onStatusUpdate={(nextStatus) => {
                    void updateStatus(selectedFinding, nextStatus);
                  }}
                />
              ) : null}
            </Drawer>
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
                <span className="whitespace-nowrap text-sm text-muted-foreground">{selectedIds.size} selected</span>
                <Button
                  className={selectionActionClassName}
                  disabled={updating !== null}
                  onClick={() => void bulkUpdate("reviewed")}
                  size="sm"
                  variant="outline"
                >
                  Review
                </Button>
                <Button
                  className={selectionActionClassName}
                  disabled={updating !== null}
                  onClick={() => void bulkUpdate("open")}
                  size="sm"
                  variant="outline"
                >
                  Reopen
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FindingDetails({
  finding,
  onStatusUpdate,
}: {
  finding: OrganizationFinding;
  onStatusUpdate: (status: "open" | "reviewed") => void;
}) {
  const isBreachCredentialFinding =
    finding.module.toLowerCase() === "breachcreds" || finding.type.toLowerCase() === "breached_credentials";
  const reasonEntry = Object.entries(finding.details ?? {}).find(([key]) => key.toLowerCase() === "reason");
  const remediation = getFindingRemediation(finding.details, finding.remediation);
  const detailEntries = Object.entries(finding.details ?? {}).filter(
    ([key]) =>
      !["check", "host", "reason", "remediation"].includes(key.toLowerCase()) &&
      !(
        isBreachCredentialFinding &&
        [
          "breaches",
          "breach_details",
          "credentials",
          "hashed_credentials",
          "plaintext_credentials",
          "providers",
        ].includes(key.toLowerCase())
      ) &&
      !(formatModule(finding.module) === "DNS" && key.toLowerCase() === "domain"),
  );
  const overviewFields = [
    ["Issue", finding.title],
    ["Status", finding.status.charAt(0).toUpperCase() + finding.status.slice(1)],
    ["Domain", finding.root_domain ?? finding.domain_id],
    ["Asset", findingAssetLabel(finding)],
    ["Asset type", finding.asset_type ?? "—"],
    ["First seen", formatDate(finding.first_seen_at)],
    ["Last seen", formatDate(finding.last_seen_at)],
  ];
  return (
    <DrawerContent
      className="w-[min(48rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] overflow-hidden rounded-l-[1rem] border-[#eaeaea] bg-[#fdfdfd] p-0 shadow-[0_1.5px_5px_rgba(0,0,0,0.03),0_0.5px_1.5px_rgba(0,0,0,0.025)] dark:border-border dark:bg-card sm:max-w-[48rem]"
      side="right"
    >
      <DrawerClose className={cn(ghostButton, "absolute top-3 right-3 z-10 size-7")}>
        <XIcon className="size-5" />
        <span className="sr-only">Close</span>
      </DrawerClose>
      <div className="shrink-0 border-b border-[#eaeaea] px-5 pb-4 pt-5 dark:border-border">
        <div className="flex min-w-0 items-center gap-3 pr-10">
          <DrawerTitle className="min-w-0 flex-1 truncate text-[17.5px] leading-6 font-semibold tracking-[-0.4px] text-foreground">
            {finding.title}
          </DrawerTitle>
          <SeverityChip severity={finding.severity} />
        </div>
        <p className="mt-1 text-[13px] text-muted-foreground">{formatModule(finding.module)}</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-3">
          {overviewFields.map(([label, value]) => (
            <div className={cn("min-w-0", label === "Issue" && "sm:col-span-3")} key={label}>
              <p className="text-[13px] text-muted-foreground">{label}</p>
              <p
                className={cn("mt-0.5 text-[14px] text-foreground", label === "Issue" ? "break-words" : "truncate")}
                title={value}
              >
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="-mx-5 mt-6 border-t border-[#eaeaea] px-5 pt-5 dark:border-border">
          <div className="space-y-5">
            <p className="text-[13px] text-muted-foreground">Details</p>
            {reasonEntry ? (
              <p className="break-words text-[14px] leading-5 text-foreground">{formatReasonValue(reasonEntry[1])}</p>
            ) : null}
            {isBreachCredentialFinding ? (
              <BreachFindingDetails details={finding.details} findingId={finding.id} />
            ) : null}
            {detailEntries.length > 0 ? (
              <div className="grid gap-x-8 gap-y-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                {detailEntries.map(([key, value]) => (
                  <div className="min-w-0" key={key}>
                    <p className="text-[13px] text-muted-foreground">{formatDetailLabel(key)}</p>
                    <p className="mt-0.5 break-words text-[14px] text-foreground">{formatDetailValue(value)}</p>
                  </div>
                ))}
              </div>
            ) : isBreachCredentialFinding || reasonEntry || remediation ? null : (
              <p className="text-[14px] text-muted-foreground">No additional details.</p>
            )}
            {remediation ? (
              <div className="-mx-5 space-y-2 border-t border-[#eaeaea] px-5 pt-5 dark:border-border">
                <p className="text-[13px] text-muted-foreground">Remediation</p>
                <p className="break-words whitespace-pre-wrap text-[14px] leading-5 text-foreground">{remediation}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <DrawerFooter className="shrink-0 flex-row items-center justify-end gap-4 border-t border-[#eaeaea] bg-[#fafafa] px-5 py-3 dark:border-border dark:bg-card">
        {finding.status === "open" || finding.status === "reviewed" ? (
          <Button
            onClick={() => onStatusUpdate(finding.status === "open" ? "reviewed" : "open")}
            size="sm"
            variant="outline"
          >
            {finding.status === "open" ? "Mark reviewed" : "Reopen finding"}
          </Button>
        ) : null}
      </DrawerFooter>
    </DrawerContent>
  );
}
