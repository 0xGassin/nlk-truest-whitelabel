"use client";

import type { ColumnDef } from "@/components/ui/data-table";
import type { DomainLookalike } from "@/types";

import { ListFilter, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { PageTableSkeleton } from "@/components/page-loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableRefreshButton,
  dataTableToolbarButtonClassName,
  dataTableToolbarInputClassName,
} from "@/components/ui/data-table";
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerTitle } from "@/components/ui/drawer";
import type { Filter, FilterFieldConfig } from "@/components/ui/filters";
import { Filters } from "@/components/ui/filters";
import { toast } from "@/components/ui/toast/toast";
import { useAuth } from "@/lib/auth";
import { parseApiError } from "@/lib/errors";
import { formatDetailLabel } from "@/lib/detail-label";
import { cn } from "@/lib/utils";
import { getOrganizationId } from "@/lib/organization";
import { ghostButton } from "@/lib/surfaces";
import {
  breachConnectorStyle,
  credentialsForBreach,
  credentialsNotMappedToBreaches,
  emailBreaches,
  explainBreach,
  findingBreaches,
  findingCount,
  findingCredentials,
  formatBreachDate,
  formatBreachStepDate,
  formatDetailValue,
  mergeBreaches,
  CredentialFields,
  type DiscoveryBreach,
} from "./breach-details";
import {
  listAllDomainFindings,
  listDomains,
  listEmails,
  listLookalikes,
  listSubdomains,
  type DomainEmail,
} from "@/services/api/domains";

type DiscoveryKind = "emails" | "lookalikes" | "subdomains";
type DiscoveryDomain = { id: string; root_domain: string };

interface DiscoveryRow {
  attrs?: Record<string, unknown> | null;
  breaches: DiscoveryBreach[];
  credentials: Record<string, unknown>[];
  domain: string;
  hashedCredentials: number;
  id: string;
  plaintextCredentials: number;
  result: string;
  severity?: string;
  status?: string;
  source?: string;
}

function matchesFilter(value: string, filter: Filter): boolean {
  const normalized = value.trim().toLowerCase();
  const query = String(filter.values[0] ?? "")
    .trim()
    .toLowerCase();

  switch (filter.operator) {
    case "is":
      return normalized === query;
    case "is_not":
      return normalized !== query;
    case "not_contains":
      return !normalized.includes(query);
    case "starts_with":
      return normalized.startsWith(query);
    case "ends_with":
      return normalized.endsWith(query);
    case "empty":
      return normalized.length === 0;
    case "not_empty":
      return normalized.length > 0;
    default:
      return normalized.includes(query);
  }
}

function EmailBreachTags({ breaches }: { breaches: DiscoveryBreach[] }) {
  const [visibleCount, setVisibleCount] = useState(breaches.length);
  const containerRef = useRef<HTMLDivElement>(null);
  const measurementRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measurement = measurementRef.current;
    if (!container || !measurement) return;

    const measure = () => {
      const availableWidth = container.clientWidth - 4;
      const chipWidths = Array.from(
        measurement.querySelectorAll<HTMLElement>("[data-breach-chip]"),
        (element) => element.offsetWidth,
      );
      if (availableWidth <= 0 || chipWidths.length === 0) return;

      const countWidths = new Map<number, number>();
      for (const element of measurement.querySelectorAll<HTMLElement>("[data-breach-count]")) {
        const count = Number(element.dataset.breachCount);
        if (Number.isFinite(count)) countWidths.set(count, element.offsetWidth);
      }

      const gap = 6;
      const widthFor = (chipCount: number) => {
        const remaining = breaches.length - chipCount;
        const countWidth = remaining > 0 ? (countWidths.get(remaining) ?? 0) : 0;
        const itemCount = chipCount + (remaining > 0 ? 1 : 0);

        return (
          chipWidths.slice(0, chipCount).reduce((total, width) => total + width, 0) +
          Math.max(0, itemCount - 1) * gap +
          countWidth
        );
      };

      const nextVisibleCount =
        widthFor(breaches.length) <= availableWidth
          ? breaches.length
          : (Array.from({ length: breaches.length }, (_, index) => breaches.length - index - 1).find(
              (chipCount) => widthFor(chipCount) <= availableWidth,
            ) ?? 0);

      setVisibleCount((current) => (current === nextVisibleCount ? current : nextVisibleCount));
    };

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [breaches]);

  const remainingCount = breaches.length - visibleCount;

  return (
    <div
      className="relative flex min-w-0 flex-wrap items-center gap-1.5 pr-1"
      ref={containerRef}
      title={breaches.map((breach) => breach.name).join(", ")}
    >
      {breaches.slice(0, visibleCount).map((breach) => (
        <Badge
          className="max-w-full shrink-0 whitespace-normal break-words px-1.5 text-[13px] font-normal"
          key={breach.name}
          variant="outline"
        >
          {breach.name}
        </Badge>
      ))}
      {remainingCount > 0 ? (
        <Badge className="shrink-0 px-1.5 text-[13px] font-normal" variant="outline">
          +{remainingCount}
        </Badge>
      ) : null}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -z-10 flex w-max flex-nowrap gap-1.5 opacity-0"
        ref={measurementRef}
      >
        {breaches.map((breach) => (
          <Badge
            className="max-w-none shrink-0 whitespace-nowrap px-1.5 text-[13px] font-normal"
            data-breach-chip="true"
            key={`measure-${breach.name}`}
            variant="outline"
          >
            {breach.name}
          </Badge>
        ))}
        {Array.from({ length: breaches.length }, (_, index) => index + 1).map((count) => (
          <Badge
            className="shrink-0 px-1.5 text-[13px] font-normal"
            data-breach-count={count}
            key={`measure-count-${String(count)}`}
            variant="outline"
          >
            +{count}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export function DiscoveryPage({
  domainId,
  domainName,
  embedded = false,
  kind,
}: {
  domainId?: string;
  domainName?: string;
  embedded?: boolean;
  kind: DiscoveryKind;
}) {
  const { user } = useAuth();
  const organizationId = getOrganizationId(user);
  const [domains, setDomains] = useState<DiscoveryDomain[]>([]);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [rows, setRows] = useState<DiscoveryRow[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<DiscoveryRow | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!organizationId) {
      setDomains([]);
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const nextDomains = domainId
        ? [{ id: domainId, root_domain: domainName ?? "This domain" }]
        : (await listDomains(organizationId)).filter((domain) => domain.active);
      const entries = await Promise.all(
        nextDomains.map(async (domain) => ({
          breachFindings:
            kind === "emails"
              ? (await listAllDomainFindings(organizationId, domain.id, { type: "breached_credentials" })).findings
              : [],
          domain,
          values:
            kind === "subdomains"
              ? await listSubdomains(organizationId, domain.id)
              : kind === "emails"
                ? await listEmails(organizationId, domain.id)
                : await listLookalikes(organizationId, domain.id),
        })),
      );
      const nextRows = entries.flatMap(({ breachFindings, domain, values }) => {
        const exposureByEmail = new Map<
          string,
          {
            breaches: DiscoveryBreach[];
            credentials: Record<string, unknown>[];
            hashedCredentials: number;
            plaintextCredentials: number;
          }
        >();
        for (const finding of breachFindings) {
          const email = finding.details?.email ?? finding.asset_value;
          if (typeof email !== "string") continue;
          const key = email.toLowerCase();
          const current = exposureByEmail.get(key) ?? {
            breaches: [],
            credentials: [],
            hashedCredentials: 0,
            plaintextCredentials: 0,
          };
          current.breaches = mergeBreaches(current.breaches, findingBreaches(finding.details));
          current.credentials = [...current.credentials, ...findingCredentials(finding.details)];
          current.hashedCredentials = Math.max(
            current.hashedCredentials,
            findingCount(finding.details, "hashed_credentials"),
          );
          current.plaintextCredentials = Math.max(
            current.plaintextCredentials,
            findingCount(finding.details, "plaintext_credentials"),
          );
          exposureByEmail.set(key, current);
        }

        return values.map((value) => {
          if (kind === "subdomains") {
            return {
              breaches: [],
              credentials: [],
              domain: domain.root_domain,
              hashedCredentials: 0,
              id: `${domain.id}-${value as string}`,
              plaintextCredentials: 0,
              result: value as string,
            };
          }
          if (kind === "emails") {
            const email = value as DomainEmail;
            const exposure = exposureByEmail.get(email.email.toLowerCase());
            return {
              attrs: email.attrs,
              breaches: mergeBreaches(emailBreaches(email.attrs), exposure?.breaches ?? []),
              credentials: exposure?.credentials ?? [],
              domain: domain.root_domain,
              hashedCredentials: exposure?.hashedCredentials ?? 0,
              id: `${domain.id}-${email.email}`,
              plaintextCredentials: exposure?.plaintextCredentials ?? 0,
              result: email.email,
              source: email.source,
            };
          }
          const item = value as DomainLookalike;
          return {
            breaches: [],
            credentials: [],
            domain: domain.root_domain,
            hashedCredentials: 0,
            id: item.id,
            plaintextCredentials: 0,
            result: item.title,
            severity: item.severity,
            status: item.status,
          };
        });
      });
      setDomains(nextDomains);
      setRows(nextRows);
    } catch (error) {
      toast.error("Could not load scan results", { description: parseApiError(error).message });
    } finally {
      setLoading(false);
    }
  }, [domainId, domainName, kind, organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns = useMemo<ColumnDef<DiscoveryRow>[]>(
    () => [
      ...(domainId
        ? []
        : [
            {
              cell: (row: DiscoveryRow) => <span className="text-[14px] font-normal">{row.domain}</span>,
              header: "Domain",
              id: "domain",
              sortable: true,
              sortValue: (row: DiscoveryRow) => row.domain,
              width: "1fr",
            },
          ]),
      {
        cell: (row) => <span className="text-[14px] font-normal">{row.result}</span>,
        header: kind === "subdomains" ? "Subdomain" : kind === "emails" ? "Email" : "Lookalike",
        id: "result",
        sortable: true,
        sortValue: (row) => row.result,
        width: "1fr",
      },
      ...(kind === "emails"
        ? [
            {
              cell: (row: DiscoveryRow) => {
                if (row.breaches.length === 0) {
                  return <span className="text-muted-foreground">—</span>;
                }

                return <EmailBreachTags breaches={row.breaches} />;
              },
              header: "Breaches",
              id: "breaches",
              sortable: false,
              width: "1.5fr",
            },
          ]
        : kind === "lookalikes"
          ? [
              {
                cell: (row: DiscoveryRow) => row.severity ?? "—",
                header: "Severity",
                id: "severity",
                sortable: true,
                sortValue: (row: DiscoveryRow) => row.severity ?? "",
                width: "120px",
              },
              {
                cell: (row: DiscoveryRow) => row.status ?? "—",
                header: "Status",
                id: "status",
                sortable: true,
                sortValue: (row: DiscoveryRow) => row.status ?? "",
                width: "120px",
              },
            ]
          : []),
    ],
    [domainId, kind],
  );

  const filterFields = useMemo<FilterFieldConfig[]>(() => {
    if (kind !== "emails") return [];

    return [
      ...(domainId
        ? []
        : [
            {
              key: "domain",
              label: "Domain",
              options: domains.map((domain) => ({ label: domain.root_domain, value: domain.root_domain })),
              type: "select" as const,
            },
          ]),
      ...(domainId
        ? [
            {
              key: "source",
              label: "Source",
              options: [
                ...new Set(rows.map((row) => row.source).filter((value): value is string => Boolean(value))),
              ].map((value) => ({ label: value, value })),
              type: "select" as const,
            },
          ]
        : []),
      {
        key: "breaches",
        label: "Breaches",
        placeholder: "Enter a breach name...",
        type: "text",
      },
    ];
  }, [domainId, domains, kind, rows]);

  const visibleRows = useMemo(() => {
    if (kind !== "emails" || filters.length === 0) return rows;

    return rows.filter((row) =>
      filters.every((filter) => {
        const value =
          filter.field === "breaches"
            ? row.breaches.map((breach) => breach.name).join(", ")
            : String(row[filter.field as keyof DiscoveryRow] ?? "");
        return matchesFilter(value, filter);
      }),
    );
  }, [filters, kind, rows]);

  if (loading && domains.length === 0) return <PageTableSkeleton label={`Loading ${kind}`} />;

  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden p-4", embedded && "p-0")}>
      <DataTable
        actions={
          <DataTableRefreshButton
            className={dataTableToolbarButtonClassName}
            isLoading={loading}
            onClick={() => void load()}
          />
        }
        className="h-full min-h-0"
        columns={columns}
        data={visibleRows}
        emptyMessage={
          domains.length === 0
            ? "Verify a domain to start passive discovery and see results here."
            : kind === "subdomains"
              ? "No subdomains found yet."
              : kind === "emails"
                ? "No emails found yet."
                : "No lookalikes found yet."
        }
        emptyStateClassName={domains.length === 0 ? "border-0 bg-transparent" : undefined}
        emptyTitle={
          domains.length === 0
            ? "No verified domains"
            : kind === "subdomains"
              ? "No subdomains"
              : kind === "emails"
                ? "No emails"
                : "No lookalikes"
        }
        getRowKey={(row) => row.id}
        hideToolbarWhenEmpty={domains.length === 0}
        isLoading={loading}
        keepToolbarWhileLoading
        onRowClick={kind === "emails" ? setSelectedEmail : undefined}
        searchKey={(row) =>
          `${row.domain} ${row.result} ${row.source ?? ""} ${row.breaches.map((breach) => breach.name).join(" ")}`
        }
        searchPlaceholder={`Search ${kind.charAt(0).toUpperCase()}${kind.slice(1)}`}
        showHeaderColumnSeparators
        tableCellClassName={kind === "emails" ? "border-border/70 px-4 py-2 align-middle" : undefined}
        tableHeaderCellClassName="h-9 border-r border-border px-3 text-[14px] font-normal last:border-r-0"
        tableHeaderClassName="!bg-[#fafafa] dark:!bg-card"
        tableRowClassName={
          kind === "emails"
            ? "h-12 w-full cursor-pointer bg-card text-foreground font-normal hover:bg-muted/30"
            : undefined
        }
        toolbarButtonClassName={cn(dataTableToolbarButtonClassName)}
        toolbarInputClassName={dataTableToolbarInputClassName}
        extraToolbarContent={
          kind === "emails" ? (
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
          ) : null
        }
      />
      {kind === "emails" ? (
        <Drawer
          onOpenChange={(open) => {
            if (!open) setSelectedEmail(null);
          }}
          open={selectedEmail !== null}
        >
          {selectedEmail ? <EmailDetails email={selectedEmail} /> : null}
        </Drawer>
      ) : null}
    </div>
  );
}

function EmailDetails({ email }: { email: DiscoveryRow }) {
  const [revealedPasswords, setRevealedPasswords] = useState<Set<string>>(() => new Set());
  const unmatchedCredentials = credentialsNotMappedToBreaches(email.breaches, email.credentials);
  const overviewFields = [
    ["Email", email.result],
    ["Domain", email.domain],
    ["Source", email.source ?? "—"],
    ["Breaches", String(email.breaches.length)],
    ["Credentials", String(email.credentials.length)],
    ["Plaintext passwords", String(email.plaintextCredentials)],
    ["Password hashes", String(email.hashedCredentials)],
  ];

  return (
    <DrawerContent
      className="w-[min(48rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] overflow-hidden rounded-l-[1rem] border-[#eaeaea] bg-[#fdfdfd] p-0 shadow-[0_1.5px_5px_rgba(0,0,0,0.03),0_0.5px_1.5px_rgba(0,0,0,0.025)] dark:border-border dark:bg-card sm:max-w-[48rem]"
      side="right"
    >
      <DrawerClose className={cn(ghostButton, "absolute top-3 right-3 z-10 size-7")}>
        <X className="size-5" />
        <span className="sr-only">Close</span>
      </DrawerClose>
      <div className="shrink-0 border-b border-[#eaeaea] px-5 pb-4 pt-5 dark:border-border">
        <div className="flex min-w-0 items-center gap-3 pr-10">
          <DrawerTitle className="min-w-0 flex-1 truncate text-[17.5px] leading-6 font-semibold tracking-[-0.4px] text-foreground">
            {email.result}
          </DrawerTitle>
        </div>
        <p className="mt-1 text-[13px] text-muted-foreground">Email exposure · {email.domain}</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {overviewFields.map(([label, value]) => (
            <div className={cn("min-w-0", label === "Email" && "sm:col-span-3")} key={label}>
              <p className="text-[13px] text-muted-foreground">{label}</p>
              <p
                className={cn("mt-0.5 text-[14px] text-foreground", label === "Email" ? "break-words" : "truncate")}
                title={value}
              >
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="-mx-5 mt-6 border-t border-[#eaeaea] px-5 pt-5 dark:border-border">
          <div className="space-y-5">
            <p className="text-[13px] text-muted-foreground">Breaches</p>
            {email.breaches.length > 0 ? (
              <div className="relative space-y-3">
                {email.breaches.map((breach, index) => {
                  const breachCredentials = credentialsForBreach(breach, email.breaches, email.credentials);
                  const breachDate = formatBreachDate(breach.date);
                  const breachStepDate = formatBreachStepDate(breach.date);

                  return (
                    <div className="relative" key={breach.name}>
                      {index < email.breaches.length - 1 ? (
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute top-[34px] bottom-[-10px] left-[36px] w-px -translate-x-1/2"
                          style={breachConnectorStyle}
                        />
                      ) : null}
                      <div className="relative overflow-hidden rounded-lg border border-[#eaeaea] bg-white/90 backdrop-blur-sm dark:border-border dark:bg-background/90">
                        <div className="flex items-start gap-2 px-4 py-3.5">
                          {breachStepDate ? (
                            <div className="relative z-10 flex w-9 shrink-0 flex-col items-center justify-center leading-none">
                              <span className="text-[13px] font-normal text-foreground">{breachStepDate.day}</span>
                              <span className="mt-0.5 text-[10px] font-normal uppercase text-muted-foreground">
                                {breachStepDate.month}
                              </span>
                            </div>
                          ) : null}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <p className="text-left text-sm font-normal text-foreground">{breach.name}</p>
                              {breachDate ? (
                                <span className="text-[13px] text-muted-foreground">Breach date · {breachDate}</span>
                              ) : null}
                            </div>
                            {breach.domain ? (
                              <p className="mt-1 text-[13px] text-muted-foreground">{breach.domain}</p>
                            ) : null}
                          </div>
                        </div>

                        <div className="space-y-5 border-t border-[#eaeaea] px-4 py-4 dark:border-border">
                          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                            <div className="min-w-0">
                              <p className="text-[13px] text-muted-foreground">Exposure</p>
                              <p className="mt-0.5 text-[14px] leading-5 text-foreground">
                                {explainBreach(breach, email.breaches, email.credentials)}
                              </p>
                            </div>
                            {breach.description ? (
                              <div className="min-w-0">
                                <p className="text-[13px] text-muted-foreground">Breach details</p>
                                <p className="mt-0.5 text-[14px] leading-5 text-foreground">{breach.description}</p>
                              </div>
                            ) : null}
                            {breach.dataClasses && breach.dataClasses.length > 0 ? (
                              <div className="min-w-0 sm:col-span-2">
                                <p className="text-[13px] text-muted-foreground">Compromised data</p>
                                <p className="mt-0.5 text-[14px] leading-5 text-foreground">
                                  {breach.dataClasses.join(", ")}
                                </p>
                              </div>
                            ) : null}
                          </div>

                          {breachCredentials.length > 0 ? (
                            <div className="space-y-4 border-t border-[#eaeaea] pt-4 dark:border-border">
                              <p className="text-[13px] text-muted-foreground">Credentials</p>
                              <CredentialFields
                                credentials={breachCredentials}
                                fieldPrefix={`${email.id}-breach-${String(index)}`}
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
                          ) : (
                            <p className="border-t border-[#eaeaea] pt-4 text-sm leading-5 text-muted-foreground dark:border-border">
                              No credential was returned for this breach.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No named breaches were reported for this email.</p>
            )}
            {unmatchedCredentials.length > 0 ? (
              <div className="space-y-4 border-t border-[#eaeaea] pt-5 dark:border-border">
                <div>
                  <p className="text-[13px] text-muted-foreground">Credentials</p>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">
                    These credentials were returned without a named breach.
                  </p>
                </div>
                <CredentialFields
                  credentials={unmatchedCredentials}
                  fieldPrefix={`${email.id}-unmapped`}
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
          </div>
        </div>
      </div>
      <DrawerFooter className="shrink-0 flex-row items-center justify-end gap-4 border-t border-[#eaeaea] bg-[#fafafa] px-5 py-3 dark:border-border dark:bg-card">
        <DrawerClose asChild>
          <Button size="sm" variant="outline">
            Close
          </Button>
        </DrawerClose>
      </DrawerFooter>
    </DrawerContent>
  );
}
