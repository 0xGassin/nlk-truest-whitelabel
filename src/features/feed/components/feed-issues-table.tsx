"use client";

import type { FeedIssueGroup } from "../hooks/use-issue-grouping";
import type { ColumnDef } from "@/components/ui/data-table";
import type { Filter, FilterFieldConfig } from "@/components/ui/filters";
import type { IssueDrawerTabId } from "@/features/issues/components/issue-drawer-ui";
import type { UnifiedIssue } from "@/services/api/feed";
import type { LucideIcon } from "lucide-react";
import type { Components } from "react-markdown";

import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  Boxes,
  Braces,
  Brain,
  CheckCircle2,
  ChevronDown,
  CloudCog,
  Eye,
  EyeOff,
  FileText,
  GalleryVerticalEnd,
  ListFilter,
  MoreHorizontal,
  Shapes,
  Share2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useCallback, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CommandCodeBlock } from "@/components/ui/command-code-block";
import {
  DataTable,
  DataTableRefreshButton,
  dataTableToolbarButtonClassName,
  dataTableToolbarInputClassName,
} from "@/components/ui/data-table";
import { detailDrawerSurfaceClassName, Drawer, DrawerContent } from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Filters } from "@/components/ui/filters";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Docker } from "@/components/ui/svgs/docker";
import { toast } from "@/components/ui/toast/toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ViewOptions } from "@/components/ui/view-options";
import { ContainerPackageVersionUpgrade, CVSSGauge } from "@/features/containers";
import { LinearIssueAction } from "@/features/integrations/components/linear-issue-action";
import { IssueAutofixActions } from "@/features/issues/components/issue-autofix-actions";
import {
  ISSUE_DRAWER_BODY_CLASS,
  ISSUE_DRAWER_SECTION_CLASS,
  ISSUE_DRAWER_SECTIONS_CLASS,
  IssueDrawerAffectedFilesTable,
  IssueDrawerAffectedResourcesTable,
  issueDrawerBrainDisabledIconButtonClass,
  issueDrawerBrainIconButtonClass,
  IssueDrawerExternalLinkButton,
  IssueDrawerFooter,
  IssueDrawerHeaderBadges,
  IssueDrawerHeaderMain,
  IssueDrawerHeaderSection,
  IssueDrawerHeaderShell,
  IssueDrawerIgnoreButton,
  IssueDrawerSectionHeading,
  IssueDrawerTabs,
  IssueDrawerTitle,
} from "@/features/issues/components/issue-drawer-ui";
import { isAutofixAvailable } from "@/features/issues/lib/autofix";
import { unifiedIssueToSecurityIssue } from "@/features/issues/lib/security-issue";
import { useAuth } from "@/lib/auth";
import {
  formatManifestPath,
  isScaIssue,
  packageGroupImpactText,
  scaVulnDescription,
  scaVulnTitle,
} from "@/lib/sca-display";
import { cn } from "@/lib/utils";
import { complianceService } from "@/services/api";
import { containerService } from "@/services/api/container";
import { integrationApi } from "@/services/api/integration";

import { SEVERITY_ORDER } from "../hooks/use-issue-grouping";

/** Props for markdown component children */
interface MarkdownChildrenProps {
  children?: React.ReactNode;
}

/** Props for markdown anchor elements */
interface MarkdownAnchorProps extends MarkdownChildrenProps {
  href?: string;
}

// Helper for markdown components
const _MarkdownComponents = {
  a: ({ children, href }: MarkdownAnchorProps) => (
    <a className="font-medium text-primary hover:underline" href={href} rel="noopener noreferrer" target="_blank">
      {children}
    </a>
  ),
  code: ({ children }: MarkdownChildrenProps) => (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{children}</code>
  ),
  li: ({ children }: MarkdownChildrenProps) => <li>{children}</li>,
  ol: ({ children }: MarkdownChildrenProps) => (
    <ol className="mb-2 list-decimal space-y-1 pl-4 text-sm text-muted-foreground">{children}</ol>
  ),
  p: ({ children }: MarkdownChildrenProps) => (
    <p className="mb-2 text-sm leading-relaxed text-muted-foreground last:mb-0">{children}</p>
  ),
  pre: ({ children }: MarkdownChildrenProps) => (
    <pre className="my-2 overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs">{children}</pre>
  ),
  strong: ({ children }: MarkdownChildrenProps) => <span className="font-semibold text-foreground">{children}</span>,
  ul: ({ children }: MarkdownChildrenProps) => (
    <ul className="mb-2 list-disc space-y-1 pl-4 text-sm text-muted-foreground">{children}</ul>
  ),
};

const PlainDescriptionMarkdownComponents: Components = {
  a: ({ children, href }: MarkdownAnchorProps) => (
    <a className="text-foreground underline underline-offset-2" href={href} rel="noopener noreferrer" target="_blank">
      {children}
    </a>
  ),
  code: ({ children }: MarkdownChildrenProps) => (
    <code className="font-mono text-[0.95em] text-foreground">{children}</code>
  ),
  li: ({ children }: MarkdownChildrenProps) => <li>{children}</li>,
  ol: ({ children }: MarkdownChildrenProps) => (
    <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">{children}</ol>
  ),
  p: ({ children }: MarkdownChildrenProps) => (
    <p className="mb-3 text-sm leading-relaxed text-muted-foreground last:mb-0">{children}</p>
  ),
  pre: ({ children }: MarkdownChildrenProps) => (
    <pre className="overflow-x-auto font-mono text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
      {children}
    </pre>
  ),
  strong: ({ children }: MarkdownChildrenProps) => <span className="font-normal text-inherit">{children}</span>,
  ul: ({ children }: MarkdownChildrenProps) => (
    <ul className="mb-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">{children}</ul>
  ),
};

const ISSUE_DRAWER_BODY_SPACING = "flex-1 min-h-0 overflow-y-auto px-6 py-8 space-y-8";
const ISSUE_DRAWER_TEXT_SECTION_SPACING = "space-y-3";
const ISSUE_DRAWER_TABLE_SECTION_SPACING = "space-y-3";

interface Props {
  centerIssueName?: boolean;
  groupByPackage: boolean;
  hideGroupByPackage?: boolean;
  hideIssueSubtext?: boolean;
  hideLocationColumn?: boolean;
  hideSuggestedCliFix?: boolean;
  hideTypeColumn?: boolean;
  isLoading: boolean;
  issues: (FeedIssueGroup | UnifiedIssue)[];
  layout?: "content" | "fill";
  onGroupByPackageChange: (value: boolean) => void;
  onRefresh: () => void;
  onStatusChange: (status: string) => void;
  spellOutIssueNames?: boolean;
  stats?: {
    active_issues: number;
    ignored_issues: number;
    solved_issues: number;
  };
  status: string;
}

export function FeedIssuesTable({
  centerIssueName = false,
  groupByPackage,
  hideGroupByPackage = false,
  hideIssueSubtext = false,
  hideLocationColumn = false,
  hideSuggestedCliFix = false,
  hideTypeColumn = false,
  isLoading,
  issues,
  layout = "fill",
  onGroupByPackageChange,
  onRefresh,
  onStatusChange,
  spellOutIssueNames = false,
  stats,
  status,
}: Props) {
  const [selected, setSelected] = useState<FeedIssueGroup | null | UnifiedIssue>(null);
  const [drawerTab, setDrawerTab] = useState<IssueDrawerTabId>("overview");
  const [isRemediationOpen, setIsRemediationOpen] = useState(true);
  const [isSuggestedFixOpen, setIsSuggestedFixOpen] = useState(true);
  const router = useRouter();
  const { user } = useAuth();

  const handleIgnore = useCallback(
    async (issue: UnifiedIssue, newStatus: "active" | "ignored", suppressToastAndRefresh = false) => {
      try {
        if (issue.type === "container") {
          if (user?.organization?.id) {
            await containerService.updateVulnerabilityStatus(user.organization.id, issue.id, newStatus);
          }
        } else if (issue.type === "cspm") {
          if (user?.organization?.id && issue.resource_id) {
            await complianceService.updateCSPMIssueStatus(user.organization.id, issue.resource_id, issue.id, newStatus);
          }
        } else {
          if (newStatus === "ignored") {
            const filePath = issue.location.split(":")[0];
            const lineMatch = /:(\d+)$/.exec(issue.location);
            const line = lineMatch ? Number.parseInt(lineMatch[1]) : undefined;

            if (user?.organization?.id && issue.resource_id) {
              await integrationApi.ignoreIssue(user.organization.id, issue.resource_id, issue.name, filePath, line);
            }
          } else {
            if (user?.organization?.id && issue.resource_id) {
              await integrationApi.unignoreIssue(user.organization.id, issue.resource_id, issue.id);
            }
          }
        }

        if (!suppressToastAndRefresh) {
          toast.success(`Issue marked as ${newStatus}`);
          onRefresh();
        }
      } catch (error) {
        console.error(error);
        if (!suppressToastAndRefresh) {
          toast.error("Failed to update issue status");
        }
        throw error;
      }
    },
    [user, onRefresh],
  );

  // Grouping Logic handled in parent component via useIssueGrouping hook

  const activeFilters = useMemo<Filter[]>(
    () => (status === "all" ? [] : [{ field: "status", id: "feed-status-filter", operator: "is", values: [status] }]),
    [status],
  );

  const statusFields = useMemo<FilterFieldConfig[]>(
    () => [
      {
        key: "status",
        label: "Status",
        operators: [
          { label: "is", value: "is" },
          { label: "is not", value: "is_not" },
        ],
        options: [
          {
            label: stats?.active_issues ? `Active Findings (${String(stats.active_issues)})` : "Active Findings",
            value: "active",
          },
          {
            label: stats?.ignored_issues ? `Ignored Findings (${String(stats.ignored_issues)})` : "Ignored Findings",
            value: "ignored",
          },
          {
            label: stats?.solved_issues ? `Solved Findings (${String(stats.solved_issues)})` : "Solved Findings",
            value: "solved",
          },
        ],
        type: "select",
      },
    ],
    [stats],
  );

  const filtersToolbar = (
    <div className="flex flex-wrap items-center gap-2.5">
      <Filters
        fields={statusFields}
        filters={activeFilters}
        onChange={(next) => {
          onStatusChange(next.length > 0 ? String(next[0].values[0]) : "all");
        }}
        trigger={
          <Button className={cn(dataTableToolbarButtonClassName, "gap-1.5")} variant="outline">
            <ListFilter className="size-4" />
            Add Filter
          </Button>
        }
      />
      {status === "active" ? null : (
        <Button
          className={cn(dataTableToolbarButtonClassName, "gap-1.5")}
          onClick={() => {
            onStatusChange("active");
          }}
          variant="outline"
        >
          <ListFilter className="size-4" />
          Clear
        </Button>
      )}
      {hideGroupByPackage ? null : (
        <ViewOptions buttonClassName={dataTableToolbarButtonClassName}>
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onClick={(e) => {
              e.preventDefault();
              onGroupByPackageChange(!groupByPackage);
            }}
          >
            <div
              className={cn(
                "flex size-4 items-center justify-center rounded-sm border border-primary",
                groupByPackage ? "bg-primary text-primary-foreground" : "opacity-50",
              )}
            >
              {groupByPackage ? <CheckCircle2 className="size-3" /> : null}
            </div>
            Group Issues by Package
          </DropdownMenuItem>
        </ViewOptions>
      )}
    </div>
  );

  const handleSelectIssue = (issue: FeedIssueGroup | null | UnifiedIssue) => {
    setSelected(issue);
    setDrawerTab("overview");
  };

  const columns: ColumnDef<FeedIssueGroup | UnifiedIssue>[] = useMemo(() => {
    const handleGroupAction = async (
      groupItem: FeedIssueGroup,
      targetStatus: "active" | "ignored",
      toastId: string,
    ) => {
      try {
        await Promise.all(groupItem.issues.map((issue) => handleIgnore(issue, targetStatus, true)));
        toast.dismiss(toastId);
        toast.success(`Group ${targetStatus === "ignored" ? "ignored" : "restored"} successfully`);
        onRefresh();
      } catch (error) {
        toast.dismiss(toastId);
        toast.error("Failed to update some issues in the group");
        console.error(error);
      }
    };

    const baseColumns: ColumnDef<FeedIssueGroup | UnifiedIssue>[] = [
      {
        align: "center",
        cell: (item) => (
          <div className="flex items-center justify-center">
            <TypeIcon className="size-5 text-muted-foreground/80" type={item.type} />
          </div>
        ),
        header: "Type",
        id: "type",
        sortable: true,
        width: "60px",
      },
      {
        cell: (item) => {
          const issueNameClassName = spellOutIssueNames
            ? "min-w-0 truncate text-[14px] leading-5 font-normal text-foreground"
            : "max-w-[500px] truncate text-[14px] leading-5 font-normal text-foreground";
          if ("issue_count" in item) {
            if (item.pkg_name) {
              return (
                <div className={cn("min-w-0", centerIssueName && "flex min-h-[40px] items-center")}>
                  <div className={issueNameClassName} title={item.pkg_name}>
                    {item.pkg_name}
                  </div>
                  {hideIssueSubtext ? null : (
                    <div
                      className="mt-0.5 max-w-[500px] truncate text-[13px] leading-5 font-normal text-foreground/80"
                      title={`Version: ${String(item.installed_version)}`}
                    >
                      Version: {item.installed_version} • {item.issue_count} issues
                    </div>
                  )}
                </div>
              );
            }
            return (
              <div className={cn("min-w-0", centerIssueName && "flex min-h-[40px] items-center")}>
                <div className={issueNameClassName} title={item.name}>
                  {item.name}
                </div>
                {hideIssueSubtext ? null : (
                  <div
                    className="mt-0.5 max-w-[500px] truncate text-[13px] leading-5 font-normal text-foreground/80"
                    title={item.subtitle}
                  >
                    {item.issue_count} issues {item.subtitle ?? <span className="opacity-0">-</span>}
                  </div>
                )}
              </div>
            );
          }
          const issue = item;
          const { primaryText, secondaryText } = getIssueDisplayProps(issue);
          return (
            <div className={cn("min-w-0", centerIssueName && "flex min-h-[40px] items-center")}>
              <div className={issueNameClassName} title={primaryText}>
                {primaryText}
              </div>
              {hideIssueSubtext ? null : (
                <div
                  className="mt-0.5 max-w-[500px] truncate text-[13px] leading-5 font-normal text-foreground/80"
                  title={secondaryText}
                >
                  {secondaryText || <span className="opacity-0">-</span>}
                </div>
              )}
            </div>
          );
        },
        header: "Name",
        id: "name",
        sortable: true,
        sortValue: (item) => {
          if ("pkg_name" in item && "issue_count" in item) {
            return item.pkg_name ?? "";
          }
          const issue = item as UnifiedIssue;
          return getIssueDisplayProps(issue).primaryText;
        },
        width: spellOutIssueNames ? "100%" : undefined,
      },
      {
        cell: (item) => <SeverityBadge severity={"highest_severity" in item ? item.highest_severity : item.severity} />,
        header: "Severity",
        id: "severity",
        sortable: true,
        sortValue: (item) =>
          SEVERITY_ORDER[("highest_severity" in item ? item.highest_severity : item.severity).toUpperCase()] ?? 4,
        width: "120px",
      },
      {
        cell: (item) => {
          const isGroup = "issue_count" in item;
          const issue = isGroup ? null : item;
          const isDependency = issue && isScaIssue(issue);
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          const rawLocation = item.resource_name || (item.location?.split(":")[0] ?? "");
          const displayLocation =
            isDependency && !item.resource_name && item.location ? formatManifestPath(item.location) : rawLocation;
          const resourceId = "resource_id" in item ? item.resource_id : undefined;

          return (
            <div
              className={cn(
                "block max-w-[220px] truncate text-[13px] leading-5 font-normal text-foreground/80",
                resourceId && "cursor-pointer text-primary hover:underline",
              )}
              onClick={(e) => {
                if (resourceId) {
                  e.stopPropagation();
                  const path =
                    item.type === "container" ? `/container?id=${resourceId}` : `/assets/repositories/${resourceId}`;
                  router.push(path);
                }
              }}
              onKeyDown={(e) => {
                if (resourceId && (e.key === "Enter" || e.key === " ")) {
                  e.stopPropagation();
                  const path =
                    item.type === "container" ? `/container?id=${resourceId}` : `/assets/repositories/${resourceId}`;
                  router.push(path);
                }
              }}
              role={resourceId ? "button" : undefined}
              tabIndex={resourceId ? 0 : undefined}
              title={rawLocation || displayLocation}
            >
              {displayLocation}
            </div>
          );
        },
        header: "Location",
        id: "location",
        sortable: true,
        width: "240px",
      },
      {
        cell: (item) => (
          <span
            className="text-[13px] leading-5 font-normal whitespace-nowrap text-foreground/80"
            title={new Date(item.created_at).toLocaleString()}
          >
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
          </span>
        ),
        header: "First Detected",
        id: "created_at",
        sortable: true,
        width: "140px",
      },
      {
        cell: (item) => {
          const isGroup = "issue_count" in item;
          const isIgnored = isGroup
            ? item.issues.every((i) => i.status === "ignored" || i.status === "auto_ignored")
            : item.status === "ignored" || item.status === "auto_ignored";

          const showRestore = isGroup ? status === "ignored" : isIgnored;

          return (
            <div className="flex items-center justify-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="size-8 text-muted-foreground hover:bg-[#e2e2e2] hover:text-foreground dark:hover:bg-accent"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    size="icon"
                    variant="ghost"
                  >
                    <MoreHorizontal className="size-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectIssue(item);
                    }}
                  >
                    <FileText className="mr-2 size-4" />
                    View Details{isGroup ? ` (${String(item.issue_count)} issues)` : ""}
                  </DropdownMenuItem>

                  {"issue_count" in item ? null : (
                    <LinearIssueAction
                      description={item.description}
                      findingId={item.id}
                      severity={item.severity}
                      source={item.type}
                      title={getIssueDisplayProps(item).primaryText}
                      url={
                        item.type === "container"
                          ? `/container?id=${item.resource_id ?? ""}`
                          : item.type === "cspm"
                            ? "/cspm"
                            : item.resource_id
                              ? `/assets/repositories/${item.resource_id}`
                              : undefined
                      }
                    />
                  )}

                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isGroup) {
                        const targetStatus = showRestore ? "active" : "ignored";
                        const toastId = toast(
                          `${targetStatus === "ignored" ? "Ignoring" : "Restoring"} ${String(item.issues.length)} issues...`,
                        );
                        void handleGroupAction(item, targetStatus, toastId);
                      } else {
                        void handleIgnore(item, isIgnored ? "active" : "ignored");
                      }
                    }}
                  >
                    {showRestore ? (
                      <>
                        <Eye className="mr-2 size-4" />
                        Restore{isGroup ? " Group" : ""}
                      </>
                    ) : (
                      <>
                        <EyeOff className="mr-2 size-4" />
                        Ignore{isGroup ? " Group" : ""}
                      </>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
        header: "",
        id: "actions",
        width: "80px",
      },
    ];

    return baseColumns.filter((column) => {
      if (hideLocationColumn && column.id === "location") {
        return false;
      }

      if (hideTypeColumn && column.id === "type") {
        return false;
      }

      return true;
    });
  }, [
    centerIssueName,
    hideIssueSubtext,
    hideLocationColumn,
    hideTypeColumn,
    router,
    status,
    handleIgnore,
    onRefresh,
    spellOutIssueNames,
  ]);

  const subissueColumns: ColumnDef<UnifiedIssue>[] = useMemo(
    () => [
      {
        cell: (issue) => <SeverityBadge severity={issue.severity} />,
        header: "Severity",
        id: "severity",
        sortable: true,
        sortValue: (issue) => SEVERITY_ORDER[issue.severity.toUpperCase()] ?? 4,
        width: "120px",
      },
      {
        cell: (issue) => {
          if (isScaIssue(issue) || issue.type === "container") {
            return (
              <div className="flex flex-col gap-1 pl-2">
                <span
                  className="max-w-[400px] truncate font-mono text-sm font-semibold text-foreground"
                  title={issue.name}
                >
                  {issue.name}
                </span>
              </div>
            );
          }

          const { primaryText, secondaryText } = getIssueDisplayProps(issue);
          const displaySecondary = ["iac", "sast"].includes(issue.type.toLowerCase()) ? issue.location : secondaryText;

          return (
            <div className="flex flex-col gap-0.5 pl-2 transition-all duration-300">
              <span className="max-w-[400px] truncate text-sm font-semibold text-foreground" title={primaryText}>
                {primaryText}
              </span>
              <span className="max-w-[400px] truncate text-xs font-medium text-foreground/90" title={displaySecondary}>
                {displaySecondary}
              </span>
            </div>
          );
        },
        header: "Subissue",
        id: "name",
      },
      {
        cell: (issue) => <StatusBadge status={issue.status} />,
        header: "Status",
        id: "status",
        width: "120px",
      },
      {
        align: "right",
        cell: (issue) => (
          <div
            className="flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
              }
            }}
            role="button"
            tabIndex={0}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="size-8 text-muted-foreground hover:bg-[#e2e2e2] hover:text-foreground dark:hover:bg-accent"
                  size="icon"
                  variant="ghost"
                >
                  <MoreHorizontal className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {issue.type === "container" ? (
                  <DropdownMenuItem
                    onClick={() => {
                      handleSelectIssue(issue);
                    }}
                  >
                    <FileText className="mr-2 size-4" />
                    View Details
                  </DropdownMenuItem>
                ) : null}
                <LinearIssueAction
                  description={issue.description}
                  findingId={issue.id}
                  severity={issue.severity}
                  source={issue.type}
                  title={getIssueDisplayProps(issue).primaryText}
                  url={
                    issue.type === "container"
                      ? `/container?id=${issue.resource_id ?? ""}`
                      : issue.type === "cspm"
                        ? "/cspm"
                        : issue.resource_id
                          ? `/assets/repositories/${issue.resource_id}`
                          : undefined
                  }
                />
                <DropdownMenuItem
                  onClick={() => {
                    const isIgnored = issue.status === "ignored" || issue.status === "auto_ignored";
                    void handleIgnore(issue, isIgnored ? "active" : "ignored");
                  }}
                >
                  {issue.status === "ignored" || issue.status === "auto_ignored" ? (
                    <>
                      <Eye className="mr-2 size-4" />
                      Restore
                    </>
                  ) : (
                    <>
                      <EyeOff className="mr-2 size-4" />
                      Ignore
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
        header: "",
        id: "actions",
        width: "80px",
      },
    ],
    [handleIgnore],
  );

  const groupIssueDrawerContent =
    selected && "issue_count" in selected && !selected.pkg_name
      ? (() => {
          const leadIssue = selected.issues[0];
          const allIgnored = selected.issues.every((i) => i.status === "ignored" || i.status === "auto_ignored");
          const groupIsIgnored = status === "ignored" || allIgnored;
          const affectedFiles = [...new Set(selected.issues.map((issue) => issue.location).filter(Boolean))];
          const remediationIssue = unifiedIssueToSecurityIssue(leadIssue);
          const showGroupAutofix = selected.resource_id && isAutofixAvailable(remediationIssue);

          const groupTabsContent = (() => {
            const groupTabs: {
              count?: number;
              icon: typeof Shapes;
              id: IssueDrawerTabId;
              label: string;
            }[] = [{ icon: Shapes, id: "overview", label: "Overview" }];

            if (affectedFiles.length > 0) {
              groupTabs.push({
                count: affectedFiles.length,
                icon: GalleryVerticalEnd,
                id: "affected",
                label: "Affected",
              });
            }

            const activeTab = groupTabs.some((tab) => tab.id === drawerTab) ? drawerTab : "overview";

            return (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <IssueDrawerTabs activeTab={activeTab} onTabChange={setDrawerTab} tabs={groupTabs} />

                <div className={ISSUE_DRAWER_BODY_SPACING}>
                  {activeTab === "overview" ? (
                    <>
                      {leadIssue.description ? (
                        <div className={ISSUE_DRAWER_TEXT_SECTION_SPACING}>
                          <IssueDrawerSectionHeading>Description</IssueDrawerSectionHeading>
                          <div>
                            <ReactMarkdown components={PlainDescriptionMarkdownComponents} remarkPlugins={[remarkGfm]}>
                              {getIssueDescription(leadIssue)}
                            </ReactMarkdown>
                          </div>
                        </div>
                      ) : null}

                      {leadIssue.remediation ? (
                        <div className={ISSUE_DRAWER_TEXT_SECTION_SPACING}>
                          <IssueDrawerSectionHeading>Remediation</IssueDrawerSectionHeading>
                          <div>
                            <ReactMarkdown components={PlainDescriptionMarkdownComponents} remarkPlugins={[remarkGfm]}>
                              {leadIssue.remediation}
                            </ReactMarkdown>
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : null}

                  {activeTab === "affected" && affectedFiles.length > 0 ? (
                    <div className={ISSUE_DRAWER_TABLE_SECTION_SPACING}>
                      <IssueDrawerSectionHeading>Affected Files</IssueDrawerSectionHeading>
                      <IssueDrawerAffectedFilesTable
                        files={affectedFiles}
                        onCopy={(file) => {
                          void navigator.clipboard.writeText(file);
                          toast.success("Copied", { description: "File path copied to clipboard" });
                        }}
                        onFileClick={(file) => {
                          const matchingIssue = selected.issues.find((issue) => issue.location === file);
                          if (matchingIssue) {
                            handleSelectIssue(matchingIssue);
                          }
                        }}
                      />
                    </div>
                  ) : null}
                </div>

                <IssueDrawerFooter>
                  {showGroupAutofix ? (
                    <IssueAutofixActions
                      issue={remediationIssue}
                      organizationId={user?.organization?.id}
                      repoId={selected.resource_id}
                    />
                  ) : null}
                </IssueDrawerFooter>
              </div>
            );
          })();

          return (
            <div className="flex h-full flex-col overflow-hidden">
              <IssueDrawerHeaderShell>
                <IssueDrawerHeaderBadges>
                  <SeverityBadge severity={selected.highest_severity} />
                  <Badge className="font-normal" variant="outline">
                    {selected.source}
                  </Badge>
                  <StatusBadge label={selected.status_label} status={selected.status} />
                </IssueDrawerHeaderBadges>

                <IssueDrawerHeaderMain
                  actions={
                    <>
                      <TooltipProvider delayDuration={0}>
                        {leadIssue.triage_reason ? (
                          <HoverCard openDelay={200}>
                            <HoverCardTrigger asChild>
                              <Button className={issueDrawerBrainIconButtonClass} size="icon" variant="ghost">
                                <Brain className="size-[18px] stroke-[2.3px]" />
                              </Button>
                            </HoverCardTrigger>
                            <HoverCardContent align="end" className="w-[380px] overflow-hidden p-0" side="bottom">
                              <div className="relative flex flex-col">
                                <div className="flex items-center gap-3 bg-muted/20 px-4 py-3">
                                  <div className="text-sm font-semibold text-foreground">AI Insight</div>
                                </div>
                                <div className="p-4">
                                  <p className="text-sm leading-relaxed font-normal text-pretty text-foreground/90">
                                    {leadIssue.triage_reason}
                                  </p>
                                </div>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button className={issueDrawerBrainDisabledIconButtonClass} size="icon" variant="ghost">
                                <Brain className="size-5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent align="end" side="bottom">
                              <p className="text-xs">No AI analysis available for this issue</p>
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {selected.resource_id ? (
                          <IssueDrawerExternalLinkButton
                            onClick={() => {
                              router.push(`/repositories/${String(selected.resource_id)}`);
                            }}
                          />
                        ) : null}
                      </TooltipProvider>
                      <IssueDrawerIgnoreButton
                        isIgnored={groupIsIgnored}
                        onClick={async () => {
                          const targetStatus = groupIsIgnored ? "active" : "ignored";
                          const toastId = toast(
                            `${targetStatus === "ignored" ? "Ignoring" : "Restoring"} ${String(selected.issues.length)} issues...`,
                          );
                          try {
                            await Promise.all(selected.issues.map((issue) => handleIgnore(issue, targetStatus, true)));
                            toast.dismiss(toastId);
                            toast.success(`Group ${targetStatus === "ignored" ? "ignored" : "restored"} successfully`);
                            handleSelectIssue(null);
                            onRefresh();
                          } catch {
                            toast.dismiss(toastId);
                            toast.error("Failed to update some issues in the group");
                          }
                        }}
                      />
                    </>
                  }
                  title={isScaIssue(selected.issues[0]) ? scaVulnTitle(selected.issues[0]) : selected.name}
                />
              </IssueDrawerHeaderShell>

              {groupTabsContent}
            </div>
          );
        })()
      : null;

  const packageGroupDrawerContent =
    selected && "issue_count" in selected && selected.pkg_name
      ? (() => {
          const allIgnored = selected.issues.every((i) => i.status === "ignored" || i.status === "auto_ignored");
          const groupIsIgnored = status === "ignored" || allIgnored;

          const packageGroupTabsContent = (() => {
            const containerTabs: {
              count?: number;
              icon: typeof Shapes;
              id: IssueDrawerTabId;
              label: string;
            }[] = [{ icon: Shapes, id: "overview", label: "Overview" }];

            if (selected.issue_count > 0) {
              containerTabs.push({
                count: selected.issue_count,
                icon: GalleryVerticalEnd,
                id: "affected",
                label: "Subissues",
              });
            }

            const activeTab = containerTabs.some((tab) => tab.id === drawerTab) ? drawerTab : "overview";

            return (
              <>
                <IssueDrawerTabs activeTab={activeTab} onTabChange={setDrawerTab} tabs={containerTabs} />
                <div className={ISSUE_DRAWER_BODY_SPACING}>
                  {activeTab === "overview" ? (
                    <div className={ISSUE_DRAWER_TEXT_SECTION_SPACING}>
                      <IssueDrawerSectionHeading>Description</IssueDrawerSectionHeading>
                      <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
                        {selected.issues[0]?.description && selected.issues.length === 1 ? (
                          <ReactMarkdown components={PlainDescriptionMarkdownComponents} remarkPlugins={[remarkGfm]}>
                            {selected.issues[0].description}
                          </ReactMarkdown>
                        ) : selected.issues.length > 1 ? (
                          <>
                            <p>
                              Review the Subissues tab to learn more about each vulnerability affecting{" "}
                              <span className="font-medium text-foreground">{selected.pkg_name || selected.name}</span>.
                            </p>
                            <p>{packageGroupImpactText(selected.issues)}</p>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {activeTab === "affected" ? (
                    <section className="space-y-4">
                      <div className="overflow-hidden">
                        <DataTable
                          className="border-0 shadow-none"
                          columns={subissueColumns}
                          data={selected.issues}
                          defaultPageSize={50}
                          defaultSort={{ direction: "asc", key: "severity" }}
                          getRowKey={(v) => v.id}
                          layout="content"
                          onRowClick={(issue) => {
                            handleSelectIssue(issue);
                          }}
                          searchKey="name"
                          searchPlaceholder="Search Subissues"
                        />
                      </div>
                    </section>
                  ) : null}
                </div>
              </>
            );
          })();

          return (
            <div className="flex h-full flex-col overflow-hidden">
              <IssueDrawerHeaderShell>
                <IssueDrawerHeaderBadges>
                  <SeverityBadge severity={selected.highest_severity} />
                  <Badge className="font-normal" variant="outline">
                    {selected.source}
                  </Badge>
                  <StatusBadge label={selected.status_label} status={selected.status} />
                </IssueDrawerHeaderBadges>

                <IssueDrawerHeaderMain
                  actions={
                    <>
                      {selected.resource_id ? (
                        <IssueDrawerExternalLinkButton
                          onClick={() => {
                            if (selected.type === "container") {
                              router.push(`/containers/${String(selected.resource_id)}`);
                            } else {
                              router.push(`/assets/repositories/${String(selected.resource_id)}`);
                            }
                          }}
                        />
                      ) : null}
                      <IssueDrawerIgnoreButton
                        ignoreLabel="Ignore Group"
                        isIgnored={groupIsIgnored}
                        onClick={async () => {
                          const targetStatus = groupIsIgnored ? "active" : "ignored";
                          const toastId = toast(
                            `${targetStatus === "ignored" ? "Ignoring" : "Restoring"} ${String(selected.issues.length)} issues...`,
                          );
                          try {
                            await Promise.all(selected.issues.map((issue) => handleIgnore(issue, targetStatus, true)));
                            toast.dismiss(toastId);
                            toast.success(`Group ${targetStatus === "ignored" ? "ignored" : "restored"} successfully`);
                            handleSelectIssue(null);
                            onRefresh();
                          } catch {
                            toast.dismiss(toastId);
                            toast.error("Failed to update some issues in the group");
                          }
                        }}
                        restoreLabel="Restore Group"
                      />
                    </>
                  }
                  title={selected.pkg_name || selected.name}
                />
              </IssueDrawerHeaderShell>

              {packageGroupTabsContent}

              <IssueDrawerFooter />
            </div>
          );
        })()
      : null;

  const singleIssueDrawerContent =
    selected && !("issue_count" in selected)
      ? (() => {
          const affectedResourceCount =
            selected.type === "cspm" && selected.resource_ids?.length ? selected.resource_ids.length : 0;

          const singleIssueTabs: {
            count?: number;
            icon: typeof Shapes;
            id: IssueDrawerTabId;
            label: string;
          }[] = [{ icon: Shapes, id: "overview", label: "Overview" }];

          if (affectedResourceCount > 0) {
            singleIssueTabs.push({
              count: affectedResourceCount,
              icon: GalleryVerticalEnd,
              id: "affected",
              label: "Affected",
            });
          }

          const activeTab = singleIssueTabs.some((tab) => tab.id === drawerTab) ? drawerTab : "overview";

          const typeConfig = issueTypeIconConfig[selected.type.toLowerCase()] ?? {
            icon: AlertCircle,
            label: selected.type,
          };
          const typeLabel = typeConfig.label;
          const resourceValue = selected.resource_name || selected.resource_id || "—";
          const locationValue = selected.location || "—";
          const ruleValue = selected.name || selected.scanner_title || "—";
          const hasDescription = !!getIssueDescription(selected);
          const hasFindingDetails =
            !!selected.contextual_description && selected.contextual_description !== selected.description;
          const hasRemediation = !!selected.remediation;
          const showSuggestedFix = !hideSuggestedCliFix && selected.type === "cspm";

          return (
            <div className="flex h-full flex-col overflow-hidden">
              <IssueDrawerHeaderSection>
                <div className="min-w-0 flex-1">
                  <IssueDrawerTitle>{getIssueDisplayProps(selected).primaryText}</IssueDrawerTitle>
                  <div className="text-sm text-muted-foreground">
                    <span>{typeLabel}</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <IssueDrawerIgnoreButton
                    isIgnored={selected.status === "ignored" || selected.status === "auto_ignored"}
                    onClick={async () => {
                      const issueIsIgnored = selected.status === "ignored" || selected.status === "auto_ignored";
                      const targetStatus = issueIsIgnored ? "active" : "ignored";
                      try {
                        await handleIgnore(selected, targetStatus);
                        handleSelectIssue(null);
                      } catch {
                        // handleIgnore already shows toast on error
                      }
                    }}
                  />
                  <Button
                    className="gap-1.5"
                    onClick={() => toast.info("Share coming soon")}
                    size="sm"
                    variant="outline"
                  >
                    <Share2 className="size-4" />
                    Share
                  </Button>
                </div>
              </IssueDrawerHeaderSection>

              <IssueDrawerTabs activeTab={activeTab} onTabChange={setDrawerTab} tabs={singleIssueTabs} />

              <div className={ISSUE_DRAWER_BODY_CLASS}>
                {activeTab === "overview" ? (
                  <div className={ISSUE_DRAWER_SECTIONS_CLASS}>
                    {hasDescription ? (
                      <div className="text-sm leading-relaxed text-muted-foreground">
                        <ReactMarkdown components={PlainDescriptionMarkdownComponents} remarkPlugins={[remarkGfm]}>
                          {getIssueDescription(selected)}
                        </ReactMarkdown>
                      </div>
                    ) : null}

                    <hr className="border-border/60" />

                    <div className="grid grid-cols-3 gap-4">
                      <div className="min-w-0 space-y-1">
                        <div className="text-sm text-muted-foreground">Severity</div>
                        <SeverityBadge severity={selected.severity} />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="text-sm text-muted-foreground">Resource</div>
                        <div className="truncate text-sm text-foreground" title={resourceValue}>
                          {resourceValue}
                        </div>
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="text-sm text-muted-foreground">Source</div>
                        <div className="truncate text-sm text-foreground">{selected.source}</div>
                      </div>
                    </div>
                    <div className="mt-6 grid grid-cols-3 gap-4">
                      <div className="min-w-0 space-y-1">
                        <div className="text-sm text-muted-foreground">Location</div>
                        <div className="truncate text-sm text-foreground" title={locationValue}>
                          {locationValue}
                        </div>
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="text-sm text-muted-foreground">Rule</div>
                        <div className="truncate text-sm text-foreground" title={ruleValue}>
                          {ruleValue}
                        </div>
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="text-sm text-muted-foreground">Status</div>
                        <StatusBadge label={selected.status_label} status={selected.status} />
                      </div>
                    </div>

                    {hasRemediation || showSuggestedFix ? (
                      <div className="-mx-6 divide-y divide-border/50 border-y bg-card">
                        {hasRemediation ? (
                          <div>
                            <button
                              aria-expanded={isRemediationOpen}
                              className={cn(
                                "flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium",
                                isRemediationOpen && "border-b",
                              )}
                              onClick={() => {
                                setIsRemediationOpen(!isRemediationOpen);
                              }}
                              type="button"
                            >
                              <div className="flex items-center gap-2">
                                <ChevronDown
                                  className={cn(
                                    "size-4 text-muted-foreground transition-transform",
                                    !isRemediationOpen && "-rotate-90",
                                  )}
                                />
                                <span>Remediation</span>
                              </div>
                            </button>
                            {isRemediationOpen ? (
                              <div className="px-4 py-3">
                                <ReactMarkdown
                                  components={PlainDescriptionMarkdownComponents}
                                  remarkPlugins={[remarkGfm]}
                                >
                                  {selected.remediation}
                                </ReactMarkdown>
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        {showSuggestedFix ? (
                          <div>
                            <button
                              aria-expanded={isSuggestedFixOpen}
                              className={cn(
                                "flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium",
                                isSuggestedFixOpen && "border-b",
                              )}
                              onClick={() => {
                                setIsSuggestedFixOpen(!isSuggestedFixOpen);
                              }}
                              type="button"
                            >
                              <div className="flex items-center gap-2">
                                <ChevronDown
                                  className={cn(
                                    "size-4 text-muted-foreground transition-transform",
                                    !isSuggestedFixOpen && "-rotate-90",
                                  )}
                                />
                                <span>Suggested Fix</span>
                              </div>
                            </button>
                            {isSuggestedFixOpen ? (
                              <div className="bg-muted/50">
                                <CommandCodeBlock
                                  className="border-0 bg-transparent dark:bg-transparent"
                                  command={generateCSPMFixCommand(selected)}
                                  onCopy={() => toast.success("Copied", { description: "Command copied to clipboard" })}
                                />
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {selected.cvss && selected.cvss > 0 ? (
                      <section className={ISSUE_DRAWER_SECTION_CLASS}>
                        <IssueDrawerSectionHeading>CVSS Score</IssueDrawerSectionHeading>
                        <CVSSGauge score={selected.cvss} />
                      </section>
                    ) : null}

                    {hasFindingDetails ? (
                      <section className={ISSUE_DRAWER_SECTION_CLASS}>
                        <IssueDrawerSectionHeading>Finding Details</IssueDrawerSectionHeading>
                        <div className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                          {selected.contextual_description}
                        </div>
                      </section>
                    ) : null}

                    {selected.type === "container" ? (
                      <ContainerPackageVersionUpgrade
                        fixedVersion={selected.fixed_version}
                        installedVersion={selected.installed_version}
                      />
                    ) : null}
                  </div>
                ) : activeTab === "affected" && affectedResourceCount > 0 && selected.resource_ids ? (
                  <div className={ISSUE_DRAWER_SECTIONS_CLASS}>
                    <section className={ISSUE_DRAWER_SECTION_CLASS}>
                      <IssueDrawerSectionHeading>Affected Resources</IssueDrawerSectionHeading>
                      <IssueDrawerAffectedResourcesTable
                        onCopy={(resource) => {
                          void navigator.clipboard.writeText(resource);
                          toast.success("Copied", { description: "Resource ARN copied to clipboard" });
                        }}
                        resources={selected.resource_ids}
                      />
                    </section>
                  </div>
                ) : null}
              </div>

              <IssueDrawerFooter>
                {selected.resource_id && isAutofixAvailable(unifiedIssueToSecurityIssue(selected)) ? (
                  <IssueAutofixActions
                    issue={unifiedIssueToSecurityIssue(selected)}
                    organizationId={user?.organization?.id}
                    repoId={selected.resource_id}
                  />
                ) : null}
              </IssueDrawerFooter>
            </div>
          );
        })()
      : null;

  return (
    <>
      <DataTable
        actions={
          <DataTableRefreshButton
            className={dataTableToolbarButtonClassName}
            isLoading={isLoading}
            onClick={onRefresh}
          />
        }
        className="h-full min-h-0"
        columns={columns}
        data={issues}
        defaultSort={{ direction: "asc", key: "severity" }}
        emptyMessage="No issues found."
        extraToolbarContent={filtersToolbar}
        getRowKey={(issue) => issue.id}
        isLoading={isLoading}
        keepToolbarWhileLoading
        layout={layout}
        loadingMessage="Loading issues..."
        onRowClick={handleSelectIssue}
        rowClassName={(issue) => (issue.status.toLowerCase() === "ignored" ? "opacity-50" : "")}
        searchKey="name"
        searchPlaceholder="Search Issues"
        toolbarButtonClassName={dataTableToolbarButtonClassName}
        toolbarInputClassName={dataTableToolbarInputClassName}
      />

      <Drawer
        direction="right"
        onOpenChange={(open) => {
          if (!open) handleSelectIssue(null);
        }}
        open={!!selected}
      >
        <DrawerContent
          className={cn(detailDrawerSurfaceClassName, "flex flex-col overflow-hidden p-0 outline-none")}
          side="right"
        >
          {groupIssueDrawerContent}
          {packageGroupDrawerContent}
          {singleIssueDrawerContent}
        </DrawerContent>
      </Drawer>
    </>
  );
}

const issueTypeIconConfig: Record<string, { icon: "docker" | LucideIcon; label: string }> = {
  container: { icon: "docker", label: "Container" },
  cspm: { icon: CloudCog, label: "CSPM" },
  dependencies: { icon: Boxes, label: "Dependencies" },
  iac: { icon: Braces, label: "Infrastructure as Code" },
  sast: { icon: Braces, label: "SAST" },
  sca: { icon: Boxes, label: "Dependencies" },
};

function TypeIcon({ className, type }: { className?: string; type: string }) {
  const normalizedType = type.toLowerCase();
  const config = issueTypeIconConfig[normalizedType] ?? {
    icon: AlertCircle,
    label: type,
  };
  const iconClassName = className ?? "h-[18px] w-[18px] text-muted-foreground/80";

  const icon =
    config.icon === "docker" ? (
      <Docker aria-hidden="true" className="size-[18px]" />
    ) : (
      <config.icon aria-hidden="true" className={iconClassName} strokeWidth={2} />
    );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span aria-label={config.label} className="inline-flex items-center justify-center">
          {icon}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">{config.label}</TooltipContent>
    </Tooltip>
  );
}

function getIssueDescription(issue: UnifiedIssue): string {
  if (isScaIssue(issue)) {
    return scaVulnDescription(issue);
  }
  return issue.description ?? "";
}

function getIssueDisplayProps(issue: UnifiedIssue): { primaryText: string; secondaryText: string } {
  let primaryText = issue.name;
  let secondaryText = issue.title ?? "";

  if (issue.type.toLowerCase() === "dependencies" || issue.source === "Dependencies") {
    primaryText = scaVulnTitle(issue);
    secondaryText = issue.title?.replace(/ \(Fixed:.*\)$/, "") ?? "";
    return { primaryText, secondaryText };
  }

  if (issue.type.toLowerCase() === "cspm") {
    primaryText = issue.title || issue.name;
    secondaryText = issue.resource_name || ""; // Show Connection Name
    return { primaryText, secondaryText };
  }

  if (["iac", "sast"].includes(issue.type.toLowerCase())) {
    if (issue.type.toLowerCase() === "sast") {
      if (issue.description) {
        const match = /^.*?[.?!](?:\s|$)/.exec(issue.description);
        primaryText = match ? match[0].trim() : issue.description;
      } else {
        primaryText = issue.title || issue.name;
      }
    } else {
      if (issue.title && issue.title !== issue.name) {
        primaryText = issue.title;
      } else if (issue.description) {
        const match = /^.*?[.?!](?:\s|$)/.exec(issue.description);
        let fallback = match ? match[0].trim() : issue.description;
        if (fallback.length > 100) fallback = fallback.slice(0, 100) + "...";
        primaryText = fallback;
      } else {
        primaryText = issue.name;
      }
    }

    if (issue.description) {
      const desc = issue.description;
      secondaryText = desc.length > 100 ? desc.slice(0, 100) + "..." : desc;
    } else {
      secondaryText = "";
    }
  }

  return { primaryText, secondaryText };
}

/**
 * Generate an AWS CLI command suggestion based on a CSPM finding.
 * Maps common check names to actionable CLI commands.
 */
function generateCSPMFixCommand(issue: UnifiedIssue): string {
  const title = (issue.title || issue.name || "").toLowerCase();
  const resource = issue.resource_ids?.[0] || "<RESOURCE_ARN>";

  // S3 encryption
  if (title.includes("s3") && title.includes("encrypt")) {
    const bucket = resource.includes(":::") ? resource.split(":::")[1] : "<BUCKET_NAME>";
    return `aws s3api put-bucket-encryption \\
  --bucket ${bucket} \\
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "aws:kms"
      }
    }]
  }'`;
  }

  // S3 public access block
  if (title.includes("s3") && (title.includes("public") || title.includes("acl"))) {
    const bucket = resource.includes(":::") ? resource.split(":::")[1] : "<BUCKET_NAME>";
    return `aws s3api put-public-access-block \\
  --bucket ${bucket} \\
  --public-access-block-configuration \\
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true`;
  }

  // EBS encryption
  if (title.includes("ebs") && title.includes("encrypt")) {
    return `# Enable EBS encryption by default for this region
aws ec2 enable-ebs-encryption-by-default \\
  --region us-east-1`;
  }

  // Security group ingress /0
  if (title.includes("security group") && title.includes("ingress") && title.includes("/0")) {
    const sgId = resource.includes("/") ? resource.split("/").pop() : "<SG_ID>";
    return `# Review and revoke overly permissive ingress rules
aws ec2 describe-security-group-rules \\
  --filters Name=group-id,Values=${String(sgId)} \\
  --query "SecurityGroupRules[?CidrIpv4=='0.0.0.0/0']"

# Then revoke specific rules:
# aws ec2 revoke-security-group-ingress --group-id ${String(sgId)} --protocol tcp --port <PORT> --cidr 0.0.0.0/0`;
  }

  // Security group egress /0
  if (title.includes("security group") && title.includes("egress") && title.includes("/0")) {
    const sgId = resource.includes("/") ? resource.split("/").pop() : "<SG_ID>";
    return `# Review and restrict egress rules
aws ec2 describe-security-group-rules \\
  --filters Name=group-id,Values=${String(sgId)} \\
  --query "SecurityGroupRules[?IsEgress && CidrIpv4=='0.0.0.0/0']"

# Then revoke and add specific rules:
# aws ec2 revoke-security-group-egress --group-id ${String(sgId)} --protocol -1 --cidr 0.0.0.0/0`;
  }

  // Network ACL
  if (title.includes("network acl") || title.includes("nacl")) {
    return `# List Network ACL entries to identify overly permissive rules
aws ec2 describe-network-acls \\
  --query "NetworkAcls[].Entries[?RuleAction=='allow' && CidrBlock=='0.0.0.0/0']" \\
  --output table`;
  }

  // ECR scanning
  if (title.includes("ecr") && title.includes("scan")) {
    const repoName = resource.includes("/") ? resource.split("/").pop() : "<REPO_NAME>";
    return `aws ecr put-image-scanning-configuration \\
  --repository-name ${String(repoName)} \\
  --image-scanning-configuration scanOnPush=true`;
  }

  // ECR immutable tags
  if (title.includes("ecr") && title.includes("mutable")) {
    const repoName = resource.includes("/") ? resource.split("/").pop() : "<REPO_NAME>";
    return `aws ecr put-image-tag-mutability \\
  --repository-name ${String(repoName)} \\
  --image-tag-mutability IMMUTABLE`;
  }

  // IAM wildcard
  if (title.includes("iam") && title.includes("wildcard")) {
    return `# Audit IAM policies for wildcard permissions
aws iam get-account-authorization-details \\
  --filter LocalManagedPolicy \\
  --query "Policies[].PolicyVersionList[?IsDefaultVersion].Document" \\
  --output json | grep -l '"*"'`;
  }

  // Athena encryption
  if (title.includes("athena") && title.includes("encrypt")) {
    return `# Enable encryption for Athena workgroup
aws athena update-work-group \\
  --work-group primary \\
  --configuration-updates \\
    ResultConfigurationUpdates='{"EncryptionConfiguration":{"EncryptionOption":"SSE_S3"}}'`;
  }

  // Generic fallback using remediation text
  return `# ${issue.remediation ?? "Review and remediate this finding"}
# Resource: ${resource}
# Consult AWS documentation for the appropriate fix command.`;
}
