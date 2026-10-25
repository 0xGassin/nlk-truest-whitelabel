"use client";

import type { Edge, Node, NodeProps } from "reactflow";

import dagre, { type EdgeLabel, type GraphLabel, type NodeLabel } from "@dagrejs/dagre";
import {
  Archive,
  ArrowLeft,
  Globe2,
  Link2,
  Mail,
  MoreHorizontal,
  Network,
  Server,
  Waypoints,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, { Controls, Handle, MarkerType, MiniMap, Position, useNodesState } from "reactflow";

import "reactflow/dist/style.css";

import { State } from "@/components/state";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { formatDetailLabel } from "@/lib/detail-label";
import { getFindingRemediation } from "@/lib/finding-remediation";
import { getOrganizationId } from "@/lib/organization";
import { ghostButton } from "@/lib/surfaces";
import { listAllOrganizationFindings, listLookalikes, type OrganizationFinding } from "@/services/api/domains";
import { executeGraphQL, type GraphQLResponse } from "@/services/api/graphql";
import type { DomainLookalike } from "@/types";

import "./react-flow.css";

const PAGE_SIZE = 100;
const NODE_WIDTH = 180;
const NODE_HEIGHT = 84;
const TYPE_LABELS: Record<string, string> = {
  domain: "Domain",
  email: "Email Address",
  host: "Host",
  service: "Service",
  subdomain: "Subdomain",
  url: "URL",
  wayback: "Archived URLs",
  lookalike: "Lookalike",
};
const TYPE_COLORS: Record<string, string> = {
  domain: "#2563eb",
  email: "#0891b2",
  host: "#d97706",
  service: "#dc2626",
  subdomain: "#7c3aed",
  url: "#059669",
  wayback: "#9a6700",
  lookalike: "#db2777",
};
const EDGE_LINE_COLOR = "#94a3b8";
const EDGE_MARKER_COLOR = EDGE_LINE_COLOR;
const ALL_DOMAINS_VALUE = "__all_domains__";

interface SurfaceAsset {
  attrs: Record<string, unknown>;
  domainId: string;
  id: string;
  rootDomain: string;
  source: string;
  type: string;
  value: string;
}
interface SurfaceLookalike extends DomainLookalike {
  domainId: string;
  rootDomain: string;
}
interface AssetResponse {
  assets: { nodes: SurfaceAsset[]; pageInfo: { endCursor: null | string; hasNextPage: boolean } };
  domains: { nodes: { id: string; rootDomain: string }[] };
}
interface AssetNodeData {
  count?: number;
  countLabel?: string;
  detail?: string;
  issueCounts?: IssueSeverityCounts;
  issues?: OrganizationFinding[];
  label: string;
  type: string;
}
interface GroupedUrlNodeData {
  count: number;
  host: string;
  kind: "combined" | "crawled" | "wayback";
  issueCounts?: IssueSeverityCounts;
  issues?: OrganizationFinding[];
  targetCount?: number;
  type: "url" | "wayback";
}
interface LookalikeNodeData {
  label: string;
  rootDomain: string;
  severity: string;
  status: string;
  type: "lookalike";
}
interface IssueSeverityCounts {
  critical: number;
  high: number;
  low: number;
  medium: number;
}

const ASSET_QUERY = [
  "query SurfaceAssets($first: Int!, $after: String) {",
  "assets(first: $first, after: $after) { nodes { id domainId rootDomain type value source attrs }",
  "pageInfo { hasNextPage endCursor } } domains(first: 100) { nodes { id rootDomain } } }",
].join("\n");

function AssetIcon({ type }: { type: string }) {
  const props = { className: "size-5 shrink-0" };
  if (type === "email") return <Mail {...props} />;
  if (type === "host") return <Server {...props} />;
  if (type === "service") return <Network {...props} />;
  if (type === "url") return <Link2 {...props} />;
  if (type === "domain" || type === "subdomain") return <Globe2 {...props} />;
  return <Waypoints {...props} />;
}

const ISSUE_SEGMENTS = [
  { className: "bg-[#8A3238] text-white", key: "critical", label: "Critical" },
  { className: "bg-[#EA4444] text-white", key: "high", label: "High" },
  { className: "bg-[#facc15] text-yellow-950", key: "medium", label: "Medium" },
  { className: "bg-[#0ea5e9] text-white", key: "low", label: "Low" },
] as const;

const DARK_SEVERITY_CLASSES: Record<string, string> = {
  critical: "border-[#fca5a5]/40 bg-[#8A3238] text-white",
  high: "border-[#fecaca]/40 bg-[#EA4444] text-white",
  low: "border-[#bae6fd]/40 bg-[#0369a1] text-white",
  medium: "border-[#fde68a]/40 bg-[#a16207] text-white",
};

function darkSeverityClass(severity: string) {
  return DARK_SEVERITY_CLASSES[severity.toLowerCase()] ?? "border-white/25 bg-white/10 text-white";
}

function getIssueCounts(issues: OrganizationFinding[] | undefined): IssueSeverityCounts | undefined {
  if (!issues?.length) return undefined;
  const counts: IssueSeverityCounts = { critical: 0, high: 0, low: 0, medium: 0 };
  for (const issue of issues) {
    const severity = issue.severity.toLowerCase();
    if (severity in counts) counts[severity as keyof IssueSeverityCounts] += 1;
  }
  return counts.critical || counts.high || counts.medium || counts.low ? counts : undefined;
}

function IssueBadge({ counts, issues }: { counts?: IssueSeverityCounts; issues?: OrganizationFinding[] }) {
  if (!counts) return null;
  const issueTitles = issues
    ?.map((issue) => issue.title)
    .filter(Boolean)
    .join("\n");
  return (
    <div
      aria-label={`${String(issues?.length ?? 0)} open issues`}
      className="absolute -top-1 left-full z-20 -ml-3 flex overflow-hidden rounded"
    >
      {ISSUE_SEGMENTS.map((segment) => {
        const count = counts[segment.key];
        if (!count) return null;
        return (
          <span
            className={`px-1 py-px text-[9px] leading-tight font-medium tabular-nums ${segment.className}`}
            key={segment.key}
            title={`${String(count)} ${segment.label} issue${count === 1 ? "" : "s"}${issueTitles ? `\n${issueTitles}` : ""}`}
          >
            {count}
          </span>
        );
      })}
    </div>
  );
}

const HIDDEN_FINDING_DETAIL_KEYS = new Set([
  "check",
  "checks",
  "engine",
  "engines",
  "integration",
  "integrations",
  "module",
  "remediation",
  "provider",
  "providers",
  "scanner",
  "scanners",
  "source",
  "sources",
  "tool",
  "tools",
]);

function isVisibleFindingDetail(key: string) {
  return !HIDDEN_FINDING_DETAIL_KEYS.has(key.toLowerCase());
}

function formatFindingDetail(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.map(formatFindingDetail).join(", ");
  if (typeof value === "object")
    return Object.entries(value as Record<string, unknown>)
      .filter(([key]) => isVisibleFindingDetail(key))
      .map(([key, item]) => `${formatDetailLabel(key)}: ${formatFindingDetail(item)}`)
      .join(", ");
  return String(value);
}

function formatFindingDetailLines(value: unknown): string[] {
  if (!Array.isArray(value)) return [formatFindingDetail(value)];
  const lines = value.map(formatFindingDetail).filter((line) => line.trim().length > 0);
  return lines.length > 0 ? lines : ["—"];
}

function formatFindingDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function FindingDetailsHoverCard({ issue }: { issue: OrganizationFinding }) {
  const details = Object.entries(issue.details ?? {}).filter(([key]) => isVisibleFindingDetail(key));
  const remediation = getFindingRemediation(issue.details, issue.remediation);
  return (
    <HoverCard openDelay={100} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          aria-label={`Show details for ${issue.title}`}
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          type="button"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        align="start"
        className="w-[23rem] max-w-[calc(100vw-2rem)] border-white/10 bg-zinc-900 px-3 py-2.5 text-left text-[14px] text-white shadow-xl shadow-black/25 dark:border-border dark:bg-card [&>svg]:fill-zinc-900 [&>svg]:text-zinc-900 dark:[&>svg]:fill-card dark:[&>svg]:text-card"
        side="left"
        sideOffset={10}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 break-words font-medium tracking-tight text-white">{issue.title}</p>
          <SeverityBadge className={darkSeverityClass(issue.severity)} severity={issue.severity} />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-[14px]">
          <div>
            <p className="text-white/55">Asset</p>
            <p className="mt-0.5 break-words text-white/90">{issue.asset_value ?? issue.asset_type ?? "—"}</p>
          </div>
          <div>
            <p className="text-white/55">Status</p>
            <p className="mt-0.5 capitalize text-white/90">{issue.status}</p>
          </div>
          <div>
            <p className="text-white/55">Domain</p>
            <p className="mt-0.5 break-words text-white/90">{issue.root_domain ?? "—"}</p>
          </div>
          <div>
            <p className="text-white/55">First seen</p>
            <p className="mt-0.5 text-white/90">{formatFindingDate(issue.first_seen_at)}</p>
          </div>
          <div>
            <p className="text-white/55">Last seen</p>
            <p className="mt-0.5 text-white/90">{formatFindingDate(issue.last_seen_at)}</p>
          </div>
          {details.map(([key, value]) => (
            <div key={key}>
              <p className="text-white/55">{formatDetailLabel(key)}</p>
              <div className="mt-0.5 space-y-1 text-white/90">
                {formatFindingDetailLines(value).map((line, index) => (
                  <p className="break-words" key={`${key}-${String(index)}`}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
        {remediation ? (
          <div className="-mx-3 mt-3 border-t border-white/10 px-3 pt-2.5 dark:border-border">
            <p className="text-white/55">Remediation</p>
            <p className="mt-0.5 break-words whitespace-pre-wrap text-white/90">{remediation}</p>
          </div>
        ) : null}
      </HoverCardContent>
    </HoverCard>
  );
}

function GraphIssuesDrawer({ issues, label, type }: { issues: OrganizationFinding[]; label: string; type: string }) {
  const typeLabel = TYPE_LABELS[type] ?? type;
  const columns = ["severity", "issue", "asset", "status", "__details"] as const;
  return (
    <DrawerContent
      className="w-[min(60rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] overflow-hidden rounded-l-[1rem] p-0 sm:max-w-[60rem]"
      side="right"
    >
      <DrawerClose className={`${ghostButton} absolute top-3 right-3 z-10 size-7`}>
        <X className="size-5" />
        <span className="sr-only">Close</span>
      </DrawerClose>
      <div className="shrink-0 border-b border-[#eaeaea] px-3.5 pb-5 pt-4 pr-12 dark:border-border">
        <DrawerTitle className="truncate text-[17.5px] font-semibold tracking-[-0.4px] text-foreground">
          Issues for {label}
        </DrawerTitle>
        <DrawerDescription className="text-[13px] text-[#666666] dark:text-muted-foreground">
          {issues.length} open {issues.length === 1 ? "issue" : "issues"} linked to this asset.
        </DrawerDescription>
        <dl className="mt-4 grid grid-cols-3 gap-x-4">
          <div className="min-w-0">
            <dt className="text-sm font-normal text-muted-foreground">Asset</dt>
            <dd className="mt-0.5 truncate text-sm font-normal text-foreground" title={label}>
              {label}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-sm font-normal text-muted-foreground">Asset type</dt>
            <dd className="mt-0.5 truncate text-sm font-normal text-foreground">{typeLabel}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-sm font-normal text-muted-foreground">Status</dt>
            <dd className="mt-0.5 text-sm font-normal text-foreground">Open</dd>
          </div>
        </dl>
      </div>
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto overscroll-contain px-3.5 pb-6 pt-5">
        <div className="min-w-[720px] overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full table-fixed text-left text-sm">
            <thead
              className="sticky top-0 z-20 !bg-[#fafafa] text-foreground dark:!bg-card"
              style={{ boxShadow: "inset 0 -0.5px 0 var(--border)" }}
            >
              <tr>
                {columns.map((column) => (
                  <th
                    className={`h-9 border-r border-border/70 text-left text-[14px] font-normal text-muted-foreground last:border-r-0 ${column === "__details" ? "w-14 px-1" : "px-3"}`}
                    key={column}
                  >
                    {column === "severity"
                      ? "Severity"
                      : column === "issue"
                        ? "Issue"
                        : column === "asset"
                          ? "Asset"
                          : column === "status"
                            ? "Status"
                            : "Details"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {issues.map((issue) => {
                return (
                  <tr
                    className="group h-12 w-full border-b border-border/60 bg-card text-sm font-normal text-foreground transition-colors last:border-b-0 hover:bg-muted/30"
                    key={issue.id}
                  >
                    {columns.map((column, index) => (
                      <td
                        className={`max-w-0 border-border/70 py-2 align-middle ${column === "__details" ? "w-14 px-1" : "px-4"} ${index < columns.length - 1 ? "border-r border-border/50" : ""}`}
                        key={column}
                      >
                        {column === "severity" ? (
                          <SeverityBadge severity={issue.severity} />
                        ) : column === "issue" ? (
                          <span className="line-clamp-2 min-h-10 break-words text-foreground">{issue.title}</span>
                        ) : column === "asset" ? (
                          <span className="flex min-h-10 items-center">
                            <span className="line-clamp-2 break-words text-foreground">
                              {issue.asset_value ?? issue.asset_type ?? "—"}
                            </span>
                          </span>
                        ) : column === "status" ? (
                          <span className="capitalize text-foreground">{issue.status}</span>
                        ) : column === "__details" ? (
                          <span className="flex justify-center">
                            <FindingDetailsHoverCard issue={issue} />
                          </span>
                        ) : null}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </DrawerContent>
  );
}

function AssetCard({ data }: NodeProps<AssetNodeData>) {
  const color = TYPE_COLORS[data.type] ?? "#64748b";
  const detail =
    data.detail ??
    (data.count === undefined ? (TYPE_LABELS[data.type] ?? data.type) : `${data.count.toLocaleString()} ${data.countLabel ?? "Assets"}`);
  return (
    <div className="flex w-[180px] cursor-pointer flex-col items-center gap-1 text-center">
      <div
        className="relative flex size-11 items-center justify-center rounded-full shadow-none transition-[box-shadow] duration-[350ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:ring-4 hover:ring-muted-foreground/25 motion-reduce:transition-none"
        style={{ backgroundColor: color }}
      >
        <IssueBadge counts={data.issueCounts} issues={data.issues} />
        <Handle className="!h-2 !w-2 !border-0 !bg-transparent" position={Position.Top} type="target" />
        <span className="text-white">
          <AssetIcon type={data.type} />
        </span>
        <Handle className="!h-2 !w-2 !border-0 !bg-transparent" position={Position.Bottom} type="source" />
      </div>
      <div
        className="relative z-10 max-w-[172px] truncate rounded-sm bg-card/95 px-1 text-sm leading-5 font-normal text-foreground"
        title={data.label}
      >
        {data.label}
      </div>
      <div className="relative z-10 max-w-[172px] truncate rounded-sm bg-card/95 px-1 text-xs leading-4 text-muted-foreground">
        {detail}
      </div>
    </div>
  );
}

function GroupedUrlCard({ data }: NodeProps<GroupedUrlNodeData>) {
  const isHistoryOnly = data.kind === "wayback";
  return (
    <div className="flex w-[180px] cursor-pointer flex-col items-center gap-1 text-center">
      <div
        className="relative flex size-11 items-center justify-center rounded-full shadow-none transition-[box-shadow] duration-[350ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:ring-4 hover:ring-muted-foreground/25 motion-reduce:transition-none"
        style={{ backgroundColor: isHistoryOnly ? TYPE_COLORS.wayback : TYPE_COLORS.url }}
      >
        <IssueBadge counts={data.issueCounts} issues={data.issues} />
        <Handle className="!h-2 !w-2 !border-0 !bg-transparent" position={Position.Top} type="target" />
        {isHistoryOnly ? <Archive className="size-5 text-white" /> : <Link2 className="size-5 text-white" />}
        <Handle className="!h-2 !w-2 !border-0 !bg-transparent" position={Position.Bottom} type="source" />
      </div>
      <div
        className="relative z-10 max-w-[172px] truncate rounded-sm bg-card/95 px-1 text-sm leading-5 font-normal text-foreground"
        title={data.host}
      >
        {data.host}
      </div>
      <div className="relative z-10 max-w-[172px] truncate rounded-sm bg-card/95 px-1 text-xs leading-4 text-muted-foreground">
        {data.count.toLocaleString()} {data.count === 1 ? "URL" : "URLs"}
      </div>
      {data.targetCount !== undefined ? (
        <div className="relative z-10 max-w-[172px] truncate rounded-sm bg-card/95 px-1 text-xs leading-4 text-muted-foreground">
          {data.targetCount.toLocaleString()} {data.targetCount === 1 ? "Target" : "Targets"}
        </div>
      ) : null}
    </div>
  );
}

function LookalikeCard({ data }: NodeProps<LookalikeNodeData>) {
  return (
    <div className="flex w-[180px] cursor-pointer flex-col items-center gap-1 text-center">
      <div
        className="relative flex size-11 items-center justify-center rounded-full shadow-none transition-[box-shadow] duration-[350ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:ring-4 hover:ring-muted-foreground/25 motion-reduce:transition-none"
        style={{ backgroundColor: TYPE_COLORS.lookalike }}
      >
        <Handle className="!h-2 !w-2 !border-0 !bg-transparent" position={Position.Top} type="target" />
        <Waypoints className="size-5 text-white" />
        <Handle className="!h-2 !w-2 !border-0 !bg-transparent" position={Position.Bottom} type="source" />
      </div>
      <div
        className="relative z-10 max-w-[172px] truncate rounded-sm bg-card/95 px-1 text-sm leading-5 font-normal text-foreground"
        title={data.label}
      >
        {data.label}
      </div>
      <div className="relative z-10 max-w-[172px] truncate rounded-sm bg-card/95 px-1 text-xs leading-4 text-muted-foreground">
        {data.severity} · {data.status}
      </div>
    </div>
  );
}

const nodeTypes = { asset: AssetCard, lookalike: LookalikeCard, wayback: GroupedUrlCard };

function archiveHost(asset: SurfaceAsset): string {
  if (typeof asset.attrs.host === "string" && asset.attrs.host) return asset.attrs.host.toLowerCase();
  try {
    return new URL(asset.value).hostname.toLowerCase();
  } catch {
    return asset.rootDomain;
  }
}

function isGroupedUrlAsset(asset: SurfaceAsset): boolean {
  const type = asset.type.trim().toLowerCase().replaceAll(/[ -]/g, "_");
  return type === "url" || type === "wayback_url";
}

function groupedUrlKind(asset: SurfaceAsset): "crawled" | "wayback" {
  const type = asset.type.trim().toLowerCase().replaceAll(/[ -]/g, "_");
  return type === "wayback_url" || asset.source.trim().toLowerCase() === "wayback" ? "wayback" : "crawled";
}

function groupedUrlKey(asset: SurfaceAsset): string {
  return asset.domainId;
}

function groupedUrlId(asset: SurfaceAsset): string {
  return "url-group:" + groupedUrlKey(asset);
}

function normalizedName(value: string): string {
  return value.toLowerCase().trim().replaceAll("\\", "").replace(/\.$/, "");
}

function lookalikeName(lookalike: DomainLookalike): string {
  const details = lookalike.details ?? {};
  for (const key of ["lookalike", "unicode", "domain", "hostname"]) {
    const value = details[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return (
    lookalike.title
      .replace(/^Lookalike domain\s+/i, "")
      .replace(/\s+is registered(?:\s*\([^)]*\))?$/i, "")
      .trim() || lookalike.title
  );
}

function hostNames(asset: SurfaceAsset): string[] {
  const names: string[] = [];
  if (typeof asset.attrs.hostname === "string") names.push(asset.attrs.hostname);
  if (Array.isArray(asset.attrs.hostnames)) {
    for (const name of asset.attrs.hostnames) if (typeof name === "string") names.push(name);
  }
  return [...new Set(names.map(normalizedName).filter(Boolean))];
}

interface HostGroups {
  byAssetId: Map<string, string>;
  groups: Map<string, SurfaceAsset[]>;
}

function buildHostGroups(assets: SurfaceAsset[]): HostGroups {
  const hosts = assets.filter((asset) => asset.type === "host");
  const parent = new Map<string, string>();
  const identityOwner = new Map<string, string>();

  const find = (assetId: string): string => {
    let root = parent.get(assetId) ?? assetId;
    while (parent.get(root) && parent.get(root) !== root) root = parent.get(root) as string;
    let current = assetId;
    while (parent.get(current) && parent.get(current) !== root) {
      const next = parent.get(current) as string;
      parent.set(current, root);
      current = next;
    }
    return root;
  };
  const union = (left: string, right: string) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parent.set(rightRoot, leftRoot);
  };

  for (const asset of hosts) {
    parent.set(asset.id, asset.id);
    const identities = [
      `${asset.domainId}:ip:${normalizedName(hostIP(asset))}`,
      ...hostNames(asset).map((name) => `${asset.domainId}:name:${name}`),
    ];
    for (const identity of identities) {
      const owner = identityOwner.get(identity);
      if (owner) union(asset.id, owner);
      else identityOwner.set(identity, asset.id);
    }
  }

  const assetsByRoot = new Map<string, SurfaceAsset[]>();
  for (const asset of hosts) {
    const root = find(asset.id);
    assetsByRoot.set(root, [...(assetsByRoot.get(root) ?? []), asset]);
  }

  const byAssetId = new Map<string, string>();
  const groups = new Map<string, SurfaceAsset[]>();
  for (const members of assetsByRoot.values()) {
    if (members.length === 1) {
      byAssetId.set(members[0].id, members[0].id);
      continue;
    }
    const identities = members
      .flatMap((asset) => [
        `${asset.domainId}:ip:${normalizedName(hostIP(asset))}`,
        ...hostNames(asset).map((name) => `${asset.domainId}:name:${name}`),
      ])
      .sort();
    const groupId = "hosts:" + (identities[0] ?? members[0].id);
    groups.set(groupId, members);
    for (const asset of members) byAssetId.set(asset.id, groupId);
  }
  return { byAssetId, groups };
}

function serviceIP(asset: SurfaceAsset): string {
  return typeof asset.attrs.ip === "string" ? asset.attrs.ip : asset.value.split(":", 1)[0];
}

function serviceGroupKey(asset: SurfaceAsset): string {
  return `${asset.domainId}:${normalizedName(serviceIP(asset))}`;
}

function serviceGroupId(asset: SurfaceAsset): string {
  return "services:" + serviceGroupKey(asset);
}

const HOST_DRILL_SERVICE_PREFIX = "services:host-drill:";

function hostDrillServiceGroupId(hostGroupId: string, serviceKey: string): string {
  return `${HOST_DRILL_SERVICE_PREFIX}${encodeURIComponent(hostGroupId)}|${encodeURIComponent(serviceKey)}`;
}

function parseHostDrillServiceGroupId(groupId: string): { hostGroupId: string; serviceKey: string } | null {
  if (!groupId.startsWith(HOST_DRILL_SERVICE_PREFIX)) return null;
  const [encodedHostGroupId, encodedServiceKey] = groupId.slice(HOST_DRILL_SERVICE_PREFIX.length).split("|");
  if (!encodedHostGroupId || !encodedServiceKey) return null;
  try {
    return { hostGroupId: decodeURIComponent(encodedHostGroupId), serviceKey: decodeURIComponent(encodedServiceKey) };
  } catch {
    return null;
  }
}

function hostIP(asset: SurfaceAsset): string {
  return typeof asset.attrs.ip === "string" && asset.attrs.ip ? asset.attrs.ip : asset.value;
}

function hostServiceKey(asset: SurfaceAsset): string {
  return `${asset.domainId}:${normalizedName(hostIP(asset))}`;
}

function assetLabel(asset: SurfaceAsset): string {
  if (asset.type === "host") {
    const names = hostNames(asset);
    return names.length ? names.join(", ") : hostIP(asset);
  }
  return asset.value;
}

function layout(nodes: Node[], edges: Edge[]): Node[] {
  const graph = new dagre.graphlib.Graph<GraphLabel, NodeLabel, EdgeLabel>();
  graph.setDefaultEdgeLabel(() => ({}));
  // Give sibling branches enough room to breathe.  The extra edge separation
  // is especially helpful for domains with many hosts and collapsed asset
  // groups, where several relationships otherwise converge on the same lane.
  graph.setGraph({ edgesep: 40, nodesep: 80, rankdir: "TB", ranksep: 112 });
  for (const node of nodes) graph.setNode(node.id, { height: NODE_HEIGHT, width: NODE_WIDTH });
  for (const edge of edges)
    if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) graph.setEdge(edge.source, edge.target);
  dagre.layout(graph);
  const positions = new Map<string, { x: number; y: number }>();
  for (const node of nodes) {
    const point = graph.node(node.id);
    positions.set(node.id, { x: (point.x ?? 0) - NODE_WIDTH / 2, y: (point.y ?? 0) - NODE_HEIGHT / 2 });
  }
  return nodes.map((node) => {
    return { ...node, position: positions.get(node.id) ?? { x: 0, y: 0 } };
  });
}

function toGraph(
  assets: SurfaceAsset[],
  expandGroupedAssets: boolean,
  expandedGroupIds: ReadonlySet<string>,
  findings: OrganizationFinding[],
  lookalikes: SurfaceLookalike[],
  watchedDomains: { id: string; rootDomain: string }[],
): { edges: Edge[]; nodes: Node[] } {
  // The watched domain is the root of the graph. A domain-shaped asset emitted
  // by a scanner (for example WHOIS) is not another root node.
  const domainById = new Map(watchedDomains.map((domain) => [domain.id, domain]));
  for (const asset of assets) {
    if (!domainById.has(asset.domainId))
      domainById.set(asset.domainId, { id: asset.domainId, rootDomain: asset.rootDomain });
  }
  const isGroupExpanded = (groupId: string) => {
    if (expandedGroupIds.has(groupId)) return true;
    return expandGroupedAssets && (groupId.startsWith("emails:") || groupId.startsWith("services:"));
  };
  const hostGroups = buildHostGroups(assets);
  const expandedHostGroupId = [...expandedGroupIds].find((groupId) => groupId.startsWith("hosts:"));
  const expandedHostDrillService = [...expandedGroupIds]
    .map(parseHostDrillServiceGroupId)
    .find((group): group is { hostGroupId: string; serviceKey: string } => group !== null);
  const activeHostDrillGroupId = expandedHostGroupId ?? expandedHostDrillService?.hostGroupId;
  const isHostDrillExpanded = (groupId: string) =>
    isGroupExpanded(groupId) || (groupId.startsWith("hosts:") && activeHostDrillGroupId === groupId);
  const hostsByServiceKey = new Map<string, SurfaceAsset[]>();
  for (const asset of assets) {
    if (asset.type !== "host") continue;
    const key = hostServiceKey(asset);
    hostsByServiceKey.set(key, [...(hostsByServiceKey.get(key) ?? []), asset]);
  }
  const isMergedHost = (asset: SurfaceAsset) => asset.type === "host" && hostGroups.byAssetId.get(asset.id) !== asset.id;
  const targetIdForHost = (asset: SurfaceAsset) => {
    const groupId = hostGroups.byAssetId.get(asset.id);
    return groupId && !isHostDrillExpanded(groupId) ? groupId : asset.id;
  };
  const hostTargetByServiceKey = new Map<string, string>();
  for (const asset of assets) {
    if (asset.type === "host") hostTargetByServiceKey.set(hostServiceKey(asset), hostGroups.byAssetId.get(asset.id) ?? asset.id);
  }
  const serviceGroupIdForHost = (asset: SurfaceAsset) => {
    const hostTarget = hostGroups.byAssetId.get(asset.id) ?? asset.id;
    if (activeHostDrillGroupId === hostTarget && hostTarget.startsWith("hosts:"))
      return hostDrillServiceGroupId(hostTarget, serviceGroupKey(asset));
    return hostTarget.startsWith("hosts:") ? "services:host-group:" + hostTarget : serviceGroupId(asset);
  };
  const serviceGroupIdForAsset = (asset: SurfaceAsset) => {
    const hostTarget = hostTargetByServiceKey.get(serviceGroupKey(asset));
    if (activeHostDrillGroupId === hostTarget && hostTarget?.startsWith("hosts:"))
      return hostDrillServiceGroupId(hostTarget, serviceGroupKey(asset));
    return hostTarget?.startsWith("hosts:") ? "services:host-group:" + hostTarget : serviceGroupId(asset);
  };
  const subdomainsByDomain = new Map<string, SurfaceAsset[]>();
  for (const asset of assets) {
    if (asset.type !== "subdomain") continue;
    subdomainsByDomain.set(asset.domainId, [...(subdomainsByDomain.get(asset.domainId) ?? []), asset]);
  }
  const subdomainGroupIdByDomain = new Map<string, string>();
  for (const [domainId, subdomains] of subdomainsByDomain) {
    if (subdomains.length > 5) subdomainGroupIdByDomain.set(domainId, "subdomains:" + domainId);
  }
  const isGroupedSubdomain = (asset: SurfaceAsset) => {
    const groupId = subdomainGroupIdByDomain.get(asset.domainId);
    return asset.type === "subdomain" && groupId !== undefined && !isGroupExpanded(groupId);
  };
  const targetIdForSubdomain = (asset: SurfaceAsset) => {
    const groupId = subdomainGroupIdByDomain.get(asset.domainId);
    return groupId !== undefined && isGroupedSubdomain(asset) ? groupId : asset.id;
  };
  const rootNodeByDomain = new Map<string, string>();
  const roots: Node[] = [];
  for (const domain of domainById.values()) {
    const id = "domain-root:" + domain.id;
    rootNodeByDomain.set(domain.id, id);
    roots.push({
      data: { label: domain.rootDomain, type: "domain" },
      id,
      position: { x: 0, y: 0 },
      type: "asset",
    });
  }
  const relationshipAssets = assets.filter(
    (asset) =>
      asset.type !== "domain" &&
      (asset.type !== "email" || isGroupExpanded("emails:" + asset.domainId)) &&
      (asset.type !== "service" || isGroupExpanded(serviceGroupIdForAsset(asset))) &&
      (!isGroupedUrlAsset(asset) || isGroupExpanded(groupedUrlId(asset))),
  );
  const visible = relationshipAssets.filter(
    (asset) => (!isMergedHost(asset) || targetIdForHost(asset) === asset.id) && !isGroupedSubdomain(asset),
  );
  const hostsByName = new Map<string, SurfaceAsset[]>();
  const servicesByIP = new Map<string, SurfaceAsset[]>();
  const namesByDomain = new Map<string, string[]>();
  const subdomainsById = new Map<string, SurfaceAsset>();
  for (const asset of assets) {
    if (asset.type === "subdomain") {
      const key = asset.domainId + ":" + normalizedName(asset.value);
      namesByDomain.set(key, [...(namesByDomain.get(key) ?? []), asset.id]);
      subdomainsById.set(asset.id, asset);
    }
    if (asset.type === "host") {
      for (const hostname of hostNames(asset)) {
        const key = asset.domainId + ":" + hostname;
        hostsByName.set(key, [...(hostsByName.get(key) ?? []), asset]);
      }
    }
    if (asset.type === "service") {
      const key = serviceGroupKey(asset);
      servicesByIP.set(key, [...(servicesByIP.get(key) ?? []), asset]);
    }
  }
  const urlSummaryIdForAsset = (asset: SurfaceAsset) => {
    if (!isGroupExpanded("subdomains:" + asset.domainId)) return groupedUrlId(asset);
    const subdomainId = namesByDomain.get(asset.domainId + ":" + normalizedName(archiveHost(asset)))?.[0];
    return subdomainId ? "url-target:" + subdomainId : groupedUrlId(asset);
  };
  const emailCounts = new Map<string, number>();
  const serviceCounts = new Map<string, number>();
  const serviceDomainByGroup = new Map<string, string>();
  for (const asset of assets) {
    if (asset.type === "email") emailCounts.set(asset.domainId, (emailCounts.get(asset.domainId) ?? 0) + 1);
    if (asset.type === "service") {
      const key = serviceGroupIdForAsset(asset);
      serviceCounts.set(key, (serviceCounts.get(key) ?? 0) + 1);
      serviceDomainByGroup.set(key, asset.domainId);
    }
  }
  const issuesByNode = new Map<string, OrganizationFinding[]>();
  const groupedUrlIssuesByKey = new Map<string, OrganizationFinding[]>();
  const addIssue = (nodeId: string, issue: OrganizationFinding) => {
    issuesByNode.set(nodeId, [...(issuesByNode.get(nodeId) ?? []), issue]);
  };
  const targetIdForAsset = (asset: SurfaceAsset): string => {
    if (asset.type === "email" && !isGroupExpanded("emails:" + asset.domainId)) return "emails:" + asset.domainId;
    if (asset.type === "service" && !isGroupExpanded(serviceGroupIdForAsset(asset))) return serviceGroupIdForAsset(asset);
    if (isGroupedUrlAsset(asset) && !isGroupExpanded(groupedUrlId(asset))) return urlSummaryIdForAsset(asset);
    if (asset.type === "subdomain") return targetIdForSubdomain(asset);
    if (asset.type === "host") return targetIdForHost(asset);
    return asset.id;
  };
  const targetIdForSubdomainId = (assetId: string) => {
    const asset = subdomainsById.get(assetId);
    return asset ? targetIdForSubdomain(asset) : assetId;
  };
  const matchableAssets = assets.filter(
    (asset) => asset.type !== "domain" && (!isGroupedUrlAsset(asset) || isGroupExpanded(groupedUrlId(asset))),
  );
  for (const issue of findings) {
    const issueValue = issue.asset_value ? normalizedName(issue.asset_value) : "";
    const matches = issueValue
      ? matchableAssets.filter((asset) => {
          if (asset.domainId !== issue.domain_id) return false;
          if (issue.asset_type && issue.asset_type !== asset.type) return false;
          if (normalizedName(asset.value) === issueValue) return true;
          return asset.type === "host" && hostNames(asset).includes(issueValue);
        })
      : [];
    if (matches.length) {
      for (const asset of matches) addIssue(targetIdForAsset(asset), issue);
      continue;
    }
    if (issueValue) {
      const groupedUrlAsset = assets.find(
        (asset) =>
          asset.domainId === issue.domain_id && isGroupedUrlAsset(asset) && normalizedName(asset.value) === issueValue,
      );
      if (groupedUrlAsset) {
        const key = urlSummaryIdForAsset(groupedUrlAsset);
        groupedUrlIssuesByKey.set(key, [...(groupedUrlIssuesByKey.get(key) ?? []), issue]);
        continue;
      }
    }
    const root = rootNodeByDomain.get(issue.domain_id);
    if (root) addIssue(root, issue);
  }
  const nodeData = (label: string, type: string, id: string): AssetNodeData => {
    const issues = issuesByNode.get(id);
    return { issueCounts: getIssueCounts(issues), issues, label, type };
  };
  for (const domain of domainById.values()) {
    const root = roots.find((node) => node.id === "domain-root:" + domain.id);
    if (root) root.data = nodeData(domain.rootDomain, "domain", root.id);
  }
  const nodes: Node[] = [
    ...roots,
    ...visible.map((asset) => ({
      data: nodeData(assetLabel(asset), asset.type, asset.id),
      id: asset.id,
      position: { x: 0, y: 0 },
      type: "asset",
    })),
    ...[...subdomainGroupIdByDomain.entries()]
      .filter(([, groupId]) => !isGroupExpanded(groupId))
      .map(([domainId, groupId]) => {
        const count = subdomainsByDomain.get(domainId)?.length ?? 0;
        return {
          data: {
            ...nodeData("Subdomains", "subdomain", groupId),
            count,
            countLabel: count === 1 ? "Subdomain" : "Subdomains",
          },
          id: groupId,
          position: { x: 0, y: 0 },
          type: "asset",
        };
      }),
    ...[...hostGroups.groups.entries()]
      .filter(([id]) => !isHostDrillExpanded(id))
      .map(([id, hosts]) => {
        const names = [...new Set(hosts.flatMap(hostNames))];
        const label = names.length ? names.join(", ") : hostIP(hosts[0]);
        return {
          data: {
            ...nodeData(label, "host", id),
            count: hosts.length,
            countLabel: hosts.length === 1 ? "Host" : "Hosts",
          },
          id,
          position: { x: 0, y: 0 },
          type: "asset",
        };
      }),
    ...[...emailCounts.entries()]
      .filter(([domainId]) => !isGroupExpanded("emails:" + domainId))
      .map(([domainId, count]) => ({
        data: {
          ...nodeData("Emails", "email", "emails:" + domainId),
          count,
          countLabel: count === 1 ? "Email Address" : "Email Addresses",
        },
        id: "emails:" + domainId,
        position: { x: 0, y: 0 },
        type: "asset",
      })),
    ...[...serviceCounts.entries()]
      .filter(([key]) => !isGroupExpanded(key))
      .map(([key, count]) => ({
        data: {
          ...nodeData("Services", "service", key),
          detail: `${count.toLocaleString()} ${count === 1 ? "Service" : "Services"}`,
        },
        id: key,
        position: { x: 0, y: 0 },
        type: "asset",
      })),
  ];
  const edges = new Map<string, Edge>();
  const addEdge = (source: string, target: string) => {
    const id = source + ":" + target;
    if (!edges.has(id))
      edges.set(id, {
        id,
        markerEnd: { color: EDGE_MARKER_COLOR, height: 14, type: MarkerType.ArrowClosed, width: 14 },
        source,
        style: { stroke: EDGE_LINE_COLOR, strokeWidth: 1.15 },
        target,
      });
  };
  const lookalikesByDomain = new Map<string, SurfaceLookalike[]>();
  for (const lookalike of lookalikes) {
    lookalikesByDomain.set(lookalike.domainId, [...(lookalikesByDomain.get(lookalike.domainId) ?? []), lookalike]);
  }
  for (const [domainId, domainLookalikes] of lookalikesByDomain) {
    const domain = domainById.get(domainId);
    if (!domain) continue;
    const groupId = "lookalikes-root:" + domainId;
    const domainRootId = rootNodeByDomain.get(domainId);
    if (isGroupExpanded(groupId)) {
      for (const lookalike of domainLookalikes) {
        const id = "lookalike:" + lookalike.domainId + ":" + lookalike.id;
        nodes.push({
          data: {
            label: lookalikeName(lookalike),
            rootDomain: domain.rootDomain,
            severity: lookalike.severity,
            status: lookalike.status,
            type: "lookalike",
          },
          id,
          position: { x: 0, y: 0 },
          type: "lookalike",
        });
        if (domainRootId) addEdge(id, domainRootId);
      }
      continue;
    }
    nodes.push({
      data: {
        count: domainLookalikes.length,
        countLabel: domainLookalikes.length === 1 ? "Open Lookalike" : "Open Lookalikes",
        label: "Lookalikes",
        type: "lookalike",
      },
      id: groupId,
      position: { x: 0, y: 0 },
      type: "asset",
    });
    if (domainRootId) addEdge(groupId, domainRootId);
  }
  for (const asset of relationshipAssets) {
    if (asset.type === "subdomain") {
      for (const host of hostsByName.get(asset.domainId + ":" + normalizedName(asset.value)) ?? [])
        addEdge(targetIdForSubdomain(asset), targetIdForAsset(host));
    }
    if (asset.type === "host") {
      const serviceKey = hostServiceKey(asset);
      const services = servicesByIP.get(serviceKey) ?? [];
      const serviceGroupId = serviceGroupIdForHost(asset);
      if (isGroupExpanded(serviceGroupId)) {
        for (const service of services) addEdge(targetIdForHost(asset), service.id);
      } else if (services.length) {
        addEdge(targetIdForHost(asset), serviceGroupId);
      }
      const root = rootNodeByDomain.get(asset.domainId);
      if (root) addEdge(root, targetIdForHost(asset));
      const matchingNames = hostNames(asset).flatMap((name) => namesByDomain.get(asset.domainId + ":" + name) ?? []);
      if (matchingNames.length) {
        for (const id of new Set(matchingNames)) addEdge(targetIdForSubdomainId(id), targetIdForHost(asset));
      }
    }
    if (asset.type === "subdomain") {
      const root = rootNodeByDomain.get(asset.domainId);
      if (root) addEdge(root, targetIdForSubdomain(asset));
    }
    if (asset.type === "email" && isGroupExpanded("emails:" + asset.domainId)) {
      const root = rootNodeByDomain.get(asset.domainId);
      if (root) addEdge(root, asset.id);
    }
    if (asset.type === "service") {
      const serviceKey = serviceGroupKey(asset);
      const serviceGroupId = serviceGroupIdForAsset(asset);
      const connectedHosts = hostsByServiceKey.get(serviceKey) ?? [];
      if (!connectedHosts.length) {
        const root = rootNodeByDomain.get(asset.domainId);
        if (root) addEdge(root, isGroupExpanded(serviceGroupId) ? asset.id : serviceGroupId);
      }
    }
    if (isGroupedUrlAsset(asset)) {
      if (!isGroupExpanded(groupedUrlId(asset))) continue;
      const host = archiveHost(asset);
      const resourceIds = namesByDomain.get(asset.domainId + ":" + normalizedName(host)) ?? [];
      if (resourceIds.length) {
        for (const resource of resourceIds) addEdge(targetIdForSubdomainId(resource), asset.id);
      } else {
        const root = rootNodeByDomain.get(asset.domainId);
        if (root) addEdge(root, asset.id);
      }
    }
  }
  for (const [key] of serviceCounts) {
    if (!isGroupExpanded(key)) {
      const hasHost = [...hostsByServiceKey.values()].some(
        (hosts) => hosts.length > 0 && serviceGroupIdForHost(hosts[0]) === key,
      );
      if (hasHost) continue;
      const root = rootNodeByDomain.get(serviceDomainByGroup.get(key) ?? "");
      if (root) addEdge(root, key);
    }
  }
  for (const domainId of emailCounts.keys()) {
    if (!isGroupExpanded("emails:" + domainId)) {
      const root = rootNodeByDomain.get(domainId);
      if (root) addEdge(root, "emails:" + domainId);
    }
  }
  const equivalent = new Map<string, string>();
  for (const domain of domainById.values()) {
    const root = rootNodeByDomain.get(domain.id);
    if (root) equivalent.set(domain.id + ":" + normalizedName(domain.rootDomain), root);
  }
  for (const asset of assets) {
    if (asset.type === "subdomain")
      equivalent.set(asset.domainId + ":" + normalizedName(asset.value), targetIdForSubdomain(asset));
  }
  for (const asset of assets) {
    if (asset.type !== "host") continue;
    for (const hostname of hostNames(asset)) {
      const key = asset.domainId + ":" + hostname;
      if (!equivalent.has(key)) equivalent.set(key, targetIdForAsset(asset));
    }
  }
  const groups = new Map<
    string,
    {
      count: number;
      crawledCount: number;
      historyCount: number;
      host: string;
      subdomainTargets: Set<string>;
      targets: Set<string>;
    }
  >();
  const fallbackTargets = new Map<string, { domainId: string; host: string }>();
  for (const asset of assets) {
    if (!isGroupedUrlAsset(asset) || isGroupExpanded(groupedUrlId(asset))) continue;
    const host = archiveHost(asset);
    const key = urlSummaryIdForAsset(asset);
    const directSubdomainId = namesByDomain.get(asset.domainId + ":" + normalizedName(host))?.[0];
    const group = groups.get(key) ?? {
      count: 0,
      crawledCount: 0,
      historyCount: 0,
      host: directSubdomainId
        ? (subdomainsById.get(directSubdomainId)?.value ?? host)
        : (domainById.get(asset.domainId)?.rootDomain ?? "URLs"),
      subdomainTargets: new Set<string>(),
      targets: new Set<string>(),
    };
    group.count++;
    if (groupedUrlKind(asset) === "wayback") group.historyCount++;
    else group.crawledCount++;
    const target =
      equivalent.get(asset.domainId + ":" + normalizedName(host)) ??
      `url-subdomain:${asset.domainId}:${normalizedName(host)}`;
    group.targets.add(target);
    for (const subdomainId of namesByDomain.get(asset.domainId + ":" + normalizedName(host)) ?? []) {
      group.subdomainTargets.add(subdomainId);
    }
    if (!equivalent.has(asset.domainId + ":" + normalizedName(host))) {
      fallbackTargets.set(target, { domainId: asset.domainId, host });
    }
    groups.set(key, group);
  }
  for (const [id, fallback] of fallbackTargets) {
    nodes.push({
      data: { label: fallback.host, type: "subdomain" },
      id,
      position: { x: 0, y: 0 },
      type: "asset",
    });
    const root = rootNodeByDomain.get(fallback.domainId);
    if (root) addEdge(root, id);
  }
  for (const [key, group] of groups) {
    const id = key;
    const issues = groupedUrlIssuesByKey.get(key);
    nodes.push({
      data: {
        count: group.count,
        host: group.host,
        issueCounts: getIssueCounts(issues),
        issues,
        kind:
          group.crawledCount > 0 && group.historyCount > 0
            ? "combined"
            : group.historyCount > 0
              ? "wayback"
              : "crawled",
        type: group.historyCount > 0 && group.crawledCount === 0 ? "wayback" : "url",
        targetCount: key.startsWith("url-target:") ? undefined : group.subdomainTargets.size,
      },
      id,
      position: { x: 0, y: 0 },
      type: "wayback",
    });
    for (const target of group.targets)
      edges.set("grouped-url:" + id + ":" + target, {
        id: "grouped-url:" + id + ":" + target,
        markerEnd: { color: EDGE_MARKER_COLOR, height: 14, type: MarkerType.ArrowClosed, width: 14 },
        source: id,
        style: { stroke: EDGE_LINE_COLOR, strokeWidth: 1.15 },
        target,
      });
  }
  const graphEdges = [...edges.values()];
  return {
    edges: graphEdges,
    nodes: layout(nodes, graphEdges),
  };
}

function focusedGroupGraph(
  graph: { edges: Edge[]; nodes: Node[] },
  groupId: string,
  assets: SurfaceAsset[],
  lookalikes: SurfaceLookalike[],
) {
  const hostGroups = buildHostGroups(assets);
  const hostDrillService = parseHostDrillServiceGroupId(groupId);
  const hostNodeId = (asset: SurfaceAsset) => hostGroups.byAssetId.get(asset.id) ?? asset.id;
  const hostTargetByServiceKey = new Map<string, string>();
  for (const asset of assets) {
    if (asset.type === "host") hostTargetByServiceKey.set(hostServiceKey(asset), hostNodeId(asset));
  }
  const serviceGroupIdForAsset = (asset: SurfaceAsset) => {
    const hostTarget = hostTargetByServiceKey.get(serviceGroupKey(asset));
    if (
      hostDrillService &&
      hostDrillService.serviceKey === serviceGroupKey(asset) &&
      hostTarget === hostDrillService.hostGroupId
    )
      return groupId;
    return hostTarget?.startsWith("hosts:") ? "services:host-group:" + hostTarget : serviceGroupId(asset);
  };
  const serviceGroupIdForHost = (asset: SurfaceAsset) => {
    const hostTarget = hostNodeId(asset);
    if (
      hostDrillService &&
      hostDrillService.serviceKey === hostServiceKey(asset) &&
      hostGroups.byAssetId.get(asset.id) === hostDrillService.hostGroupId
    )
      return groupId;
    return hostTarget.startsWith("hosts:") ? "services:host-group:" + hostTarget : serviceGroupId(asset);
  };
  const children = new Set([
    ...assets
      .filter((asset) => {
        if (groupId.startsWith("emails:")) return asset.type === "email" && groupId === "emails:" + asset.domainId;
        if (groupId.startsWith("subdomains:"))
          return asset.type === "subdomain" && groupId === "subdomains:" + asset.domainId;
        if (groupId.startsWith("hosts:"))
          return asset.type === "host" && hostGroups.byAssetId.get(asset.id) === groupId;
        if (groupId.startsWith("services:")) {
          return (
            (asset.type === "service" && serviceGroupIdForAsset(asset) === groupId) ||
            (asset.type === "host" && serviceGroupIdForHost(asset) === groupId)
          );
        }
        if (groupId.startsWith("url-group:")) return isGroupedUrlAsset(asset) && groupId === groupedUrlId(asset);
        return false;
      })
      .map((asset) => (groupId.startsWith("hosts:") ? asset.id : hostNodeId(asset))),
    ...lookalikes
      .filter((lookalike) => groupId === "lookalikes-root:" + lookalike.domainId)
      .map((lookalike) => "lookalike:" + lookalike.domainId + ":" + lookalike.id),
  ]);
  const edges = graph.edges.filter((edge) => children.has(edge.target) || children.has(edge.source));
  const nodeIds = new Set([...children, ...edges.flatMap((edge) => [edge.source, edge.target])]);
  const nodes = graph.nodes.filter((node) => nodeIds.has(node.id));
  return { edges, nodes: layout(nodes, edges) };
}

async function loadAssets(organizationId: string): Promise<{
  assets: SurfaceAsset[];
  domains: { id: string; rootDomain: string }[];
  findings: OrganizationFinding[];
  lookalikes: SurfaceLookalike[];
}> {
  const assets: SurfaceAsset[] = [];
  let domains: { id: string; rootDomain: string }[] = [];
  let after: null | string = null;
  do {
    const response: GraphQLResponse<AssetResponse> = await executeGraphQL(organizationId, ASSET_QUERY, {
      after,
      first: PAGE_SIZE,
    });
    if (response.errors?.length) throw new Error(response.errors.map((error) => error.message).join(" "));
    const page = response.data?.assets;
    if (!page) throw new Error("The graph service returned no asset data.");
    if (response.data?.domains.nodes) domains = response.data.domains.nodes;
    assets.push(...page.nodes);
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  const lookalikes = (
    await Promise.all(
      domains.map(async (domain) => {
        try {
          const rows = await listLookalikes(organizationId, domain.id);
          return rows
            .filter((lookalike) => lookalike.status.toLowerCase() === "open")
            .map((lookalike) => ({ ...lookalike, domainId: domain.id, rootDomain: domain.rootDomain }));
        } catch {
          // Lookalikes are an optional graph layer; keep the asset graph
          // available when monitoring data is unavailable for one domain.
          return [];
        }
      }),
    )
  ).flat();
  let findings: OrganizationFinding[] = [];
  try {
    findings = (await listAllOrganizationFindings(organizationId, { status: "open" })).findings;
  } catch {
    // Findings are an enrichment layer; an unavailable findings endpoint should
    // not prevent the attack-surface inventory from rendering.
  }
  return { assets, domains, findings, lookalikes };
}

function GraphCanvas({
  edges,
  nodes,
  onSelect,
  onNodeDoubleClick,
}: {
  edges: Edge[];
  nodes: Node[];
  onNodeDoubleClick?: (node: Node) => void;
  onSelect?: (id: null | string) => void;
}) {
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(nodes);
  useEffect(() => {
    setFlowNodes(nodes);
  }, [nodes, setFlowNodes]);

  return (
    <ReactFlow
      edges={edges}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      minZoom={0.1}
      nodes={flowNodes}
      nodesConnectable={false}
      nodeTypes={nodeTypes}
      onNodeClick={(_event, node) => {
        onSelect?.(node.id);
      }}
      onNodeDoubleClick={(_event, node) => {
        onNodeDoubleClick?.(node);
      }}
      onNodesChange={onNodesChange}
      onPaneClick={() => {
        onSelect?.(null);
      }}
      proOptions={{ hideAttribution: true }}
    >
      <Controls
        className="graph-controls"
        position="bottom-right"
        showFitView
        showInteractive={false}
        showZoom
      />
      <MiniMap pannable position="bottom-right" zoomable />
    </ReactFlow>
  );
}

function GraphNodeSkeleton({
  className,
  detailClassName = "w-16",
  labelClassName = "w-24",
}: {
  className: string;
  detailClassName?: string;
  labelClassName?: string;
}) {
  return (
    <div className={`absolute flex w-[200px] -translate-x-1/2 flex-col items-center gap-1 ${className}`}>
      <Skeleton className="size-12 rounded-full" />
      <Skeleton className={`h-5 max-w-full rounded-sm ${labelClassName}`} />
      <Skeleton className={`h-4 max-w-full rounded-sm ${detailClassName}`} />
    </div>
  );
}

function GraphSkeletonCanvas() {
  return (
    <div className="relative size-full overflow-hidden">
      <Skeleton className="absolute top-3 right-3 z-10 size-8 rounded-md" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <Skeleton className="absolute top-[24%] left-1/2 h-[6%] w-px -translate-x-1/2" />
        <Skeleton className="absolute top-[30%] left-[18%] h-px w-[64%]" />
        <Skeleton className="absolute top-[30%] left-[18%] h-[5%] w-px" />
        <Skeleton className="absolute top-[30%] left-[42%] h-[5%] w-px" />
        <Skeleton className="absolute top-[30%] left-[63%] h-[5%] w-px" />
        <Skeleton className="absolute top-[30%] left-[82%] h-[5%] w-px" />
        <Skeleton className="absolute top-[48%] left-[10%] h-px w-[30%]" />
        <Skeleton className="absolute top-[48%] left-[58%] h-px w-[32%]" />
        <Skeleton className="absolute top-[48%] left-[10%] h-[7%] w-px" />
        <Skeleton className="absolute top-[48%] left-[25%] h-[7%] w-px" />
        <Skeleton className="absolute top-[48%] left-[40%] h-[7%] w-px" />
        <Skeleton className="absolute top-[48%] left-[58%] h-[7%] w-px" />
        <Skeleton className="absolute top-[48%] left-[74%] h-[7%] w-px" />
        <Skeleton className="absolute top-[48%] left-[90%] h-[7%] w-px" />
        <Skeleton className="absolute top-[68%] left-[18%] h-px w-[64%]" />
        <Skeleton className="absolute top-[68%] left-[18%] h-[7%] w-px" />
        <Skeleton className="absolute top-[68%] left-[50%] h-[7%] w-px" />
        <Skeleton className="absolute top-[68%] left-[82%] h-[7%] w-px" />

        <GraphNodeSkeleton className="top-[10%] left-1/2" detailClassName="w-16" labelClassName="w-32" />
        <GraphNodeSkeleton className="top-[34%] left-[18%]" detailClassName="w-14" />
        <GraphNodeSkeleton className="top-[34%] left-[42%]" detailClassName="w-20" labelClassName="w-28" />
        <GraphNodeSkeleton className="top-[34%] left-[63%]" detailClassName="w-16" />
        <GraphNodeSkeleton className="top-[34%] left-[82%]" detailClassName="w-14" labelClassName="w-28" />
        <GraphNodeSkeleton className="top-[52%] left-[10%]" detailClassName="w-14" labelClassName="w-28" />
        <GraphNodeSkeleton className="top-[52%] left-[25%]" detailClassName="w-20" />
        <GraphNodeSkeleton className="top-[52%] left-[40%]" detailClassName="w-16" labelClassName="w-28" />
        <GraphNodeSkeleton className="top-[52%] left-[58%]" detailClassName="w-20" />
        <GraphNodeSkeleton className="top-[52%] left-[74%]" detailClassName="w-14" labelClassName="w-28" />
        <GraphNodeSkeleton className="top-[52%] left-[90%]" detailClassName="w-16" />
        <GraphNodeSkeleton className="top-[72%] left-[18%]" detailClassName="w-14" />
        <GraphNodeSkeleton className="top-[72%] left-1/2" detailClassName="w-20" labelClassName="w-28" />
        <GraphNodeSkeleton className="top-[72%] left-[82%]" detailClassName="w-14" labelClassName="w-28" />
      </div>
    </div>
  );
}

export function AttackSurfaceGraph() {
  const { user } = useAuth();
  const organizationId = getOrganizationId(user);
  const [assets, setAssets] = useState<SurfaceAsset[]>([]);
  const [findings, setFindings] = useState<OrganizationFinding[]>([]);
  const [lookalikes, setLookalikes] = useState<SurfaceLookalike[]>([]);
  const [watchedDomains, setWatchedDomains] = useState<{ id: string; rootDomain: string }[]>([]);
  const [error, setError] = useState<null | string>(null);
  const [isLoading, setIsLoading] = useState(Boolean(organizationId));
  const [showSkeleton, setShowSkeleton] = useState(Boolean(organizationId));
  const [selectedId, setSelectedId] = useState<null | string>(null);
  const [selectedDomainId, setSelectedDomainId] = useState("");
  const [focusedGroupId, setFocusedGroupId] = useState<null | string>(null);
  const [issueDrawer, setIssueDrawer] = useState<null | { issues: OrganizationFinding[]; label: string; type: string }>(
    null,
  );
  const load = useCallback(async () => {
    if (!organizationId) return;
    setError(null);
    setIsLoading(true);
    try {
      const result = await loadAssets(organizationId);
      setAssets(result.assets);
      setFindings(result.findings);
      setLookalikes(result.lookalikes);
      setWatchedDomains(result.domains);
      setSelectedId(null);
      setFocusedGroupId(null);
      setIssueDrawer(null);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : "Unable to load the attack surface graph.");
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);
  useEffect(() => {
    if (!organizationId) return;
    void load();
  }, [load, organizationId]);
  useEffect(() => {
    if (isLoading) {
      setShowSkeleton(true);
      return;
    }
    const timeout = window.setTimeout(() => setShowSkeleton(false), 450);
    return () => window.clearTimeout(timeout);
  }, [isLoading]);
  const graphDomains = useMemo(() => {
    const domainsById = new Map<string, { id: string; rootDomain: string }>();
    for (const domain of watchedDomains) domainsById.set(domain.id, domain);
    for (const asset of assets) {
      if (!domainsById.has(asset.domainId))
        domainsById.set(asset.domainId, { id: asset.domainId, rootDomain: asset.rootDomain });
    }
    return [...domainsById.values()].toSorted((a, b) => a.rootDomain.localeCompare(b.rootDomain));
  }, [assets, watchedDomains]);
  const activeDomainId =
    selectedDomainId === ALL_DOMAINS_VALUE || graphDomains.some((domain) => domain.id === selectedDomainId)
      ? selectedDomainId
      : (graphDomains[0]?.id ?? "");
  const handleDomainChange = useCallback((domainId: string) => {
    setSelectedDomainId(domainId);
    setSelectedId(null);
    setFocusedGroupId(null);
    setIssueDrawer(null);
  }, []);
  const graph = useMemo(() => {
    const isAllDomains = activeDomainId === ALL_DOMAINS_VALUE || !activeDomainId;
    const scopedAssets = isAllDomains ? assets : assets.filter((asset) => asset.domainId === activeDomainId);
    const scopedFindings = isAllDomains ? findings : findings.filter((finding) => finding.domain_id === activeDomainId);
    const scopedDomains = isAllDomains ? graphDomains : graphDomains.filter((domain) => domain.id === activeDomainId);
    const scopedLookalikes = isAllDomains
      ? lookalikes
      : lookalikes.filter((lookalike) => lookalike.domainId === activeDomainId);
    const expandedGroups = new Set<string>();
    if (focusedGroupId) {
      expandedGroups.add(focusedGroupId);
    }
    const fullGraph = toGraph(
      scopedAssets,
      false,
      expandedGroups,
      scopedFindings,
      scopedLookalikes,
      scopedDomains,
    );
    return focusedGroupId ? focusedGroupGraph(fullGraph, focusedGroupId, scopedAssets, scopedLookalikes) : fullGraph;
  }, [activeDomainId, assets, findings, focusedGroupId, graphDomains, lookalikes]);
  const handleNodeDoubleClick = useCallback((node: Node) => {
    if (
      node.id.startsWith("emails:") ||
      node.id.startsWith("services:") ||
      node.id.startsWith("hosts:") ||
      node.id.startsWith("subdomains:") ||
      node.id.startsWith("lookalikes-root:")
    ) {
      setFocusedGroupId(node.id);
      setSelectedId(null);
      return;
    }
    const data = node.data as Partial<AssetNodeData & GroupedUrlNodeData>;
    if (data.kind === "crawled") return;
    if (data.issues?.length) {
      setIssueDrawer({
        issues: data.issues,
        label: data.label ?? data.host ?? "Asset",
        type: data.type ?? "wayback",
      });
      return;
    }
  }, []);
  const selectedGraph = useMemo(() => {
    if (!selectedId) return graph;
    const connected = new Set<string>([selectedId]);
    for (const edge of graph.edges) {
      if (edge.source === selectedId) connected.add(edge.target);
      if (edge.target === selectedId) connected.add(edge.source);
    }
    return {
      ...graph,
      edges: graph.edges.map((edge) =>
        connected.has(edge.source) && connected.has(edge.target)
          ? edge
          : { ...edge, style: { ...edge.style, opacity: 0.12 } },
      ),
      nodes: graph.nodes.map((node) => ({
        ...node,
        style: { opacity: connected.has(node.id) ? 1 : 0.25, transition: "opacity 150ms ease" },
      })),
    };
  }, [graph, selectedId]);
  if (!organizationId) return <State.Empty preset="noOrganization" />;
  if (error) return <State.Error description={error} onRetry={() => void load()} />;
  if (!isLoading && !showSkeleton && !assets.length && !lookalikes.length)
    return (
      <State.Empty
        description="Add and scan a domain to populate your attack surface graph."
        title="No discovered assets yet"
      />
    );
  return (
    <main className="flex h-full min-h-0 flex-1 flex-col">
      <section aria-label="Interactive attack surface graph" className="relative min-h-0 flex-1 overflow-hidden">
        <div
          className={`relative size-full transition-opacity duration-500 ease-out ${isLoading ? "opacity-0" : "opacity-100"}`}
        >
          {graph.nodes.length ? (
            <GraphCanvas
              edges={selectedGraph.edges}
              key={graph.nodes.map((node) => node.id).join("|")}
              nodes={selectedGraph.nodes}
              onNodeDoubleClick={handleNodeDoubleClick}
              onSelect={setSelectedId}
            />
          ) : null}
        </div>
        {showSkeleton ? (
          <div
            aria-label="Loading attack surface graph"
            className={`absolute inset-0 z-20 transition-opacity duration-500 ease-out ${isLoading ? "opacity-100" : "pointer-events-none opacity-0"}`}
            role="status"
          >
            <GraphSkeletonCanvas />
          </div>
        ) : null}
        {focusedGroupId ? (
          <div className="absolute top-3 left-3 z-10">
            <Button
              className="bg-card text-foreground shadow-none hover:bg-accent dark:bg-card"
              onClick={() => {
                setFocusedGroupId(null);
                setSelectedId(null);
              }}
              size="sm"
              variant="outline"
            >
              <ArrowLeft className="size-4" />
              Back to graph
            </Button>
          </div>
        ) : null}
        <div className="absolute top-3 right-3 z-10 flex h-9 items-center gap-2">
          {graphDomains.length ? (
            <Select onValueChange={handleDomainChange} value={activeDomainId || graphDomains[0]?.id}>
              <SelectTrigger
                aria-label="Select domain for attack surface graph"
                className="h-9 w-[min(260px,55vw)] border-border bg-card text-[14px] shadow-none dark:bg-card"
              >
                <SelectValue placeholder="Select domain" />
              </SelectTrigger>
              <SelectContent
                align="start"
                avoidCollisions={false}
                className="border-border"
                position="popper"
                side="bottom"
              >
                <SelectItem value={ALL_DOMAINS_VALUE}>All domains</SelectItem>
                {graphDomains.map((domain) => (
                  <SelectItem key={domain.id} value={domain.id}>
                    {domain.rootDomain}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
      </section>
      <Drawer onOpenChange={(open) => !open && setIssueDrawer(null)} open={issueDrawer !== null}>
        {issueDrawer ? (
          <GraphIssuesDrawer issues={issueDrawer.issues} label={issueDrawer.label} type={issueDrawer.type} />
        ) : null}
      </Drawer>
    </main>
  );
}
