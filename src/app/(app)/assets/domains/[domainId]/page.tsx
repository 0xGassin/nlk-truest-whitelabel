"use client";

import type { ColumnDef } from "@/components/ui/data-table";
import type { Filter, FilterFieldConfig } from "@/components/ui/filters";
import type { DomainLookalike, DomainSubdomain, DomainSubdomainFinding, WatchedDomain } from "@/types";

import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, CircleHelp, CircleX, ListFilter, Undo2 } from "lucide-react";

import { State } from "@/components/state";
import {
  DataTable,
  DataTableRefreshButton,
  dataTableToolbarButtonClassName,
  dataTableToolbarInputClassName,
} from "@/components/ui/data-table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Filters } from "@/components/ui/filters";
import { Skeleton } from "@/components/ui/skeleton";
import { getSeverityPillClassName, getSeverityPillLabel } from "@/components/ui/severity-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast/toast";
import { useAuth } from "@/lib/auth";
import { getOrganizationId } from "@/lib/organization";
import { formatDetailLabel } from "@/lib/detail-label";
import { getFindingRemediation } from "@/lib/finding-remediation";
import { cn } from "@/lib/utils";
import { ghostButton } from "@/lib/surfaces";
import { CTLogs } from "@/features/ct-logs";
import { DomainIntelligence } from "@/features/domains/domain-intelligence";
import { DomainAssets } from "@/features/domains/domain-assets";
import { DomainNetworkEnrichment } from "@/features/domains/domain-network-enrichment";
import { DomainCrawler } from "@/features/domains/domain-crawler";
import { DomainTechnologies } from "@/features/domains/domain-technologies";
import { DomainServices } from "@/features/domains/domain-services";
import { DomainWhoisResponse } from "@/features/domains/domain-whois-response";
import { DiscoveryPage } from "@/features/domain-discoveries";
import { FindingsPage } from "@/features/findings";
import { parseApiError } from "@/lib/errors";
import {
  listDomains,
  listLookalikes,
  listSubdomainDetails,
  listSubdomains,
  updateLookalike,
} from "@/services/api/domains";
import { listCTFindings } from "@/services/api/ctlog";
import { useBreadcrumbStore } from "@/stores/breadcrumb-store";
import { useTheme } from "@/features/settings/context/theme-context";
import { StackedCardsIllustration } from "@/components/ui/stacked-cards-illustration";

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

export type DomainTab =
  | "assets"
  | "crawler"
  | "ct-logs"
  | "domain"
  | "emails"
  | "findings"
  | "lookalikes"
  | "services"
  | "subdomains"
  | "technologies";

const DOMAIN_TABS = new Set<DomainTab>([
  "assets",
  "crawler",
  "ct-logs",
  "domain",
  "emails",
  "findings",
  "lookalikes",
  "services",
  "subdomains",
  "technologies",
]);

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function subdomainFindingLabel(type?: string): string {
  const normalized = typeof type === "string" ? type : "";
  if (!normalized) return "Finding";
  if (normalized === "dangling_cname" || normalized === "dangling_cname_takeover") return "Dangling CNAMEs";
  if (normalized === "dangling_nameserver") return "Dangling Nameservers";
  if (normalized === "zone_transfer") return "Zone Transfer Issues";
  if (normalized === "tls_legacy_protocol") return "TLS Legacy Protocol";
  return formatSubdomainIssueName(normalized);
}

function formatSubdomainIssueName(value?: string): string {
  const acronyms = new Set([
    "api",
    "asn",
    "caa",
    "cname",
    "cors",
    "csp",
    "dkim",
    "dmarc",
    "dns",
    "ftp",
    "hsts",
    "http",
    "https",
    "ip",
    "ipv4",
    "ipv6",
    "mx",
    "ns",
    "ptr",
    "rdp",
    "san",
    "sql",
    "spf",
    "ssh",
    "ssl",
    "tcp",
    "tls",
    "txt",
    "uri",
    "url",
    "whois",
    "xss",
  ]);
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "Finding";

  const sections = raw.split(/\s+(?:-{2,}|—|–)\s*/);
  const formatSection = (section: string): string =>
    section
      .replaceAll("_", " ")
      .replaceAll("-", " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => {
        if (word.includes(".") || word.includes("/") || word.includes("://")) return word;
        const normalizedWord = word.toLowerCase();
        const acronym = normalizedWord.endsWith("s") ? normalizedWord.slice(0, -1) : normalizedWord;
        if (acronyms.has(normalizedWord)) return normalizedWord.toUpperCase();
        if (acronyms.has(acronym)) return `${acronym.toUpperCase()}${normalizedWord.endsWith("s") ? "s" : ""}`;
        if (normalizedWord === "domain" || normalizedWord === "domains") return normalizedWord;
        return `${normalizedWord.charAt(0).toUpperCase()}${normalizedWord.slice(1)}`;
      })
      .join(" ");

  return sections.map(formatSection).filter(Boolean).join(" — ") || "Finding";
}

function formatSubdomainDetailValue(key: string, value: unknown): string {
  const text = String(value);
  if (key.toLowerCase() !== "reason" || !text) return text;
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

function formatLookalikeTechnique(row: DomainLookalike): string {
  const technique = row.details?.technique;
  if (typeof technique !== "string" || !technique) return "—";

  return technique
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getLookalikeIps(row: DomainLookalike): string[] {
  const ips = row.details?.ips;
  return Array.isArray(ips) ? ips.filter((ip): ip is string => typeof ip === "string" && ip.length > 0) : [];
}

function getSeverityChip(severity?: string) {
  return { className: getSeverityPillClassName(severity), label: getSeverityPillLabel(severity) };
}

function DomainDetailsSkeleton() {
  const detailFields = ["w-28", "w-24", "w-20", "w-24", "w-20"];

  return (
    <div className="skeleton-loading flex h-full min-h-0 flex-col">
      <div className="-ml-2 w-[calc(100%+0.5rem)] border-b border-border/70">
        <div className="flex shrink-0 items-center gap-1 px-4 pb-1.5 pt-2">
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4 pt-5 [scrollbar-gutter:stable]">
        <div className="flex w-full flex-col">
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-5 pb-4 pt-5">
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="grid gap-x-12 gap-y-6 px-5 py-5 sm:grid-cols-3">
              {detailFields.map((width, index) => (
                <div className="space-y-2" key={`${width}-${index}`}>
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className={`h-5 ${width}`} />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-b-lg border-x border-b border-border bg-transparent">
            <div className="px-5 pb-1 pt-5">
              <Skeleton className="h-5 w-24" />
            </div>
            <div className="grid gap-x-12 gap-y-6 px-5 pb-6 pt-5 sm:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <div className="space-y-2" key={index}>
                  <Skeleton className="h-4 w-10" />
                  <Skeleton className="h-5 w-32 max-w-full" />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2 px-5 py-4">
              <Skeleton className="size-5 rounded" />
              <Skeleton className="size-4 rounded" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="ml-auto h-4 w-12" />
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border px-5 py-4">
              <Skeleton className="size-5 rounded" />
              <Skeleton className="h-5 w-40" />
            </div>
            <div className="bg-muted/30 p-5">
              <div className="grid gap-x-8 gap-y-5 sm:grid-cols-3 xl:grid-cols-5">
                {Array.from({ length: 4 }, (_, index) => (
                  <div className="space-y-2" key={index}>
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-28 max-w-full" />
                  </div>
                ))}
              </div>
              <div className="mt-5 space-y-0 border-t border-border">
                {Array.from({ length: 5 }, (_, index) => (
                  <div
                    className="flex items-center gap-3 border-b border-border px-5 py-3.5 last:border-b-0"
                    key={index}
                  >
                    <Skeleton className="size-4 rounded" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-40 max-w-[40%]" />
                    <Skeleton className="ml-auto h-4 w-6" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DomainDetailsPage() {
  const params = useParams<{ domainId: string; tab?: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { highContrastPopups } = useTheme();
  const domainId = params.domainId;
  const initialTab = DOMAIN_TABS.has(params.tab as DomainTab) ? (params.tab as DomainTab) : "domain";
  const organizationId = getOrganizationId(user);
  const { clearDetailsPage, setDetailsPage } = useBreadcrumbStore();
  const [domain, setDomain] = useState<WatchedDomain | null>(null);
  const [subdomains, setSubdomains] = useState<string[]>([]);
  const [subdomainDetails, setSubdomainDetails] = useState<DomainSubdomain[]>([]);
  const [selectedSubdomain, setSelectedSubdomain] = useState<DomainSubdomain | null>(null);
  const [selectedSubdomainFinding, setSelectedSubdomainFinding] = useState<DomainSubdomainFinding | null>(null);
  const [lookalikes, setLookalikes] = useState<DomainLookalike[]>([]);
  const [lookalikeFilters, setLookalikeFilters] = useState<Filter[]>([
    { field: "status", id: "lookalikes-default-status", operator: "is", values: ["open"] },
  ]);
  const [selectedLookalikeIds, setSelectedLookalikeIds] = useState<Set<string>>(() => new Set());
  const [updatingLookalikes, setUpdatingLookalikes] = useState<string | null>(null);
  const [isLookalikesLoading, setIsLookalikesLoading] = useState(true);
  const lookalikeRequestReference = useRef(0);

  const loadLookalikes = useCallback(async () => {
    const requestId = ++lookalikeRequestReference.current;
    if (!organizationId) {
      setLookalikes([]);
      setIsLookalikesLoading(false);
      return;
    }
    setIsLookalikesLoading(true);
    setLookalikes([]);
    setSelectedLookalikeIds(new Set());
    try {
      const nextLookalikes = await listLookalikes(organizationId, domainId);
      if (requestId !== lookalikeRequestReference.current) return;
      setLookalikes(nextLookalikes);
    } catch (error) {
      if (requestId !== lookalikeRequestReference.current) return;
      toast.error("Could not load lookalikes", { description: parseApiError(error).message });
    } finally {
      if (requestId === lookalikeRequestReference.current) setIsLookalikesLoading(false);
    }
  }, [domainId, organizationId]);
  const [unreviewedCtLogs, setUnreviewedCtLogs] = useState(0);
  const [activeTab, setActiveTab] = useState<DomainTab>(initialTab);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;

    const load = async () => {
      setIsLoading(true);
      if (!organizationId) {
        if (isCurrent) {
          setDomain(null);
          setIsLookalikesLoading(false);
          setIsLoading(false);
        }
        return;
      }
      try {
        const domains = await listDomains(organizationId);
        const nextDomain = domains.find((item) => item.id === domainId);
        if (!nextDomain) {
          if (isCurrent) setDomain(null);
          if (isCurrent) setIsLookalikesLoading(false);
          return;
        }

        if (!nextDomain.active) {
          if (isCurrent) {
            setDomain(nextDomain);
            setSubdomainDetails([]);
            setSubdomains([]);
            setLookalikes([]);
            setIsLookalikesLoading(false);
          }
          return;
        }

        const [nextSubdomainDetails, nextSubdomainValues, nextCtFindings] = await Promise.all([
          listSubdomainDetails(organizationId, nextDomain.id).catch(() => []),
          listSubdomains(organizationId, nextDomain.id).catch(() => []),
          listCTFindings(organizationId, nextDomain.id).catch(() => []),
        ]);

        if (isCurrent) {
          setDomain(nextDomain);
          setSubdomainDetails(nextSubdomainDetails);
          setSubdomains(nextSubdomainValues);
          setUnreviewedCtLogs(nextCtFindings.filter((finding) => !finding.reviewed).length);
        }

        if (isCurrent) void loadLookalikes();
      } catch (error) {
        toast.error("Could not load domain details", { description: parseApiError(error).message });
        if (isCurrent) setIsLookalikesLoading(false);
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    void load();
    return () => {
      isCurrent = false;
      clearDetailsPage();
    };
  }, [clearDetailsPage, domainId, loadLookalikes, organizationId, router, setDetailsPage]);

  useEffect(() => {
    if (!domain) return;
    const tabLabel =
      {
        assets: "Assets",
        crawler: "Crawler",
        domain: "Domain",
        emails: "Emails",
        findings: "Findings",
        subdomains: "Subdomains",
        lookalikes: "Lookalikes",
        services: "Services",
        technologies: "Technologies",
        "ct-logs": "CT Logs",
      }[activeTab] ?? "Domain";
    setDetailsPage(tabLabel === "Domain" ? domain.root_domain : `${domain.root_domain} / ${tabLabel}`, () =>
      router.push("/assets/domains"),
    );
  }, [activeTab, domain, router, setDetailsPage]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const syncTabFromUrl = () => {
      const suffix = window.location.pathname.split(`/assets/domains/${domainId}/`)[1];
      const nextTab = suffix as DomainTab;
      if (
        suffix &&
        [
          "assets",
          "crawler",
          "ct-logs",
          "emails",
          "findings",
          "lookalikes",
          "services",
          "subdomains",
          "technologies",
        ].includes(nextTab)
      ) {
        setActiveTab(nextTab);
      } else if (!suffix) {
        setActiveTab("domain");
      }
    };

    window.addEventListener("popstate", syncTabFromUrl);
    return () => window.removeEventListener("popstate", syncTabFromUrl);
  }, [domainId]);

  const lookalikeFilterFields = useMemo<FilterFieldConfig[]>(() => {
    const options = (values: string[]) =>
      [...new Set(values.filter(Boolean))].sort().map((value) => ({ label: value, value }));

    return [
      {
        key: "status",
        label: "Status",
        options: [
          { label: "Open", value: "open" },
          { label: "Not open", value: "not_open" },
        ],
        type: "select",
      },
      { key: "severity", label: "Severity", options: options(lookalikes.map((row) => row.severity)), type: "select" },
      {
        key: "technique",
        label: "Technique",
        options: options(lookalikes.map(formatLookalikeTechnique)),
        type: "select",
      },
    ];
  }, [lookalikes]);

  const filteredLookalikes = useMemo(() => {
    if (lookalikeFilters.length === 0) return lookalikes;

    return lookalikes.filter((row) =>
      lookalikeFilters.every((filter) => {
        const value =
          filter.field === "technique"
            ? formatLookalikeTechnique(row)
            : filter.field === "severity"
              ? row.severity
              : row.status;
        const selectedValues = filter.values.map(String);
        if (selectedValues.length === 0) return true;
        const matches = selectedValues.some((selectedValue) =>
          selectedValue === "not_open" ? value !== "open" : selectedValue === value,
        );
        return filter.operator === "is_not" || filter.operator === "is_not_any_of" ? !matches : matches;
      }),
    );
  }, [lookalikeFilters, lookalikes]);

  const toggleLookalikeSelection = (id: string) => {
    setSelectedLookalikeIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllLookalikes = () => {
    setSelectedLookalikeIds((current) => {
      const next = new Set(current);
      const allSelected = filteredLookalikes.length > 0 && filteredLookalikes.every((row) => current.has(row.id));
      filteredLookalikes.forEach((row) => (allSelected ? next.delete(row.id) : next.add(row.id)));
      return next;
    });
  };

  const toggleLookalikeReviewed = async (lookalike: DomainLookalike) => {
    if (!organizationId) return;
    const reviewed = lookalike.status === "open";
    setUpdatingLookalikes(lookalike.id);
    try {
      await updateLookalike(organizationId, domainId, lookalike.id, { reviewed });
      setLookalikes((current) =>
        current.map((row) =>
          row.id === lookalike.id
            ? {
                ...row,
                reviewed_at: reviewed ? new Date().toISOString() : undefined,
                resolved_at: undefined,
                status: reviewed ? "reviewed" : "open",
              }
            : row,
        ),
      );
      toast.success(reviewed ? "Lookalike Reviewed" : "Lookalike Reopened", {
        description: reviewed
          ? `${lookalike.title} has been marked as reviewed.`
          : `${lookalike.title} is back in your open findings.`,
      });
    } catch (error) {
      toast.error("Could not update lookalike", { description: parseApiError(error).message });
    } finally {
      setUpdatingLookalikes(null);
    }
  };

  const setSelectedLookalikesReviewed = async (reviewed: boolean) => {
    if (!organizationId) return;
    const ids = [...selectedLookalikeIds];
    if (ids.length === 0) return;
    setUpdatingLookalikes("bulk");
    try {
      await Promise.all(ids.map((id) => updateLookalike(organizationId, domainId, id, { reviewed })));
      setLookalikes((current) =>
        current.map((row) =>
          selectedLookalikeIds.has(row.id)
            ? {
                ...row,
                reviewed_at: reviewed ? new Date().toISOString() : undefined,
                resolved_at: undefined,
                status: reviewed ? "reviewed" : "open",
              }
            : row,
        ),
      );
      setSelectedLookalikeIds(new Set());
      toast.success(`${ids.length} lookalike${ids.length === 1 ? "" : "s"} ${reviewed ? "Reviewed" : "Reopened"}`, {
        description: reviewed
          ? "The selected findings have been marked as reviewed."
          : "The selected findings are back in your open findings.",
      });
    } catch (error) {
      toast.error(`Could not ${reviewed ? "review" : "reopen"} lookalikes`, {
        description: parseApiError(error).message,
      });
    } finally {
      setUpdatingLookalikes(null);
    }
  };

  const subdomainColumns = useMemo<ColumnDef<DomainSubdomain>[]>(
    () => [
      {
        cell: (row) => (
          <span className="block truncate text-[14px] font-normal" title={row.value}>
            {row.value}
          </span>
        ),
        header: "Subdomain",
        id: "value",
        sortable: true,
        sortValue: (row) => row.value,
        width: "1.6fr",
      },
      {
        cell: (row) => (
          <span className="whitespace-nowrap text-[14px] font-normal text-foreground">
            {formatDate(row.first_seen_at)}
          </span>
        ),
        header: "First seen",
        id: "first_seen_at",
        sortable: true,
        sortValue: (row) => row.first_seen_at,
        width: "1fr",
      },
      {
        cell: (row) => (
          <span className="whitespace-nowrap text-[14px] font-normal text-foreground">
            {formatDate(row.last_seen_at)}
          </span>
        ),
        header: "Last seen",
        id: "last_seen_at",
        sortable: true,
        sortValue: (row) => row.last_seen_at,
        width: "1fr",
      },
      {
        cell: (row) => {
          const findings = row.findings ?? [];
          const titles = findings.map((finding) => formatSubdomainIssueName(finding.title));
          const label = findings.length === 0 ? "—" : `${findings.length} finding${findings.length === 1 ? "" : "s"}`;
          return (
            <span className="block truncate text-[14px] font-normal" title={titles.join("\n")}>
              {label}
            </span>
          );
        },
        header: "Vulnerabilities",
        id: "findings",
        sortable: true,
        sortValue: (row) => (row.findings ?? []).length,
        width: "1.2fr",
      },
      {
        cell: (row) => {
          const issues = [...new Set((row.findings ?? []).map((finding) => subdomainFindingLabel(finding.type)))];
          return (
            <span className="block truncate text-[14px] font-normal" title={issues.join("\n")}>
              {issues.join(", ") || "—"}
            </span>
          );
        },
        header: "Issues",
        id: "issues",
        sortable: true,
        sortValue: (row) => (row.findings ?? []).map((finding) => subdomainFindingLabel(finding.type)).join(", "),
        width: "2fr",
      },
    ],
    [],
  );

  const subdomainFindingColumns = useMemo<ColumnDef<DomainSubdomainFinding>[]>(
    () => [
      {
        cell: (row) => (
          <span className="block truncate text-[14px] font-normal" title={formatSubdomainIssueName(row.title)}>
            {formatSubdomainIssueName(row.title)}
          </span>
        ),
        header: "Issue",
        id: "title",
        sortable: true,
        sortValue: (row) => row.title,
        width: "2fr",
      },
      {
        cell: (row) => (
          <span className="block truncate text-[14px] font-normal" title={subdomainFindingLabel(row.type)}>
            {subdomainFindingLabel(row.type)}
          </span>
        ),
        header: "Type",
        id: "type",
        sortable: true,
        sortValue: (row) => row.type,
        width: "1.35fr",
      },
      {
        cell: (row) => {
          const severity = getSeverityChip(row.severity);
          return (
            <Badge className={cn("px-1.5 text-[13px] font-normal", severity.className)} variant="outline">
              {severity.label}
            </Badge>
          );
        },
        header: "Severity",
        id: "severity",
        sortable: true,
        sortValue: (row) => row.severity,
        width: "0.9fr",
      },
      {
        cell: (row) => <span className="capitalize text-[14px] font-normal">{row.status || "—"}</span>,
        header: "Status",
        id: "status",
        sortable: true,
        sortValue: (row) => row.status,
        width: "1fr",
      },
      {
        cell: (row) => (
          <span className="whitespace-nowrap text-[14px] font-normal">{formatDate(row.last_seen_at)}</span>
        ),
        header: "Last seen",
        id: "last_seen_at",
        sortable: true,
        sortValue: (row) => row.last_seen_at,
        width: "1.1fr",
      },
    ],
    [],
  );

  const selectedSubdomainFindingDetails = useMemo(
    () =>
      Object.entries(selectedSubdomainFinding?.details ?? {}).filter(
        ([key, value]) =>
          key.toLowerCase() !== "check" &&
          key.toLowerCase() !== "host" &&
          !(selectedSubdomainFinding?.type?.toLowerCase().includes("dns") && key.toLowerCase() === "domain") &&
          ["string", "number", "boolean"].includes(typeof value),
      ),
    [selectedSubdomainFinding],
  );
  const selectedSubdomainFindingReason = selectedSubdomainFindingDetails.find(
    ([key]) => key.toLowerCase() === "reason",
  )?.[1];
  const selectedSubdomainFindingRemediation = getFindingRemediation(
    selectedSubdomainFinding?.details,
    selectedSubdomainFinding?.remediation,
  );
  const selectedSubdomainFindingExtraDetails = selectedSubdomainFindingDetails.filter(
    ([key]) => !["reason", "remediation"].includes(key.toLowerCase()),
  );

  const lookalikeColumns = useMemo<ColumnDef<DomainLookalike>[]>(
    () => [
      {
        align: "center",
        cell: (row) => (
          <div className="flex h-full items-center justify-center">
            <SelectionCheckbox
              checked={selectedLookalikeIds.has(row.id)}
              label={`Select ${row.title}`}
              onChange={() => toggleLookalikeSelection(row.id)}
            />
          </div>
        ),
        header: (
          <SelectionCheckbox
            checked={
              filteredLookalikes.length > 0 && filteredLookalikes.every((row) => selectedLookalikeIds.has(row.id))
            }
            className="translate-y-[2px]"
            label="Select all lookalikes"
            onChange={toggleAllLookalikes}
          />
        ),
        id: "select",
        sortable: false,
        width: "44px",
      },
      {
        cell: (row) => (
          <span className="block truncate text-[14px] font-normal" title={row.title}>
            {row.title}
          </span>
        ),
        header: "Lookalike",
        id: "title",
        sortable: true,
        sortValue: (row) => row.title,
        width: "2fr",
      },
      {
        cell: (row) => {
          const technique = formatLookalikeTechnique(row);

          return (
            <span className="block truncate text-[14px] font-normal" title={technique}>
              {technique}
            </span>
          );
        },
        header: "Technique",
        id: "technique",
        sortable: true,
        sortValue: (row) => formatLookalikeTechnique(row),
        width: "150px",
      },
      {
        cell: (row) => {
          const ips = getLookalikeIps(row);
          const visibleIps = ips.slice(0, 2).join(", ");
          const label = visibleIps ? `${visibleIps}${ips.length > 2 ? ` +${ips.length - 2}` : ""}` : "—";

          return (
            <span className="block truncate font-mono text-[14px] font-normal" title={ips.join(", ")}>
              {label}
            </span>
          );
        },
        header: "IPs",
        id: "ips",
        sortable: true,
        sortValue: (row) => getLookalikeIps(row).length,
        width: "320px",
      },
      {
        cell: (row) => {
          const severity = getSeverityChip(row.severity);

          return (
            <Badge className={`px-1.5 text-[14px] font-normal ${severity.className}`} variant="outline">
              {severity.label}
            </Badge>
          );
        },
        header: "Severity",
        id: "severity",
        sortable: true,
        sortValue: (row) => row.severity,
        width: "110px",
      },
      {
        cell: (row) => (
          <span
            className="block truncate text-[14px] font-normal text-foreground"
            title={row.status ? `${row.status.charAt(0).toUpperCase()}${row.status.slice(1)}` : "—"}
          >
            {row.status ? `${row.status.charAt(0).toUpperCase()}${row.status.slice(1)}` : "—"}
          </span>
        ),
        header: "Status",
        id: "status",
        sortable: true,
        sortValue: (row) => row.status,
        width: "110px",
      },
      {
        cell: (row) => (
          <span className="whitespace-nowrap text-[14px] font-normal text-foreground">
            {formatDate(row.last_seen_at)}
          </span>
        ),
        header: "Last seen",
        id: "last_seen_at",
        sortable: true,
        sortValue: (row) => row.last_seen_at,
        width: "150px",
      },
      {
        align: "right",
        cell: (row) => (
          <Button
            aria-label={row.status === "open" ? "Review lookalike" : "Reopen lookalike"}
            className="group size-8"
            disabled={updatingLookalikes !== null}
            onClick={(event) => {
              event.stopPropagation();
              void toggleLookalikeReviewed(row);
            }}
            size="sm"
            variant="ghost"
          >
            {row.status !== "open" ? (
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
    [selectedLookalikeIds, filteredLookalikes, toggleLookalikeReviewed, updatingLookalikes],
  );

  if (isLoading) return <DomainDetailsSkeleton />;

  if (!domain) {
    return <State.Error description="The requested domain could not be found." title="Domain not found" />;
  }

  if (!domain.active) {
    return (
      <State.Error
        description="Verify this domain before viewing its discovered assets, findings, and intelligence."
        title="Domain verification required"
      />
    );
  }

  const handleTabChange = (value: string) => {
    const nextTab = value as DomainTab;
    setActiveTab(nextTab);
    const nextPath = nextTab === "domain" ? `/assets/domains/${domainId}` : `/assets/domains/${domainId}/${nextTab}`;
    window.history.pushState({}, "", nextPath);
  };

  const lookalikeSelectionActionClassName = cn(
    dataTableToolbarButtonClassName,
    "shadow-none",
    highContrastPopups !== "off" && "!border-[#444] !bg-[#1a1a1a] !text-white hover:!bg-[#333]",
  );

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300 flex h-full min-h-0 flex-col">
      <Tabs className="flex h-full min-h-0 flex-col" onValueChange={handleTabChange} value={activeTab}>
        <div className="-ml-2 w-[calc(100%+0.5rem)] border-b border-border/70">
          <div className="flex shrink-0 -translate-y-1.5 items-center justify-between gap-3 px-4 pb-1.5 pt-2">
            <TabsList className="h-auto gap-1 bg-transparent p-0">
              <TabsTrigger
                className="rounded-md bg-transparent px-3 py-1 text-label-14 text-muted-foreground transition-none hover:text-foreground data-[state=active]:bg-muted/70 data-[state=active]:text-foreground data-[state=active]:shadow-none"
                value="assets"
              >
                Assets
              </TabsTrigger>
              <TabsTrigger
                className="rounded-md bg-transparent px-3 py-1 text-label-14 text-muted-foreground transition-none hover:text-foreground data-[state=active]:bg-muted/70 data-[state=active]:text-foreground data-[state=active]:shadow-none"
                value="domain"
              >
                Domain
              </TabsTrigger>
              <TabsTrigger
                className="rounded-md bg-transparent px-3 py-1 text-label-14 text-muted-foreground transition-none hover:text-foreground data-[state=active]:bg-muted/70 data-[state=active]:text-foreground data-[state=active]:shadow-none"
                value="emails"
              >
                Emails
              </TabsTrigger>
              <TabsTrigger
                className="rounded-md bg-transparent px-3 py-1 text-label-14 text-muted-foreground transition-none hover:text-foreground data-[state=active]:bg-muted/70 data-[state=active]:text-foreground data-[state=active]:shadow-none"
                value="findings"
              >
                Findings
              </TabsTrigger>
              <TabsTrigger
                className="rounded-md bg-transparent px-3 py-1 text-label-14 text-muted-foreground transition-none hover:text-foreground data-[state=active]:bg-muted/70 data-[state=active]:text-foreground data-[state=active]:shadow-none"
                value="subdomains"
              >
                Subdomains
              </TabsTrigger>
              <TabsTrigger
                className="rounded-md bg-transparent px-3 py-1 text-label-14 text-muted-foreground transition-none hover:text-foreground data-[state=active]:bg-muted/70 data-[state=active]:text-foreground data-[state=active]:shadow-none"
                value="crawler"
              >
                Crawler
              </TabsTrigger>
              <TabsTrigger
                className="rounded-md bg-transparent px-3 py-1 text-label-14 text-muted-foreground transition-none hover:text-foreground data-[state=active]:bg-muted/70 data-[state=active]:text-foreground data-[state=active]:shadow-none"
                value="technologies"
              >
                Technologies
              </TabsTrigger>
              <TabsTrigger
                className="rounded-md bg-transparent px-3 py-1 text-label-14 text-muted-foreground transition-none hover:text-foreground data-[state=active]:bg-muted/70 data-[state=active]:text-foreground data-[state=active]:shadow-none"
                value="services"
              >
                Services
              </TabsTrigger>
              <TabsTrigger
                className="rounded-md bg-transparent px-3 py-1 text-label-14 text-muted-foreground transition-none hover:text-foreground data-[state=active]:bg-muted/70 data-[state=active]:text-foreground data-[state=active]:shadow-none"
                value="lookalikes"
              >
                Lookalikes
              </TabsTrigger>
              <TabsTrigger
                className="rounded-md bg-transparent px-3 py-1 text-label-14 text-muted-foreground transition-none hover:text-foreground data-[state=active]:bg-muted/70 data-[state=active]:text-foreground data-[state=active]:shadow-none"
                value="ct-logs"
              >
                <span className="flex items-center gap-2">
                  CT Logs{" "}
                  <Badge className="border-border/80 bg-muted px-1.5 text-foreground" variant="outline">
                    {unreviewedCtLogs}
                  </Badge>
                </span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <TabsContent
            className="absolute inset-0 m-0 h-full overflow-hidden border-0 p-4 pt-5 [scrollbar-gutter:stable] data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-300 motion-reduce:animate-none"
            value="assets"
          >
            <DomainAssets className="h-full min-h-0" domainId={domain.id} organizationId={organizationId ?? ""} />
          </TabsContent>
          <TabsContent
            className="absolute inset-0 m-0 h-full overflow-hidden border-0 p-4 pt-5 [scrollbar-gutter:stable] data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-300 motion-reduce:animate-none"
            value="emails"
          >
            <DiscoveryPage domainId={domain.id} domainName={domain.root_domain} embedded kind="emails" />
          </TabsContent>
          <TabsContent
            className="absolute inset-0 m-0 h-full overflow-hidden border-0 p-4 pt-5 [scrollbar-gutter:stable] data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-300 motion-reduce:animate-none"
            value="findings"
          >
            <FindingsPage domainId={domain.id} embedded />
          </TabsContent>
          <TabsContent
            className="absolute inset-0 m-0 h-full overflow-auto border-0 p-4 pt-5 [scrollbar-gutter:stable] data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-300 motion-reduce:animate-none"
            value="domain"
          >
            <div className="flex w-full flex-col">
              <Card className="gap-0 overflow-visible rounded-lg border-0 bg-transparent py-0 ring-0">
                <CardContent className="p-0">
                  <section className="rounded-lg border border-border bg-card px-5 py-5">
                    <div className="-mx-5 -mt-5 border-b border-border px-5 pb-4 pt-5">
                      <h2 className="text-base font-medium leading-6">Domain Details</h2>
                    </div>
                    <div className="mt-5 grid gap-x-12 gap-y-6 sm:grid-cols-3">
                      <div className="min-w-0">
                        <p className="text-[14.5px] text-muted-foreground">Domain</p>
                        <p className="mt-0.5 truncate text-[14.5px]" title={domain.root_domain}>
                          {domain.root_domain}
                        </p>
                      </div>
                      <div>
                        <p className="text-[14.5px] text-muted-foreground">Verification</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[14.5px]">
                          {domain.active ? (
                            <span className="flex size-4 items-center justify-center rounded-full bg-blue-600 text-white">
                              <Check className="size-3 stroke-[3]" />
                            </span>
                          ) : (
                            <CircleX className="size-4 text-muted-foreground" />
                          )}
                          {domain.active ? "Verified" : "Awaiting verification"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[14.5px] text-muted-foreground">Verified at</p>
                        <p className="mt-0.5 text-[14.5px]">
                          {domain.verified_at ? formatDate(domain.verified_at) : "Not verified"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[14.5px] text-muted-foreground">Subdomains</p>
                        <Badge className="mt-0.5 border-border/80 bg-muted px-1.5 text-foreground" variant="outline">
                          {subdomains.length} Total
                        </Badge>
                      </div>
                      <div>
                        <p className="text-[14.5px] text-muted-foreground">Lookalikes</p>
                        <Badge className="mt-0.5 border-border/80 bg-muted px-1.5 text-foreground" variant="outline">
                          {lookalikes.length} Total
                        </Badge>
                      </div>
                    </div>
                  </section>
                </CardContent>
                <DomainIntelligence
                  className="shadow-none ring-0"
                  domainId={domain.id}
                  embedded
                  organizationId={organizationId ?? ""}
                />
              </Card>

              <div className="mt-4 flex w-full flex-col gap-4">
                <DomainWhoisResponse
                  className="shadow-none ring-0"
                  domainId={domain.id}
                  organizationId={organizationId ?? ""}
                />
                <DomainNetworkEnrichment domainId={domain.id} embedded organizationId={organizationId ?? ""} />
              </div>
            </div>
          </TabsContent>
          <TabsContent
            className="absolute inset-0 m-0 h-full overflow-hidden border-0 p-4 pt-5 [scrollbar-gutter:stable] data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-300 motion-reduce:animate-none"
            value="crawler"
          >
            <DomainCrawler
              activeDiscoveryEnabled={domain.active_scan_enabled}
              className="h-full min-h-0"
              domainId={domain.id}
              organizationId={organizationId ?? ""}
            />
          </TabsContent>
          <TabsContent
            className="absolute inset-0 m-0 h-full overflow-hidden border-0 p-4 pt-5 [scrollbar-gutter:stable] data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-300 motion-reduce:animate-none"
            value="technologies"
          >
            <DomainTechnologies
              activeDiscoveryEnabled={domain.active_scan_enabled}
              className="h-full min-h-0"
              domainId={domain.id}
              organizationId={organizationId ?? ""}
            />
          </TabsContent>
          <TabsContent
            className="absolute inset-0 m-0 h-full overflow-hidden border-0 p-4 pt-5 [scrollbar-gutter:stable] data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-300 motion-reduce:animate-none"
            value="services"
          >
            <DomainServices className="h-full min-h-0" domainId={domain.id} organizationId={organizationId ?? ""} />
          </TabsContent>
          <TabsContent
            className="absolute inset-0 m-0 h-full overflow-hidden border-0 p-4 pt-5 [scrollbar-gutter:stable] data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-300 motion-reduce:animate-none"
            value="subdomains"
          >
            <DataTable
              className="h-full min-h-0"
              columns={subdomainColumns}
              data={subdomainDetails}
              emptyMessage={`No subdomains found for ${domain.root_domain}.`}
              emptyTitle="No subdomains"
              footerClassName="h-9 border-t border-border/70 bg-[#fafafa] px-3 text-[14px] font-normal dark:bg-[#2f2f2f]"
              getRowKey={(row) => row.id}
              isLoading={false}
              onRowClick={(subdomain) => {
                setSelectedSubdomainFinding(null);
                setSelectedSubdomain(subdomain);
              }}
              searchKey={(row) =>
                `${row.value} ${row.source} ${(row.findings ?? []).map((finding) => `${finding.title} ${finding.severity} ${finding.status}`).join(" ")} ${JSON.stringify(row.attrs ?? {})}`
              }
              searchPlaceholder="Search Subdomains"
              showHeaderColumnSeparators={false}
              tableCellClassName="border-border/70 px-4 py-2 align-middle"
              tableHeaderCellClassName="h-9 border-r border-border/70 px-3 text-[14px] font-normal last:border-r-0"
              tableClassName="table-fixed w-full"
              tableContainerClassName="rounded-lg border border-border bg-card"
              tableHeaderClassName="!bg-[#fafafa] dark:!bg-card"
              tableRowClassName="h-12 w-full cursor-pointer bg-card text-foreground font-normal hover:bg-muted/30"
              toolbarInputClassName={dataTableToolbarInputClassName}
            />
            <Sheet
              onOpenChange={(open) => {
                if (!open) {
                  setSelectedSubdomainFinding(null);
                  setSelectedSubdomain(null);
                }
              }}
              open={selectedSubdomain !== null}
            >
              <SheetContent
                className="inset-y-0 right-0 h-full w-[min(48rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] gap-0 rounded-l-[1rem] rounded-r-none border-[1.14px] border-border bg-card p-0 shadow-[0_1.5px_5px_rgba(0,0,0,0.03),0_0.5px_1.5px_rgba(0,0,0,0.025)] sm:max-w-[48rem]"
                closeButtonClassName={cn(ghostButton, "top-3 right-3 z-10 size-7")}
                closeIconClassName="size-5"
                overlayClassName="bg-[hsla(0,0%,97%,0.75)] dark:bg-black/60"
              >
                {selectedSubdomain ? (
                  <>
                    <SheetHeader className="border-b border-[#eaeaea] px-3.5 pb-5 pt-4 pr-12 dark:border-border">
                      <SheetTitle className="truncate text-[17.5px] font-semibold tracking-[-0.4px] text-foreground">
                        {selectedSubdomain.value}
                      </SheetTitle>
                      <SheetDescription className="text-[13px] text-[#666666] dark:text-muted-foreground">
                        {selectedSubdomain.findings?.length ?? 0} related issue
                        {selectedSubdomain.findings?.length === 1 ? "" : "s"}. Select an issue to inspect it.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="min-h-0 flex-1 overflow-hidden px-3.5 pb-6 pt-5">
                      {selectedSubdomain.findings?.length ? (
                        <DataTable
                          className="h-full min-h-0"
                          columns={subdomainFindingColumns}
                          data={selectedSubdomain.findings}
                          emptyMessage="No related issues found."
                          emptyTitle="No issues"
                          footerClassName="h-9 border-t border-border/70 bg-[#fafafa] px-3 text-[14px] font-normal dark:bg-[#2f2f2f]"
                          getRowKey={(row) => row.id}
                          isLoading={false}
                          onRowClick={setSelectedSubdomainFinding}
                          rowClassName={(row) =>
                            selectedSubdomainFinding?.id === row.id
                              ? "bg-[#eef4ff] hover:bg-[#e5efff] dark:bg-blue-950/30 dark:hover:bg-blue-950/40"
                              : ""
                          }
                          searchKey={(row) =>
                            `${row.title} ${row.type} ${row.severity} ${row.status} ${JSON.stringify(row.details ?? {})}`
                          }
                          searchPlaceholder="Search Issues"
                          showHeaderColumnSeparators={false}
                          tableCellClassName="border-border/70 px-4 py-2 align-middle"
                          tableHeaderCellClassName="h-9 border-r border-border/70 px-3 text-[14px] font-normal last:border-r-0"
                          tableClassName="table-fixed w-full"
                          tableContainerClassName="rounded-lg border border-border bg-card"
                          tableHeaderClassName="!bg-[#fafafa] dark:!bg-card"
                          tableRowClassName="h-12 w-full cursor-pointer bg-card text-foreground font-normal hover:bg-muted/30"
                          toolbarInputClassName={dataTableToolbarInputClassName}
                        />
                      ) : (
                        <Empty className="h-full rounded-lg border-0 !bg-transparent py-8">
                          <EmptyHeader className="!bg-transparent">
                            <EmptyMedia className="mb-4 !bg-transparent">
                              <StackedCardsIllustration />
                            </EmptyMedia>
                            <EmptyTitle>No related issues</EmptyTitle>
                            <EmptyDescription>This subdomain has no flagged issues yet.</EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      )}
                    </div>
                    <Sheet
                      open={selectedSubdomainFinding !== null}
                      onOpenChange={(open) => {
                        if (!open) setSelectedSubdomainFinding(null);
                      }}
                    >
                      <SheetContent
                        className="inset-x-auto right-0 bottom-0 h-1/2 w-[min(48rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] gap-0 rounded-t-[1rem] border-t-[1.14px] border-border bg-card p-0 shadow-[0_1.5px_5px_rgba(0,0,0,0.08)] sm:max-w-[48rem]"
                        closeButtonClassName={cn(ghostButton, "top-3 right-3 z-10 size-7")}
                        closeIconClassName="size-5"
                        overlayClassName="bg-transparent"
                        side="bottom"
                      >
                        {selectedSubdomainFinding ? (
                          <>
                            <SheetHeader className="border-b border-[#eaeaea] px-5 pb-4 pt-5 pr-14 dark:border-border">
                              <div className="flex min-w-0 items-center gap-3">
                                <SheetTitle className="min-w-0 flex-1 truncate text-[17.5px] leading-6 font-semibold tracking-[-0.4px] text-foreground">
                                  {formatSubdomainIssueName(selectedSubdomainFinding.title)}
                                </SheetTitle>
                                {(() => {
                                  const severity = getSeverityChip(selectedSubdomainFinding.severity);
                                  return (
                                    <Badge
                                      className={cn("shrink-0 px-1.5 text-[13px] font-normal", severity.className)}
                                      variant="outline"
                                    >
                                      {severity.label}
                                    </Badge>
                                  );
                                })()}
                              </div>
                              <SheetDescription className="mt-1 text-[13px] text-[#666666] dark:text-muted-foreground">
                                {subdomainFindingLabel(selectedSubdomainFinding.type)}
                              </SheetDescription>
                            </SheetHeader>
                            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                              <div className={cn("grid gap-x-8 gap-y-5 sm:grid-cols-3")}>
                                {[
                                  ["Issue", selectedSubdomainFinding.title],
                                  ["Status", selectedSubdomainFinding.status || "—"],
                                  ["First seen", formatDate(selectedSubdomainFinding.first_seen_at)],
                                  ["Last seen", formatDate(selectedSubdomainFinding.last_seen_at)],
                                  ...(selectedSubdomainFinding.resolved_at
                                    ? [["Resolved", formatDate(selectedSubdomainFinding.resolved_at)]]
                                    : []),
                                ].map(([label, value]) => (
                                  <div className={cn(label === "Issue" && "sm:col-span-3")} key={label}>
                                    <p className="text-[13px] text-[#666666] dark:text-muted-foreground">{label}</p>
                                    <p
                                      className={cn(
                                        "mt-0.5 text-[14px] text-foreground",
                                        label === "Issue" ? "break-words" : "truncate",
                                      )}
                                    >
                                      {value}
                                    </p>
                                  </div>
                                ))}
                              </div>
                              <div className="-mx-5 mt-6 border-t border-[#eaeaea] px-5 pt-5 dark:border-border">
                                <div className="space-y-5">
                                  <p className="text-[13px] text-[#666666] dark:text-muted-foreground">Details</p>
                                  {selectedSubdomainFindingReason ? (
                                    <p className="break-words text-[14px] leading-5 text-foreground">
                                      {formatSubdomainDetailValue("reason", selectedSubdomainFindingReason)}
                                    </p>
                                  ) : null}
                                  {selectedSubdomainFindingExtraDetails.length > 0 ? (
                                    <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                                      {selectedSubdomainFindingExtraDetails.map(([key, value]) => (
                                        <div key={key}>
                                          <p className="text-[13px] text-[#666666] dark:text-muted-foreground">
                                            {formatDetailLabel(key)}
                                          </p>
                                          <p className="mt-0.5 break-words text-[14px] text-foreground">
                                            {formatSubdomainDetailValue(key, value)}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  ) : null}
                                  {selectedSubdomainFindingRemediation ? (
                                    <div className="-mx-5 space-y-2 border-t border-[#eaeaea] px-5 pt-5 dark:border-border">
                                      <p className="text-[13px] text-[#666666] dark:text-muted-foreground">
                                        Remediation
                                      </p>
                                      <p className="break-words whitespace-pre-wrap text-[14px] leading-5 text-foreground">
                                        {selectedSubdomainFindingRemediation}
                                      </p>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </>
                        ) : null}
                      </SheetContent>
                    </Sheet>
                  </>
                ) : null}
              </SheetContent>
            </Sheet>
          </TabsContent>
          <TabsContent
            className="absolute inset-0 m-0 h-full overflow-hidden border-0 p-4 pt-5 [scrollbar-gutter:stable] data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-300 motion-reduce:animate-none relative"
            value="lookalikes"
          >
            <DataTable
              actions={
                <DataTableRefreshButton
                  className={cn(dataTableToolbarButtonClassName, "shadow-none")}
                  isLoading={isLookalikesLoading}
                  onClick={() => void loadLookalikes()}
                />
              }
              className="h-full min-h-0"
              columns={lookalikeColumns}
              data={filteredLookalikes}
              defaultPageSize={25}
              emptyMessage={
                lookalikeFilters.length > 0
                  ? "No lookalikes match the selected filters."
                  : `No lookalikes found for ${domain.root_domain}.`
              }
              emptyTitle="No lookalikes"
              footerClassName="h-9 border-t border-border/70 bg-[#fafafa] px-3 text-[14px] font-normal dark:bg-[#2f2f2f]"
              getRowKey={(row) => row.id}
              isLoading={isLookalikesLoading}
              onRowClick={(row) => toggleLookalikeSelection(row.id)}
              rowClassName={(row) =>
                selectedLookalikeIds.has(row.id)
                  ? "bg-[#eef4ff] hover:bg-[#e5efff] dark:bg-blue-950/30 dark:hover:bg-blue-950/40"
                  : ""
              }
              searchKey={(row) =>
                `${row.title} ${formatLookalikeTechnique(row)} ${getLookalikeIps(row).join(" ")} ${row.severity} ${row.status}`
              }
              searchPlaceholder="Search Lookalikes"
              showHeaderColumnSeparators={false}
              tableCellClassName="border-border/70 px-4 py-2 align-middle"
              tableHeaderCellClassName="h-9 border-r border-border/70 px-3 text-[14px] font-normal last:border-r-0"
              tableClassName="table-fixed w-full"
              tableContainerClassName="rounded-lg border border-border bg-card"
              tableHeaderClassName="!bg-[#fafafa] dark:!bg-card"
              tableRowClassName="h-12 w-full bg-card text-foreground font-normal hover:bg-muted/30"
              toolbarButtonClassName={dataTableToolbarButtonClassName}
              toolbarInputClassName={dataTableToolbarInputClassName}
              extraToolbarContent={
                <div className="flex shrink-0 flex-wrap items-center gap-2.5">
                  <Filters
                    fields={lookalikeFilterFields}
                    filters={lookalikeFilters}
                    onChange={setLookalikeFilters}
                    trigger={
                      <Button className={cn(dataTableToolbarButtonClassName, "gap-1.5 shadow-none")} variant="outline">
                        <ListFilter className="size-4" />
                        Add Filter
                      </Button>
                    }
                  />
                  {lookalikeFilters.length > 0 ? (
                    <Button
                      className={cn(dataTableToolbarButtonClassName, "gap-1.5 shadow-none")}
                      onClick={() => setLookalikeFilters([])}
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
                selectedLookalikeIds.size > 0 && "pointer-events-auto translate-y-0 opacity-100",
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
                  {selectedLookalikeIds.size} selected
                </span>
                <Button
                  className={lookalikeSelectionActionClassName}
                  disabled={updatingLookalikes !== null}
                  onClick={() => void setSelectedLookalikesReviewed(true)}
                  size="sm"
                  variant="outline"
                >
                  Review
                </Button>
                <Button
                  className={lookalikeSelectionActionClassName}
                  disabled={updatingLookalikes !== null}
                  onClick={() => void setSelectedLookalikesReviewed(false)}
                  size="sm"
                  variant="outline"
                >
                  Reopen
                </Button>
              </div>
            </div>
          </TabsContent>
          <TabsContent
            className="absolute inset-0 m-0 h-full overflow-hidden border-0 p-4 pt-5 [scrollbar-gutter:stable] data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-300 motion-reduce:animate-none relative"
            value="ct-logs"
          >
            <CTLogs
              domainId={domain.id}
              onUnreviewedCount={setUnreviewedCtLogs}
              organizationId={organizationId ?? ""}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
