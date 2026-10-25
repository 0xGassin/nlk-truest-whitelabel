"use client";

import type { DomainLookalike, DomainSubdomain, DomainSubdomainFinding, WatchedDomain } from "@/types";
import type { ColumnDef } from "@/components/ui/data-table";
import type { Filter, FilterFieldConfig } from "@/components/ui/filters";

import { Check, CircleHelp, ListFilter, Play, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  DataTableRefreshButton,
  dataTableToolbarButtonClassName,
  dataTableToolbarInputClassName,
} from "@/components/ui/data-table";
import { Filters } from "@/components/ui/filters";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StackedCardsIllustration } from "@/components/ui/stacked-cards-illustration";
import { toast } from "@/components/ui/toast/toast";
import { useAuth } from "@/lib/auth";
import { formatTimeAgo } from "@/lib/date-utils";
import { formatDetailLabel } from "@/lib/detail-label";
import { getFindingRemediation } from "@/lib/finding-remediation";
import { parseApiError } from "@/lib/errors";
import { getOrganizationId } from "@/lib/organization";
import { ghostButton } from "@/lib/surfaces";
import { cn } from "@/lib/utils";
import { listCTFindings, setCTFindingReviewed, type CTFinding } from "@/services/api/ctlog";
import {
  listDomainCrawlerFindings,
  listDomainNetworkAssets,
  listLookalikes,
  listSubdomainDetails,
  listDomains,
  startDomainCrawler,
  updateLookalike,
  type DomainCrawlerFinding,
  type DomainNetworkAsset,
} from "@/services/api/domains";

export type GlobalAssetKind = "crawler" | "ct-logs" | "lookalikes" | "services" | "subdomains";

const LOOKALIKE_SEVERITY_RANK: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

interface GlobalAssetRow {
  categories: string;
  contentType: string;
  domain: string;
  domainId: string;
  flagged: boolean;
  firstSeen: string;
  host: string;
  id: string;
  ips: string[];
  isFinding: boolean;
  issuer: string;
  issues: string;
  kind: string;
  lastSeen: string;
  matchType: string;
  path?: string;
  port: string;
  product: string;
  resource: string;
  reviewed: boolean;
  subdomain?: DomainSubdomain;
  service: string;
  source: string;
  status: string;
  technique: string;
  tls: string;
  type: string;
  urls: string[];
  version: string;
  vulnerabilities: number;
}

function attrString(asset: DomainNetworkAsset, key: string): string {
  const value = asset.attrs?.[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function findingDetail(finding: DomainCrawlerFinding, key: string): string {
  const value = finding.details?.[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function formatDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function getCTLogName(finding: CTFinding): string {
  const names = [
    ...new Set(
      (finding.observations ?? [])
        .map((observation) => observation?.log_name || observation?.log_source)
        .filter(Boolean),
    ),
  ];
  return names.length > 0 ? names.join(", ") : "Unknown CT log";
}

function formatIssueName(value?: string): string {
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

  return raw
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
}

function formatSubdomainIssue(type?: string): string {
  if (type === "dangling_cname" || type === "dangling_cname_takeover") return "Dangling CNAMEs";
  if (type === "dangling_nameserver") return "Dangling Nameservers";
  if (type === "zone_transfer") return "Zone Transfer Issues";
  if (type === "tls_legacy_protocol") return "TLS Legacy Protocol";
  return formatIssueName(type);
}

function formatSubdomainDetailValue(key: string, value: unknown): string {
  const text = String(value);
  if (key.toLowerCase() !== "reason" || !text) return text;
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

function formatTechnique(row: DomainLookalike): string {
  const value = row.details?.technique;
  if (typeof value !== "string" || !value) return "—";
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function lookalikeIps(row: DomainLookalike): string[] {
  const value = row.details?.ips;
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
}

function tlsDetails(asset: DomainNetworkAsset): string {
  const value = asset.attrs?.tls;
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const tls = value as Record<string, unknown>;
  const subject = typeof tls.subject_cn === "string" ? tls.subject_cn : "";
  const issuer = typeof tls.issuer_cn === "string" ? tls.issuer_cn : "";
  return [subject, issuer ? `issued by ${issuer}` : ""].filter(Boolean).join(" · ");
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

function lookalikeSeverityRank(value: string): number {
  return LOOKALIKE_SEVERITY_RANK[value.trim().toLowerCase()] ?? -1;
}

function rowValues(kind: GlobalAssetKind, row: GlobalAssetRow): Record<string, string> {
  if (kind === "crawler") {
    return {
      content_type: row.contentType,
      domain: row.domain,
      host: row.host,
      kind: row.kind.toLowerCase(),
      path: row.path ?? "",
      source: row.source,
      status: row.status,
    };
  }
  if (kind === "subdomains") {
    return { domain: row.domain, issues: row.issues, source: row.source, status: row.status, subdomain: row.resource };
  }
  if (kind === "services") {
    return {
      domain: row.domain,
      ip: row.host,
      port: row.port,
      product: row.product,
      service: row.service,
      tls: row.tls,
    };
  }
  if (kind === "lookalikes") {
    return { domain: row.domain, severity: row.source, status: row.status, technique: row.technique };
  }
  return {
    domain: row.domain,
    issuer: row.issuer,
    match_type: row.matchType,
    matched_san: row.resource,
    reviewed: row.reviewed ? "reviewed" : "unreviewed",
    source: row.source,
  };
}

async function loadRows(
  kind: GlobalAssetKind,
  organizationId: string,
  domains: WatchedDomain[],
): Promise<GlobalAssetRow[]> {
  const results = await Promise.all(
    domains.map(async (domain) => {
      if (kind === "ct-logs") {
        const findings = await listCTFindings(organizationId, domain.id);
        return findings.map((finding) => ({
          categories: "",
          contentType: "",
          domain: domain.root_domain,
          domainId: domain.id,
          flagged: false,
          firstSeen: finding.certificate?.first_seen_at ?? "",
          host: "",
          id: `${domain.id}:${finding.id}`,
          ips: [],
          isFinding: false,
          issuer: finding.certificate?.issuer ?? "",
          issues: "",
          kind: "",
          lastSeen: "",
          matchType: finding.match_type,
          port: "",
          product: "",
          resource: finding.matched_san,
          reviewed: finding.reviewed,
          service: "",
          source: getCTLogName(finding),
          status: finding.reviewed ? "Reviewed" : "Needs review",
          technique: "",
          tls: "",
          type: "",
          urls: [],
          version: "",
          vulnerabilities: 0,
        }));
      }

      if (kind === "lookalikes") {
        const lookalikes = await listLookalikes(organizationId, domain.id);
        return lookalikes.map((lookalike) => ({
          categories: "",
          contentType: "",
          domain: domain.root_domain,
          domainId: domain.id,
          flagged: false,
          firstSeen: lookalike.first_seen_at,
          host: "",
          id: `${domain.id}:${lookalike.id}`,
          ips: lookalikeIps(lookalike),
          isFinding: false,
          issuer: "",
          issues: "",
          kind: "",
          lastSeen: lookalike.last_seen_at,
          matchType: "",
          port: "",
          product: "",
          resource: lookalike.title,
          reviewed: false,
          service: "",
          source: lookalike.severity,
          status: lookalike.status,
          technique: formatTechnique(lookalike),
          tls: "",
          type: "",
          urls: [],
          version: "",
          vulnerabilities: 0,
        }));
      }

      if (kind === "subdomains") {
        const subdomains = await listSubdomainDetails(organizationId, domain.id);
        return subdomains.map((subdomain) => ({
          categories: "",
          contentType: "",
          domain: domain.root_domain,
          domainId: domain.id,
          flagged: false,
          firstSeen: subdomain.first_seen_at,
          host: "",
          id: `${domain.id}:${subdomain.id}`,
          ips: [],
          isFinding: false,
          issuer: "",
          issues: [...new Set((subdomain.findings ?? []).map((finding) => formatSubdomainIssue(finding.type)))].join(
            ", ",
          ),
          kind: "",
          lastSeen: subdomain.last_seen_at,
          matchType: "",
          port: "",
          product: "",
          resource: subdomain.value,
          reviewed: false,
          service: "",
          source: subdomain.source,
          status: subdomain.findings?.length ? subdomain.findings[0].status : "",
          subdomain,
          technique: "",
          tls: "",
          type: "",
          urls: [],
          version: "",
          vulnerabilities: subdomain.findings?.length ?? 0,
        }));
      }

      if (kind === "services") {
        const assets = await listDomainNetworkAssets(organizationId, domain.id);
        return assets
          .filter((asset) => asset.type === "service")
          .map((asset, index) => ({
            categories: "",
            contentType: "",
            domain: domain.root_domain,
            domainId: domain.id,
            flagged: false,
            firstSeen: "",
            host: attrString(asset, "ip"),
            id: `${domain.id}:${asset.value}:${index}`,
            ips: [],
            isFinding: false,
            issuer: "",
            issues: "",
            kind: "",
            lastSeen: "",
            matchType: "",
            port: [attrString(asset, "port"), attrString(asset, "transport")].filter(Boolean).join(" / "),
            product: [attrString(asset, "product"), attrString(asset, "version")].filter(Boolean).join(" "),
            resource: "",
            reviewed: false,
            service: attrString(asset, "service_name") || asset.value,
            source: "",
            status: "",
            technique: "",
            tls: tlsDetails(asset),
            type: "",
            urls: [],
            version: "",
            vulnerabilities: Array.isArray(asset.attrs?.shodan_vulns) ? asset.attrs.shodan_vulns.length : 0,
          }));
      }

      const [assets, findings] = await Promise.all([
        listDomainNetworkAssets(organizationId, domain.id),
        listDomainCrawlerFindings(organizationId, domain.id),
      ]);
      const flaggedUrls = new Set(findings.map((finding) => findingDetail(finding, "url")).filter(Boolean));
      return [
        ...assets
          .filter((asset) => asset.type === "url")
          .map((asset) => ({
            categories: "",
            contentType: attrString(asset, "content_type"),
            domain: domain.root_domain,
            domainId: domain.id,
            flagged: flaggedUrls.has(asset.value),
            firstSeen: "",
            host: attrString(asset, "host"),
            id: `${domain.id}:url:${asset.value}`,
            ips: [],
            isFinding: false,
            issuer: "",
            issues: "",
            kind: "URL",
            lastSeen: "",
            matchType: "",
            path: attrString(asset, "path"),
            port: "",
            product: "",
            resource: asset.value,
            reviewed: false,
            service: "",
            source: attrString(asset, "via") || asset.source,
            status: attrString(asset, "status"),
            technique: "",
            tls: "",
            type: "",
            urls: [asset.value],
            version: "",
            vulnerabilities: 0,
          })),
        ...findings.map((finding) => ({
          categories: "",
          contentType: "",
          domain: domain.root_domain,
          domainId: domain.id,
          flagged: true,
          firstSeen: finding.first_seen_at,
          host: findingDetail(finding, "host"),
          id: `${domain.id}:finding:${finding.id}`,
          ips: [],
          isFinding: true,
          issuer: "",
          issues: "",
          kind: "Finding",
          lastSeen: finding.last_seen_at,
          matchType: "",
          path: findingDetail(finding, "path"),
          port: "",
          product: "",
          resource: finding.title,
          reviewed: false,
          service: "",
          source: finding.severity,
          status: finding.status,
          technique: "",
          tls: "",
          type: finding.type,
          urls: [findingDetail(finding, "url")].filter(Boolean),
          version: "",
          vulnerabilities: 0,
        })),
      ];
    }),
  );

  return results.flat();
}

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

function filterFields(kind: GlobalAssetKind, domains: WatchedDomain[], rows: GlobalAssetRow[]): FilterFieldConfig[] {
  const domainField: FilterFieldConfig = {
    key: "domain",
    label: "Domain",
    options: domains.map((domain) => ({ label: domain.root_domain, value: domain.root_domain })),
    type: "select",
  };
  if (kind === "crawler") {
    return [
      domainField,
      {
        key: "kind",
        label: "Result type",
        options: [
          { label: "URL", value: "url" },
          { label: "Finding", value: "finding" },
        ],
        type: "select",
      },
      { key: "host", label: "Host", type: "text" },
      { key: "path", label: "Path", type: "text" },
      { key: "source", label: "Source / severity", type: "text" },
      { key: "content_type", label: "Content type", type: "text" },
      {
        key: "status",
        label: "Status",
        options: [...new Set(rows.map((row) => row.status).filter(Boolean))].map((value) => ({ label: value, value })),
        type: "select",
      },
    ];
  }
  if (kind === "subdomains") {
    return [
      domainField,
      { key: "subdomain", label: "Subdomain", type: "text" },
      { key: "source", label: "Source", type: "text" },
      { key: "issues", label: "Issues", type: "text" },
      { key: "status", label: "Status", type: "text" },
    ];
  }
  if (kind === "services") {
    return [
      domainField,
      { key: "service", label: "Service", type: "text" },
      { key: "product", label: "Product", type: "text" },
      { key: "ip", label: "IP", type: "text" },
      { key: "port", label: "Port", type: "text" },
      { key: "tls", label: "TLS", type: "text" },
    ];
  }
  if (kind === "lookalikes") {
    return [
      domainField,
      {
        key: "status",
        label: "Status",
        options: [
          { label: "Open", value: "open" },
          { label: "Reviewed", value: "reviewed" },
          { label: "Resolved", value: "resolved" },
        ],
        type: "select",
      },
      {
        key: "severity",
        label: "Severity",
        options: [...new Set(rows.map((row) => row.source).filter(Boolean))].map((value) => ({ label: value, value })),
        type: "select",
      },
      { key: "technique", label: "Technique", type: "text" },
    ];
  }
  return [
    domainField,
    {
      key: "reviewed",
      label: "Status",
      operators: [
        { label: "is", value: "is" },
        { label: "is not", value: "is_not" },
      ],
      options: [
        { label: "Needs review", value: "unreviewed" },
        { label: "Reviewed", value: "reviewed" },
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
      options: [...new Set(rows.map((row) => row.matchType))].map((value) => ({
        label: value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase()),
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
  ];
}

const tableHeaderCellClassName = "h-9 border-r border-border/70 px-3 text-[14px] font-normal last:border-r-0";
const tableHeaderClassName = "!bg-[#fafafa] dark:!bg-card";
const tableCellClassName = "border-border/70 px-4 py-2 align-middle";
const tableRowClassName = "h-12 w-full bg-card text-foreground font-normal hover:bg-muted/30";

function GlobalSubdomainDrawer({ onClose, subdomain }: { onClose: () => void; subdomain: DomainSubdomain }) {
  const [selectedFinding, setSelectedFinding] = useState<DomainSubdomainFinding | null>(null);
  const selectedFindingDetails = useMemo(
    () =>
      Object.entries(selectedFinding?.details ?? {}).filter(
        ([key, value]) =>
          key.toLowerCase() !== "check" &&
          key.toLowerCase() !== "host" &&
          !(selectedFinding?.type?.toLowerCase().includes("dns") && key.toLowerCase() === "domain") &&
          ["string", "number", "boolean"].includes(typeof value),
      ),
    [selectedFinding],
  );
  const selectedFindingReason = selectedFindingDetails.find(([key]) => key.toLowerCase() === "reason")?.[1];
  const selectedFindingRemediation = getFindingRemediation(selectedFinding?.details, selectedFinding?.remediation);
  const selectedFindingExtraDetails = selectedFindingDetails.filter(
    ([key]) => !["reason", "remediation"].includes(key.toLowerCase()),
  );
  const findingColumns = useMemo<ColumnDef<DomainSubdomainFinding>[]>(
    () => [
      {
        cell: (row) => (
          <span className="block truncate text-[14px] font-normal" title={formatIssueName(row.title)}>
            {formatIssueName(row.title)}
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
          <span className="block truncate text-[14px] font-normal" title={formatSubdomainIssue(row.type)}>
            {formatSubdomainIssue(row.type)}
          </span>
        ),
        header: "Type",
        id: "type",
        sortable: true,
        sortValue: (row) => row.type,
        width: "1.35fr",
      },
      {
        cell: (row) => <SeverityBadge severity={row.severity} />,
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

  return (
    <Sheet
      onOpenChange={(open) => {
        if (!open) {
          setSelectedFinding(null);
          onClose();
        }
      }}
      open
    >
      <SheetContent
        className="inset-y-0 right-0 h-full w-[min(48rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] gap-0 rounded-l-[1rem] rounded-r-none border-[1.14px] border-border bg-card p-0 shadow-[0_1.5px_5px_rgba(0,0,0,0.03),0_0.5px_1.5px_rgba(0,0,0,0.025)] sm:max-w-[48rem]"
        closeButtonClassName={cn(ghostButton, "top-3 right-3 z-10 size-7")}
        closeIconClassName="size-5"
        overlayClassName="bg-[hsla(0,0%,97%,0.75)] dark:bg-black/60"
      >
        <SheetHeader className="border-b border-[#eaeaea] px-3.5 pb-5 pt-4 pr-12 dark:border-border">
          <SheetTitle className="truncate text-[17.5px] font-semibold tracking-[-0.4px] text-foreground">
            {subdomain.value}
          </SheetTitle>
          <SheetDescription className="text-[13px] text-[#666666] dark:text-muted-foreground">
            {subdomain.findings.length} related issue{subdomain.findings.length === 1 ? "" : "s"}. Select an issue to
            inspect it.
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-hidden px-3.5 pb-6 pt-5">
          {subdomain.findings.length ? (
            <DataTable
              className="h-full min-h-0"
              columns={findingColumns}
              data={subdomain.findings}
              emptyMessage="No related issues found."
              emptyTitle="No issues"
              footerClassName="h-9 border-t border-border/70 bg-[#fafafa] px-3 text-[14px] font-normal dark:bg-[#2f2f2f]"
              getRowKey={(row) => row.id}
              isLoading={false}
              onRowClick={setSelectedFinding}
              rowClassName={(row) =>
                selectedFinding?.id === row.id
                  ? "bg-[#eef4ff] hover:bg-[#e5efff] dark:bg-blue-950/30 dark:hover:bg-blue-950/40"
                  : ""
              }
              searchKey={(row) =>
                `${row.title} ${row.type} ${row.severity} ${row.status} ${JSON.stringify(row.details ?? {})}`
              }
              searchPlaceholder="Search Issues"
              showHeaderColumnSeparators={false}
              tableCellClassName={tableCellClassName}
              tableHeaderCellClassName={tableHeaderCellClassName}
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
          onOpenChange={(open) => {
            if (!open) setSelectedFinding(null);
          }}
          open={selectedFinding !== null}
        >
          <SheetContent
            className="inset-x-auto right-0 bottom-0 h-1/2 w-[min(48rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] gap-0 rounded-t-[1rem] border-t-[1.14px] border-border bg-card p-0 shadow-[0_1.5px_5px_rgba(0,0,0,0.08)] sm:max-w-[48rem]"
            closeButtonClassName={cn(ghostButton, "top-3 right-3 z-10 size-7")}
            closeIconClassName="size-5"
            overlayClassName="bg-transparent"
            side="bottom"
          >
            {selectedFinding ? (
              <>
                <SheetHeader className="border-b border-[#eaeaea] px-5 pb-4 pt-5 pr-14 dark:border-border">
                  <div className="flex min-w-0 items-center gap-3">
                    <SheetTitle className="min-w-0 flex-1 truncate text-[17.5px] leading-6 font-semibold tracking-[-0.4px] text-foreground">
                      {formatIssueName(selectedFinding.title)}
                    </SheetTitle>
                    <SeverityBadge severity={selectedFinding.severity} />
                  </div>
                  <SheetDescription className="mt-1 text-[13px] text-[#666666] dark:text-muted-foreground">
                    {formatSubdomainIssue(selectedFinding.type)}
                  </SheetDescription>
                </SheetHeader>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                  <div className="grid gap-x-8 gap-y-5 sm:grid-cols-3">
                    {[
                      ["Issue", selectedFinding.title],
                      ["Status", selectedFinding.status || "—"],
                      ["First seen", formatDate(selectedFinding.first_seen_at)],
                      ["Last seen", formatDate(selectedFinding.last_seen_at)],
                      ...(selectedFinding.resolved_at ? [["Resolved", formatDate(selectedFinding.resolved_at)]] : []),
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
                      {selectedFindingReason ? (
                        <p className="break-words text-[14px] leading-5 text-foreground">
                          {formatSubdomainDetailValue("reason", selectedFindingReason)}
                        </p>
                      ) : null}
                      {selectedFindingExtraDetails.length > 0 ? (
                        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                          {selectedFindingExtraDetails.map(([key, value]) => (
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
                      {selectedFindingRemediation ? (
                        <div className="-mx-5 space-y-2 border-t border-[#eaeaea] px-5 pt-5 dark:border-border">
                          <p className="text-[13px] text-[#666666] dark:text-muted-foreground">Remediation</p>
                          <p className="break-words whitespace-pre-wrap text-[14px] leading-5 text-foreground">
                            {selectedFindingRemediation}
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
      </SheetContent>
    </Sheet>
  );
}

export function GlobalAssetsPage({ kind }: { kind: GlobalAssetKind }) {
  const { user } = useAuth();
  const organizationId = getOrganizationId(user);
  const [domains, setDomains] = useState<WatchedDomain[]>([]);
  const [rows, setRows] = useState<GlobalAssetRow[]>([]);
  const [filters, setFilters] = useState<Filter[]>(() =>
    kind === "ct-logs"
      ? [{ field: "reviewed", id: "global-ct-logs-default-status", operator: "is", values: ["unreviewed"] }]
      : [],
  );
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [selectedSubdomain, setSelectedSubdomain] = useState<DomainSubdomain | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!organizationId) {
      setDomains([]);
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const allDomains = await listDomains(organizationId);
      const activeDomains = allDomains.filter((domain) => domain.active);
      setDomains(activeDomains);
      setRows(await loadRows(kind, organizationId, activeDomains));
      setSelectedIds(new Set());
    } catch (error) {
      toast.error(`Could not load ${kind.replaceAll("-", " ")}`, { description: parseApiError(error).message });
    } finally {
      setLoading(false);
    }
  }, [kind, organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleRows = useMemo(
    () =>
      rows.filter((row) => filters.every((filter) => matchesFilter(rowValues(kind, row)[filter.field] ?? "", filter))),
    [filters, kind, rows],
  );

  const fields = useMemo(() => filterFields(kind, domains, rows), [domains, kind, rows]);

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
      const allSelected = visibleRows.length > 0 && visibleRows.every((row) => current.has(row.id));
      visibleRows.forEach((row) => (allSelected ? next.delete(row.id) : next.add(row.id)));
      return next;
    });
  };

  const updateReviewState = async (row: GlobalAssetRow, reviewed: boolean) => {
    setUpdatingId(row.id);
    try {
      if (kind === "ct-logs") {
        const findingId = row.id.slice(row.domainId.length + 1);
        await setCTFindingReviewed(organizationId ?? "", findingId, reviewed);
        setRows((current) =>
          current.map((item) =>
            item.id === row.id ? { ...item, reviewed, status: reviewed ? "Reviewed" : "Needs review" } : item,
          ),
        );
        toast.success(reviewed ? "CT Log Reviewed" : "CT Log Reopened", {
          description: reviewed
            ? `${row.resource} has been marked as reviewed.`
            : `${row.resource} is back in your review queue.`,
        });
      } else if (kind === "lookalikes") {
        const lookalikeId = row.id.slice(row.domainId.length + 1);
        await updateLookalike(organizationId ?? "", row.domainId, lookalikeId, { reviewed });
        setRows((current) =>
          current.map((item) =>
            item.id === row.id ? { ...item, reviewed, status: reviewed ? "reviewed" : "open" } : item,
          ),
        );
        toast.success(reviewed ? "Lookalike Reviewed" : "Lookalike Reopened", {
          description: reviewed
            ? `${row.resource} has been marked as reviewed.`
            : `${row.resource} is back in your open findings.`,
        });
      }
    } catch (error) {
      toast.error("Could not update row", { description: parseApiError(error).message });
    } finally {
      setUpdatingId(null);
    }
  };

  const bulkUpdate = async (reviewed: boolean) => {
    const selectedRows = rows.filter((row) => selectedIds.has(row.id));
    setUpdatingId("bulk");
    try {
      await Promise.all(
        selectedRows.map((row) =>
          kind === "ct-logs"
            ? setCTFindingReviewed(organizationId ?? "", row.id.slice(row.domainId.length + 1), reviewed)
            : updateLookalike(organizationId ?? "", row.domainId, row.id.slice(row.domainId.length + 1), { reviewed }),
        ),
      );
      setRows((current) =>
        current.map((row) =>
          selectedIds.has(row.id)
            ? {
                ...row,
                reviewed,
                status: kind === "ct-logs" ? (reviewed ? "Reviewed" : "Needs review") : reviewed ? "reviewed" : "open",
              }
            : row,
        ),
      );
      setSelectedIds(new Set());
      toast.success(
        kind === "ct-logs"
          ? `${selectedRows.length} CT Log${selectedRows.length === 1 ? "" : "s"} ${reviewed ? "Reviewed" : "Reopened"}`
          : `${selectedRows.length} lookalike${selectedRows.length === 1 ? "" : "s"} ${reviewed ? "Reviewed" : "Reopened"}`,
        {
          description:
            kind === "ct-logs"
              ? reviewed
                ? "The selected CT logs have been marked as reviewed."
                : "The selected CT logs are back in your review queue."
              : reviewed
                ? "The selected lookalikes have been marked as reviewed."
                : "The selected lookalikes are back in your open findings.",
        },
      );
    } catch (error) {
      toast.error("Could not update selected rows", { description: parseApiError(error).message });
    } finally {
      setUpdatingId(null);
    }
  };

  const startAllScans = async () => {
    if (!organizationId) return;
    setStarting(true);
    try {
      const results = await Promise.allSettled(domains.map((domain) => startDomainCrawler(organizationId, domain.id)));
      const queued = results.filter((result) => result.status === "fulfilled" && result.value).length;
      toast.success("Crawler scans requested", {
        description: `${queued} domain${queued === 1 ? "" : "s"} queued for scanning.`,
      });
    } catch (error) {
      toast.error("Could not start crawler scans", { description: parseApiError(error).message });
    } finally {
      setStarting(false);
    }
  };

  const crawlerColumns = useMemo<ColumnDef<GlobalAssetRow>[]>(
    () => [
      {
        cell: (row) => (
          <span className="block truncate text-[14px] font-normal" title={row.domain}>
            {row.domain}
          </span>
        ),
        header: "Domain",
        id: "domain",
        sortable: true,
        sortValue: (row) => row.domain,
        width: "1.2fr",
      },
      {
        cell: (row) =>
          row.urls[0] ? (
            <a
              className="block min-w-0 truncate text-[14px] font-normal text-foreground underline-offset-4 hover:text-primary hover:underline"
              href={row.urls[0]}
              rel="noreferrer"
              target="_blank"
              title={row.resource}
            >
              {row.resource}
            </a>
          ) : (
            <span className="block truncate text-[14px] font-normal" title={row.resource}>
              {row.resource}
            </span>
          ),
        header: "Resource",
        id: "resource",
        sortable: true,
        sortValue: (row) => row.resource,
        width: "2.6fr",
      },
      {
        cell: (row) => <span className="text-[14px] font-normal">{row.kind}</span>,
        header: "Type",
        id: "kind",
        sortable: true,
        sortValue: (row) => row.kind,
        width: "0.9fr",
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
        width: "1.1fr",
      },
      {
        cell: (row) => (
          <span className="block truncate text-[14px] font-normal" title={row.path}>
            {row.path || "—"}
          </span>
        ),
        header: "Path",
        id: "path",
        sortable: true,
        sortValue: (row) => row.path ?? "",
        width: "1.2fr",
      },
      {
        cell: (row) => (
          <span className="block truncate text-[14px] font-normal" title={row.source}>
            {row.source || "—"}
          </span>
        ),
        header: "Source",
        id: "source",
        sortable: true,
        sortValue: (row) => row.source,
        width: "1fr",
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
            <span className="text-[14px] font-normal">—</span>
          ),
        header: "Flag",
        id: "flagged",
        sortable: true,
        sortValue: (row) => (row.flagged ? 1 : 0),
        width: "0.8fr",
      },
      {
        cell: (row) => (
          <span
            className={cn(
              "font-mono text-[14px] font-normal text-foreground",
              row.kind.toLowerCase() === "url" && row.status === "200" && "text-emerald-600 dark:text-emerald-500",
            )}
          >
            {row.status || "—"}
          </span>
        ),
        header: "Status",
        id: "status",
        sortable: true,
        sortValue: (row) => row.status,
        width: "0.9fr",
      },
    ],
    [],
  );

  const subdomainColumns = useMemo<ColumnDef<GlobalAssetRow>[]>(
    () => [
      {
        cell: (row) => (
          <span className="block truncate text-[14px] font-normal" title={row.domain}>
            {row.domain}
          </span>
        ),
        header: "Domain",
        id: "domain",
        sortable: true,
        sortValue: (row) => row.domain,
        width: "1.2fr",
      },
      {
        cell: (row) => (
          <span className="block truncate text-[14px] font-normal" title={row.resource}>
            {row.resource}
          </span>
        ),
        header: "Subdomain",
        id: "subdomain",
        sortable: true,
        sortValue: (row) => row.resource,
        width: "1.8fr",
      },
      {
        cell: (row) => <span className="whitespace-nowrap text-[14px] font-normal">{formatDate(row.firstSeen)}</span>,
        header: "First seen",
        id: "first_seen",
        sortable: true,
        sortValue: (row) => row.firstSeen,
        width: "1fr",
      },
      {
        cell: (row) => <span className="whitespace-nowrap text-[14px] font-normal">{formatDate(row.lastSeen)}</span>,
        header: "Last seen",
        id: "last_seen",
        sortable: true,
        sortValue: (row) => row.lastSeen,
        width: "1fr",
      },
      {
        cell: (row) => <span className="text-[14px] font-normal">{row.vulnerabilities || "—"}</span>,
        header: "Vulnerabilities",
        id: "vulnerabilities",
        sortable: true,
        sortValue: (row) => row.vulnerabilities,
        width: "1.1fr",
      },
      {
        cell: (row) => (
          <span className="block truncate text-[14px] font-normal" title={row.issues}>
            {row.issues || "—"}
          </span>
        ),
        header: "Issues",
        id: "issues",
        sortable: true,
        sortValue: (row) => row.issues,
        width: "1.8fr",
      },
    ],
    [],
  );

  const serviceColumns = useMemo<ColumnDef<GlobalAssetRow>[]>(
    () => [
      {
        cell: (row) => (
          <span className="block truncate text-[14px] font-normal" title={row.domain}>
            {row.domain}
          </span>
        ),
        header: "Domain",
        id: "domain",
        sortable: true,
        sortValue: (row) => row.domain,
        width: "1.2fr",
      },
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
        cell: (row) => <span className="font-mono text-[14px] font-normal">{row.host || "—"}</span>,
        header: "IP",
        id: "ip",
        sortable: true,
        sortValue: (row) => row.host,
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

  const lookalikeColumns = useMemo<ColumnDef<GlobalAssetRow>[]>(
    () => [
      {
        align: "center",
        cell: (row) => (
          <div className="flex h-full items-center justify-center">
            <SelectionCheckbox
              checked={selectedIds.has(row.id)}
              label={`Select ${row.resource}`}
              onChange={() => toggleSelection(row.id)}
            />
          </div>
        ),
        header: (
          <SelectionCheckbox
            checked={visibleRows.length > 0 && visibleRows.every((row) => selectedIds.has(row.id))}
            className="translate-y-[2px]"
            label="Select all lookalikes"
            onChange={toggleAll}
          />
        ),
        id: "select",
        sortable: false,
        width: "44px",
      },
      {
        cell: (row) => (
          <span className="block truncate text-[14px] font-normal" title={row.domain}>
            {row.domain}
          </span>
        ),
        header: "Domain",
        id: "domain",
        sortable: true,
        sortValue: (row) => row.domain,
        width: "1.2fr",
      },
      {
        cell: (row) => (
          <span className="block truncate text-[14px] font-normal" title={row.resource}>
            {row.resource}
          </span>
        ),
        header: "Lookalike",
        id: "title",
        sortable: true,
        sortValue: (row) => row.resource,
        width: "2fr",
      },
      {
        cell: (row) => (
          <span className="block truncate text-[14px] font-normal" title={row.technique}>
            {row.technique}
          </span>
        ),
        header: "Technique",
        id: "technique",
        sortable: true,
        sortValue: (row) => row.technique,
        width: "1.3fr",
      },
      {
        cell: (row) => (
          <span className="block truncate font-mono text-[14px] font-normal" title={row.ips.join(", ")}>
            {row.ips.slice(0, 2).join(", ") || "—"}
            {row.ips.length > 2 ? ` +${row.ips.length - 2}` : ""}
          </span>
        ),
        header: "IPs",
        id: "ips",
        sortable: true,
        sortValue: (row) => row.ips.length,
        width: "1.5fr",
      },
      {
        cell: (row) => <SeverityBadge severity={row.source} />,
        header: "Severity",
        id: "severity",
        sortable: true,
        sortValue: (row) => lookalikeSeverityRank(row.source),
        width: "0.9fr",
      },
      {
        cell: (row) => <span className="text-[14px] font-normal capitalize">{row.status || "—"}</span>,
        header: "Status",
        id: "status",
        sortable: true,
        sortValue: (row) => row.status,
        width: "0.9fr",
      },
      {
        cell: (row) => <span className="whitespace-nowrap text-[14px] font-normal">{formatDate(row.lastSeen)}</span>,
        header: "Last seen",
        id: "last_seen",
        sortable: true,
        sortValue: (row) => row.lastSeen,
        width: "1.1fr",
      },
      {
        align: "right",
        cell: (row) => (
          <Button
            aria-label={row.status === "open" ? "Review lookalike" : "Reopen lookalike"}
            className="group size-8"
            disabled={updatingId !== null}
            onClick={(event) => {
              event.stopPropagation();
              void updateReviewState(row, row.status === "open");
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
    [selectedIds, updatingId, visibleRows],
  );

  const ctColumns = useMemo<ColumnDef<GlobalAssetRow>[]>(
    () => [
      {
        align: "center",
        cell: (row) => (
          <div className="flex h-full items-center justify-center">
            <SelectionCheckbox
              checked={selectedIds.has(row.id)}
              label={`Select ${row.resource}`}
              onChange={() => toggleSelection(row.id)}
            />
          </div>
        ),
        header: (
          <SelectionCheckbox
            checked={visibleRows.length > 0 && visibleRows.every((row) => selectedIds.has(row.id))}
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
        cell: (row) => (
          <span className="block truncate text-[14px] font-normal" title={row.domain}>
            {row.domain}
          </span>
        ),
        header: "Domain",
        id: "domain",
        sortable: true,
        sortValue: (row) => row.domain,
        width: "1.2fr",
      },
      {
        cell: (row) => (
          <span className="block truncate text-[14px] font-normal" title={row.resource}>
            {row.resource}
          </span>
        ),
        header: "Matched SAN",
        id: "matched_san",
        sortable: true,
        sortValue: (row) => row.resource,
        width: "2fr",
      },
      {
        cell: (row) => <span className="text-[14px] font-normal capitalize">{row.matchType || "—"}</span>,
        header: "Match type",
        id: "match_type",
        sortable: true,
        sortValue: (row) => row.matchType,
        width: "1fr",
      },
      {
        cell: (row) => (
          <span className="block truncate text-[14px] font-normal" title={row.source}>
            {row.source || "—"}
          </span>
        ),
        header: "CT log",
        id: "ct_log",
        sortable: true,
        sortValue: (row) => row.source,
        width: "2fr",
      },
      {
        cell: (row) => (
          <span className="block truncate text-[14px] font-normal" title={row.issuer}>
            {row.issuer || "—"}
          </span>
        ),
        header: "Issuer",
        id: "issuer",
        sortable: true,
        sortValue: (row) => row.issuer,
        width: "2fr",
      },
      {
        cell: (row) => (
          <span className="whitespace-nowrap text-[14px] font-normal text-foreground">
            {row.firstSeen ? formatTimeAgo(row.firstSeen) : "—"}
          </span>
        ),
        header: "First seen",
        id: "first_seen",
        sortable: true,
        sortValue: (row) => row.firstSeen,
        width: "1fr",
      },
      {
        cell: (row) => <span className="text-[14px] font-normal">{row.reviewed ? "Reviewed" : "Needs review"}</span>,
        header: "Status",
        id: "status",
        sortable: true,
        sortValue: (row) => (row.reviewed ? "Reviewed" : "Needs review"),
        width: "1fr",
      },
      {
        align: "right",
        cell: (row) => (
          <Button
            aria-label={row.reviewed ? "Reopen CT log" : "Review CT log"}
            className="group size-8"
            disabled={updatingId !== null}
            onClick={(event) => {
              event.stopPropagation();
              void updateReviewState(row, !row.reviewed);
            }}
            size="sm"
            variant="ghost"
          >
            {row.reviewed ? (
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
    [selectedIds, updatingId, visibleRows],
  );

  const columns =
    kind === "crawler"
      ? crawlerColumns
      : kind === "subdomains"
        ? subdomainColumns
        : kind === "services"
          ? serviceColumns
          : kind === "lookalikes"
            ? lookalikeColumns
            : ctColumns;
  const title = kind === "ct-logs" ? "CT Logs" : kind.charAt(0).toUpperCase() + kind.slice(1);
  const toolbarButtonClassName = cn(dataTableToolbarButtonClassName, "shadow-none");
  const isSelectable = kind === "ct-logs" || kind === "lookalikes";

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden p-4">
      <DataTable
        actions={
          kind === "crawler" ? (
            <div className="flex items-center gap-2">
              <Button
                className={cn(toolbarButtonClassName, "gap-1.5")}
                disabled={starting || domains.length === 0}
                onClick={() => void startAllScans()}
                variant="outline"
              >
                <Play className="size-4" />
                {starting ? "Starting" : "Start scans"}
              </Button>
              <DataTableRefreshButton
                className={toolbarButtonClassName}
                isLoading={loading}
                onClick={() => void load()}
              />
            </div>
          ) : (
            <DataTableRefreshButton
              className={toolbarButtonClassName}
              isLoading={loading}
              onClick={() => void load()}
            />
          )
        }
        columns={columns}
        data={visibleRows}
        defaultPageSize={25}
        defaultSort={kind === "lookalikes" ? { direction: "desc", key: "severity" } : null}
        emptyMessage={
          kind === "ct-logs"
            ? "No CT logs found."
            : domains.length === 0
              ? "Verify a domain to start collecting global asset data."
              : `No ${title.toLowerCase()} found for the selected filters.`
        }
        emptyTitle={kind === "ct-logs" ? "No CT logs" : `No ${title.toLowerCase()}`}
        getRowKey={(row) => row.id}
        isLoading={loading}
        infiniteScroll={kind === "ct-logs"}
        onRowClick={
          kind === "subdomains"
            ? (row) => {
                if (row.subdomain) setSelectedSubdomain(row.subdomain);
              }
            : isSelectable
              ? (row) => toggleSelection(row.id)
              : undefined
        }
        rowClassName={(row) =>
          isSelectable && selectedIds.has(row.id)
            ? "bg-[#eef4ff] hover:bg-[#e5efff] dark:bg-blue-950/30 dark:hover:bg-blue-950/40"
            : ""
        }
        className="h-full min-h-0"
        searchKey={(row) =>
          `${row.domain} ${row.resource} ${row.host} ${row.source} ${row.status} ${row.issuer} ${row.product} ${row.service}`
        }
        searchPlaceholder={`Search ${title}`}
        showHeaderColumnSeparators={false}
        tableCellClassName={tableCellClassName}
        tableClassName="table-fixed w-full"
        tableContainerClassName="rounded-lg border border-border bg-card"
        tableHeaderCellClassName={tableHeaderCellClassName}
        tableHeaderClassName={tableHeaderClassName}
        tableRowClassName={cn(tableRowClassName, kind === "subdomains" && "cursor-pointer")}
        toolbarButtonClassName={toolbarButtonClassName}
        toolbarInputClassName={dataTableToolbarInputClassName}
        extraToolbarContent={
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <Filters
              fields={fields}
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
      {selectedSubdomain ? (
        <GlobalSubdomainDrawer
          key={selectedSubdomain.id}
          onClose={() => setSelectedSubdomain(null)}
          subdomain={selectedSubdomain}
        />
      ) : null}
      {isSelectable ? (
        <div
          className={cn(
            "pointer-events-none absolute bottom-10 left-1/2 z-20 -translate-x-1/2 translate-y-2 opacity-0 transition-all duration-200",
            selectedIds.size > 0 && "pointer-events-auto translate-y-0 opacity-100",
          )}
        >
          <div className="flex items-center gap-2 rounded-lg border border-[#262626] bg-black px-3 py-1.5 text-white shadow-[0_8px_24px_rgba(0,0,0,0.16)] backdrop-blur-sm">
            <span className="whitespace-nowrap text-sm text-white/70">{selectedIds.size} selected</span>
            <Button
              className={cn(toolbarButtonClassName, "!border-[#444] !bg-[#1a1a1a] !text-white hover:!bg-[#333]")}
              disabled={updatingId !== null}
              onClick={() => void bulkUpdate(kind === "ct-logs")}
              size="sm"
              variant="outline"
            >
              {kind === "ct-logs" ? "Review" : "Resolve"}
            </Button>
            <Button
              className={cn(toolbarButtonClassName, "!border-[#444] !bg-[#1a1a1a] !text-white hover:!bg-[#333]")}
              disabled={updatingId !== null}
              onClick={() => void bulkUpdate(false)}
              size="sm"
              variant="outline"
            >
              {kind === "ct-logs" ? "Unreview" : "Reopen"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
