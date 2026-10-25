import type { ColumnDef } from "@/components/ui/data-table";
import type { FeedIssueGroup } from "@/features/feed/hooks/use-issue-grouping";
import type { IssueDrawerTabId } from "@/features/issues/components/issue-drawer-ui";
import type { UnifiedIssue } from "@/services/api/feed";
import type { IgnoredSecurityIssue, SecurityIssue } from "@/services/api/integration";
import type { Note } from "@/services/api/notes";

import {
  Bot,
  Check,
  Copy,
  Eye,
  EyeOff,
  FileText,
  GalleryVerticalEnd,
  ListFilter,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Play,
  Shapes,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { State } from "@/components/state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  DataTable,
  dataTablePrimaryTextClass,
  DataTableRefreshButton,
  dataTableToolbarButtonClassName,
} from "@/components/ui/data-table";
import { detailDrawerSurfaceClassName, Drawer, DrawerContent } from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Filters } from "@/components/ui/filters";
import { Message, MessageAvatar, MessageContent, MessageFooter, MessageHeader } from "@/components/ui/message";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "@/components/ui/toast/toast";
import { ViewOptions } from "@/components/ui/view-options";
import { useAuth } from "@/features/auth";
import { SEVERITY_ORDER, useIssueGrouping } from "@/features/feed/hooks/use-issue-grouping";
import { LinearIssueAction } from "@/features/integrations/components/linear-issue-action";
import { AiFixDialog, AiFixDialogActions } from "@/features/issues/components/ai-fix-suggestion";
import { getIgnoredColumns } from "@/features/issues/components/columns";
import {
  ISSUE_DRAWER_BODY_CLASS,
  IssueDrawerAffectedFilesTable,
  IssueDrawerFooter,
  IssueDrawerHeaderShell,
  IssueDrawerIgnoreButton,
  IssueDrawerSectionHeading,
  IssueDrawerTabs,
  IssueDrawerTitle,
} from "@/features/issues/components/issue-drawer-ui";
import { SecurityIssueDetails } from "@/features/issues/components/security-issue-details";
import { useIssueFilters } from "@/features/issues/hooks/use-issue-filters";
import { useIssueRemediation } from "@/features/issues/hooks/use-issue-remediation";
import { isAutofixAvailable } from "@/features/issues/lib/autofix";
import { unifiedIssueToSecurityIssue } from "@/features/issues/lib/security-issue";
import { fingerprintToUUID } from "@/lib/entity-id";
import { formatManifestPath, isPackageIssueGroup, isScaIssue, packageGroupImpactText } from "@/lib/sca-display";
import { cn, getIdenticonUrl } from "@/lib/utils";
import { notesService } from "@/services/api/notes";

import { ISSUES_TABLE_LAYOUT } from "../lib/issues-table-layout";

type TableItem = FeedIssueGroup | UnifiedIssue;

const issuesColumnLayout = Object.fromEntries(ISSUES_TABLE_LAYOUT.map((column) => [column.id, column]));

const ISSUE_DRAWER_TEXT_SECTION_SPACING = "space-y-3";

const groupOverviewMarkdownComponents = {
  li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">{children}</ol>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-3 text-sm leading-relaxed text-muted-foreground last:mb-0">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <span className="font-normal text-inherit">{children}</span>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">{children}</ul>
  ),
};

interface IssuesTableProps {
  className?: string;
  ignoredIssues: IgnoredSecurityIssue[];
  isLoading?: boolean;
  isScanning: boolean;
  issues: SecurityIssue[];
  onRefresh: () => void;
  onScan: () => void;
  onUpdateStatus: (issue: UnifiedIssue, newStatus: "active" | "ignored") => void;
  organizationId?: string;
  repoAvatarUrl?: string;
  repoId?: string;
  repoName?: string;
  repoUrl?: string;
}

export function IssuesTable({
  className,
  ignoredIssues,
  isLoading = false,
  isScanning,
  issues,
  onRefresh,
  onScan,
  onUpdateStatus,
  organizationId,
  repoAvatarUrl,
  repoId,
  repoName,
  repoUrl,
}: IssuesTableProps) {
  const { fields, filteredIssues, filters, setFilters, view } = useIssueFilters(issues);

  const [selectedGroup, setSelectedGroup] = useState<FeedIssueGroup | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<null | UnifiedIssue>(null);
  const [groupDrawerTab, setGroupDrawerTab] = useState<IssueDrawerTabId>("overview");
  const [showGrouped, setShowGrouped] = useState(true);

  const openGroup = (group: FeedIssueGroup | null) => {
    setGroupDrawerTab("overview");
    setSelectedGroup(group);
  };

  // Map filtered SecurityIssue to UnifiedIssue for the grouping hook with deduplication
  const unifiedIssues: UnifiedIssue[] = useMemo(() => {
    const seen = new Set<string>();
    const result: UnifiedIssue[] = [];

    filteredIssues.forEach((iss) => {
      const fingerprint = `${iss.issue_type ?? "iac"}-${iss.rule}-${iss.file}-${String(iss.line ?? 0)}-${iss.message}`;
      const id = iss.id ?? fingerprintToUUID(fingerprint);
      if (seen.has(id)) return;
      seen.add(id);

      result.push({
        created_at: new Date().toISOString(),
        description: iss.description,
        fixed_version: iss.metadata?.fixed_version as string | undefined,
        id,
        installed_version: iss.metadata?.installed_version as string | undefined,
        location: iss.file + (iss.line ? `:${String(iss.line)}` : ""),
        name: iss.rule,
        original_issue: iss,
        pkg_name:
          (iss.metadata?.pkg_name as string) || (iss.tool === "trivy-sca" ? iss.message.split(" ")[0] : undefined),
        remediation: iss.remediation,
        resource_id: repoId,
        resource_name: "",
        scan_id: "",
        scanner_title: iss.tool ?? "Scanner",
        severity: iss.severity,
        source:
          iss.issue_type === "dependencies" || iss.issue_type === "sca" || iss.tool === "trivy-sca"
            ? "Dependencies"
            : iss.issue_type === "sast"
              ? "SAST"
              : iss.issue_type === "cspm"
                ? "CSPM"
                : "IaC",
        status: iss.status,
        status_label: iss.status,
        title: iss.message,
        type: iss.issue_type ?? "iac",
        updated_at: new Date().toISOString(),
        vuln_title: iss.metadata?.vuln_title as string | undefined,
      });
    });
    return result;
  }, [filteredIssues, repoId]);

  const { groupedIssues: displayedIssues } = useIssueGrouping(unifiedIssues, showGrouped);

  const columns = useMemo(
    () => [
      {
        cell: (item: TableItem) => {
          if ("issue_count" in item) {
            if (item.pkg_name) {
              return (
                <div className="min-w-0">
                  <div className="truncate text-[14px] leading-5 font-normal text-foreground" title={item.pkg_name}>
                    {item.pkg_name}
                  </div>
                  <div
                    className="mt-0.5 max-w-[500px] truncate text-[13px] leading-5 font-normal text-foreground/80"
                    title={`Version: ${item.installed_version ?? ""}`}
                  >
                    Version: {item.installed_version}
                  </div>
                </div>
              );
            }

            return (
              <div className="min-w-0">
                <div className="truncate text-[14px] leading-5 font-normal text-foreground" title={item.name}>
                  {item.name}
                </div>
                <div
                  className="mt-0.5 max-w-[500px] truncate text-[13px] leading-5 font-normal text-foreground/80"
                  title={item.subtitle}
                >
                  {item.subtitle}
                </div>
              </div>
            );
          }
          return (
            <div className="min-w-0">
              <div className="truncate text-[14px] leading-5 font-normal text-foreground" title={item.title}>
                {item.title}
              </div>
            </div>
          );
        },
        header: "Name",
        id: "name",
        skeletonVariant: issuesColumnLayout.name.skeletonVariant,
        sortable: true,
      },
      {
        cell: (item: TableItem) => {
          if ("issue_count" in item) {
            return (
              <div className="text-[13px] leading-5 font-normal text-foreground/80">{item.issue_count} issues</div>
            );
          }

          if (isScaIssue(item)) {
            return (
              <div
                className="truncate text-[13px] leading-5 font-normal text-foreground/80"
                title={item.pkg_name ?? item.location}
              >
                Issues in {item.pkg_name ?? formatManifestPath(item.location)}
              </div>
            );
          }

          return (
            <div className="truncate text-[13px] leading-5 font-normal text-foreground/80" title={item.location}>
              {item.location}
            </div>
          );
        },
        header: "Count",
        id: "count",
        width: "25%",
      },
      {
        cell: (item: TableItem) => {
          const severity = "highest_severity" in item ? item.highest_severity : item.severity;
          return <SeverityBadge severity={severity} />;
        },
        header: "Severity",
        id: "severity",
        skeletonVariant: issuesColumnLayout.severity.skeletonVariant,
        sortable: true,
        sortValue: (item: TableItem) => {
          const sev = "highest_severity" in item ? item.highest_severity : item.severity;
          return SEVERITY_ORDER[sev.toUpperCase()] ?? 4;
        },
        width: "25%",
      },
      {
        align: issuesColumnLayout.actions.align,
        cell: (item: TableItem) => {
          return (
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
                {"issue_count" in item ? (
                  <>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedGroup(item);
                      }}
                    >
                      <FileText className="mr-2 size-4" />
                      View Details ({item.issue_count})
                    </DropdownMenuItem>
                    <LinearIssueAction
                      description={item.issues[0]?.description}
                      findingId={item.id}
                      severity={item.highest_severity}
                      source={item.issues[0]?.type}
                      title={item.name}
                      url={repoId ? `/assets/repositories/${repoId}` : undefined}
                    />
                  </>
                ) : (
                  <>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedIssue(item);
                      }}
                    >
                      <FileText className="mr-2 size-4" />
                      View Details
                    </DropdownMenuItem>
                    <LinearIssueAction
                      description={item.description}
                      findingId={item.id}
                      severity={item.severity}
                      source={item.type}
                      title={item.title ?? item.name}
                      url={repoId ? `/assets/repositories/${repoId}` : undefined}
                    />
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        header: "Actions",
        id: "actions",
        skeletonVariant: issuesColumnLayout.actions.skeletonVariant,
        width: issuesColumnLayout.actions.width,
      },
    ],
    [repoId],
  );

  const ignoredColumns = useMemo(() => {
    const handleUnignoreWrapper = (issue: IgnoredSecurityIssue) => {
      onUpdateStatus(
        {
          created_at: issue.ignored_at,
          id: issue.id,
          location: issue.file_path,
          name: issue.rule_id,
          scanner_title: "",
          severity: "low",
          source: "IaC",
          status: "active",
          status_label: "Active",
          type: "iac",
          updated_at: issue.ignored_at,
        } as UnifiedIssue,
        "active",
      );
    };
    return getIgnoredColumns({ onUnignore: handleUnignoreWrapper });
  }, [onUpdateStatus]);

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
        cell: (issue) => (
          <div className="flex flex-col gap-1 pl-2">
            <span className={dataTablePrimaryTextClass} title={issue.name}>
              {issue.name}
            </span>
          </div>
        ),
        header: "Issue",
        id: "issue",
      },
      {
        cell: (issue) => <StatusBadge status={issue.status} />,
        header: "Status",
        id: "status",
        width: "100px",
      },
      {
        align: "right",
        cell: (issue) => (
          <div
            className="flex justify-center"
            onClick={(e) => {
              e.stopPropagation();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
              }
            }}
            role="button"
            tabIndex={-1}
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
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedIssue(issue);
                  }}
                >
                  <FileText className="mr-2 size-4" />
                  View Details
                </DropdownMenuItem>
                <LinearIssueAction
                  description={issue.description}
                  findingId={issue.id}
                  severity={issue.severity}
                  source={issue.type}
                  title={issue.title ?? issue.name}
                  url={repoId ? `/assets/repositories/${repoId}` : undefined}
                />
                {issue.status === "ignored" || issue.status === "auto_ignored" ? (
                  <DropdownMenuItem
                    onClick={() => {
                      onUpdateStatus(issue, "active");
                    }}
                  >
                    <Eye className="mr-2 size-4" />
                    Restore
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => {
                      onUpdateStatus(issue, "ignored");
                    }}
                  >
                    <EyeOff className="mr-2 size-4" />
                    Ignore
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
        header: "",
        id: "actions",
        width: "80px",
      },
    ],
    [onUpdateStatus, repoId],
  );

  const filtersToolbar = (
    <div className="flex flex-wrap items-center gap-2.5">
      <Filters
        fields={fields}
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
          aria-checked={showGrouped}
          className="flex cursor-pointer items-center justify-between rounded-sm px-2 py-1.5 hover:bg-accent"
          onClick={() => {
            setShowGrouped(!showGrouped);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              setShowGrouped(!showGrouped);
            }
          }}
          role="switch"
          tabIndex={0}
        >
          <div className="flex items-center gap-2">
            <Shapes className="size-4 text-muted-foreground" />
            <span className="text-sm">Group Issues</span>
          </div>
          <div
            className={cn("relative h-4 w-8 rounded-full transition-colors", showGrouped ? "bg-primary" : "bg-muted")}
          >
            <div
              className={cn(
                "absolute top-0.5 size-3 rounded-full bg-white transition-all dark:bg-foreground",
                showGrouped ? "right-0.5" : "left-0.5",
              )}
            />
          </div>
        </div>
      </ViewOptions>
    </div>
  );

  const actionsSlot = (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="h-9 gap-2" size="sm" variant="outline">
            Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled={isScanning} onClick={onScan}>
            {isScanning ? <Spinner className="mr-2 size-4" /> : <Play className="mr-2 size-4" />}
            Run Scan
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DataTableRefreshButton isLoading={isLoading} onClick={onRefresh} />
    </>
  );

  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}>
      {view === "active" || view === "solved" || view === "all" || isLoading || filteredIssues.length > 0 ? (
        <DataTable
          actions={actionsSlot}
          className="h-full min-h-0"
          columns={columns}
          data={displayedIssues as never}
          defaultSort={{ direction: "asc", key: "severity" }}
          extraToolbarContent={filtersToolbar}
          getRowKey={(issue: TableItem) => issue.id}
          isLoading={isLoading}
          keepToolbarWhileLoading
          loadingMessage="Loading repository issues"
          onRowClick={(row: TableItem) => {
            if ("issue_count" in row) {
              openGroup(row);
            } else {
              setSelectedIssue(row);
            }
          }}
          searchKey="name"
          searchPlaceholder="Search Issues"
          tableClassName="table-fixed w-full"
        />
      ) : (
        <DataTable<IgnoredSecurityIssue>
          actions={actionsSlot}
          className="h-full min-h-0"
          columns={ignoredColumns}
          data={ignoredIssues}
          defaultSort={{ direction: "desc", key: "ignored_at" }}
          extraToolbarContent={filtersToolbar}
          getRowKey={(issue) => issue.id}
          searchKey="rule_id"
          searchPlaceholder="Search Ignored Rules"
          tableClassName="table-fixed w-full"
        />
      )}

      {view === "active" || view === "solved" || view === "all" || isLoading || filteredIssues.length > 0 ? (
        <Drawer
          direction="right"
          onOpenChange={(open) => {
            if (!open) {
              openGroup(null);
              setSelectedIssue(null);
            }
          }}
          open={!!selectedGroup || !!selectedIssue}
        >
          <DrawerContent
            className={cn(detailDrawerSurfaceClassName, "flex flex-col overflow-hidden p-0 outline-none")}
            side="right"
          >
            {selectedIssue ? (
              <SecurityIssueDetails
                affectedResources={selectedIssue.resource_ids}
                entityId={selectedIssue.id}
                issue={unifiedIssueToSecurityIssue(selectedIssue)}
                onBack={() => {
                  setSelectedIssue(null);
                }}
                onClose={() => {
                  setSelectedIssue(null);
                }}
                onIgnore={async () => {
                  const targetStatus =
                    selectedIssue.status === "ignored" || selectedIssue.status === "auto_ignored"
                      ? "active"
                      : "ignored";
                  onUpdateStatus(selectedIssue, targetStatus);
                  setSelectedIssue(null);
                  onRefresh();
                }}
                organizationId={organizationId}
                renderContentOnly
                repoAvatarUrl={repoAvatarUrl}
                repoId={repoId}
                repoName={repoName}
                repoUrl={repoUrl}
              />
            ) : (
              selectedGroup && (
                <GroupDrawerContent
                  groupDrawerTab={groupDrawerTab}
                  onRefresh={onRefresh}
                  onUpdateStatus={onUpdateStatus}
                  openGroup={openGroup}
                  organizationId={organizationId}
                  repoAvatarUrl={repoAvatarUrl}
                  repoId={repoId}
                  repoName={repoName}
                  repoUrl={repoUrl}
                  selectedGroup={selectedGroup}
                  setGroupDrawerTab={setGroupDrawerTab}
                  setSelectedIssue={setSelectedIssue}
                  subissueColumns={subissueColumns}
                />
              )
            )}
          </DrawerContent>
        </Drawer>
      ) : null}
    </div>
  );
}

function GroupDrawerContent({
  groupDrawerTab,
  onRefresh,
  onUpdateStatus,
  openGroup,
  organizationId,
  repoAvatarUrl,
  repoId,
  repoName,
  repoUrl,
  selectedGroup,
  setGroupDrawerTab,
  setSelectedIssue,
  subissueColumns,
}: {
  groupDrawerTab: IssueDrawerTabId;
  onRefresh: () => void;
  onUpdateStatus: (issue: UnifiedIssue, newStatus: "active" | "ignored") => void;
  openGroup: (group: FeedIssueGroup | null) => void;
  organizationId?: string;
  repoAvatarUrl?: string;
  repoId?: string;
  repoName?: string;
  repoUrl?: string;
  selectedGroup: FeedIssueGroup;
  setGroupDrawerTab: (tab: IssueDrawerTabId) => void;
  setSelectedIssue: (issue: null | UnifiedIssue) => void;
  subissueColumns: ColumnDef<UnifiedIssue>[];
}) {
  const leadIssue = selectedGroup.issues[0];
  const allIgnored = selectedGroup.issues.every(
    (issue) => issue.status === "ignored" || issue.status === "auto_ignored",
  );
  const groupIsIgnored = allIgnored;
  const isPackageGroup = isPackageIssueGroup(selectedGroup);
  const packageImpactText = packageGroupImpactText(selectedGroup.issues);
  const affectedFiles = [...new Set(selectedGroup.issues.map((issue) => issue.location).filter(Boolean))];

  const groupNotesInputRef = useRef<HTMLTextAreaElement>(null);
  const groupNotesBottomRef = useRef<HTMLDivElement>(null);
  const { user: groupUser } = useAuth();
  const groupOrgId = groupUser?.organization?.id ?? organizationId;
  const groupEntityId = leadIssue?.id;

  const [groupNotes, setGroupNotes] = useState<Note[]>([]);
  const [newGroupNoteBody, setNewGroupNoteBody] = useState("");
  const [editingGroupNoteId, setEditingGroupNoteId] = useState<null | string>(null);
  const [editingGroupNoteBody, setEditingGroupNoteBody] = useState("");
  const [isSubmittingGroupNote, setIsSubmittingGroupNote] = useState(false);
  const [recentlyCopiedGroupNoteId, setRecentlyCopiedGroupNoteId] = useState<null | string>(null);
  const [showGroupConversationHeader, setShowGroupConversationHeader] = useState(true);

  const loadGroupNotes = useCallback(async () => {
    if (!groupOrgId || !groupEntityId) return;
    try {
      const data = await notesService.getNotes(groupOrgId, "security_issue", groupEntityId);
      setGroupNotes(data);
    } catch {
      // silently fail
    }
  }, [groupOrgId, groupEntityId]);

  useEffect(() => {
    void loadGroupNotes();
  }, [loadGroupNotes]);

  useEffect(() => {
    if (groupDrawerTab === "notes" && groupNotes.length > 0) {
      groupNotesBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [groupNotes, groupDrawerTab]);

  const handleSubmitGroupNote = async () => {
    if (!groupOrgId || !groupEntityId || !newGroupNoteBody.trim()) {
      toast.error("Cannot save note");
      return;
    }
    setIsSubmittingGroupNote(true);
    try {
      await notesService.createNote(groupOrgId, "security_issue", groupEntityId, newGroupNoteBody.trim());
      setNewGroupNoteBody("");
      await loadGroupNotes();
      toast.success("Comment added", { description: "Your comment has been posted" });
    } catch {
      toast.error("Failed to save note");
    } finally {
      setIsSubmittingGroupNote(false);
    }
  };

  const handleUpdateGroupNote = async (noteId: string) => {
    if (!groupOrgId || !editingGroupNoteBody.trim()) return;
    setIsSubmittingGroupNote(true);
    try {
      await notesService.updateNote(groupOrgId, noteId, editingGroupNoteBody.trim());
      setEditingGroupNoteId(null);
      setEditingGroupNoteBody("");
      await loadGroupNotes();
    } catch {
      toast.error("Failed to update note");
    } finally {
      setIsSubmittingGroupNote(false);
    }
  };

  const handleDeleteGroupNote = async (noteId: string) => {
    if (!groupOrgId) return;
    try {
      await notesService.deleteNote(groupOrgId, noteId);
      await loadGroupNotes();
      toast.success("Comment removed", { description: "The comment has been deleted" });
    } catch {
      toast.error("Failed to delete note");
    }
  };

  const groupTabs: {
    count?: number;
    icon: typeof Shapes;
    id: IssueDrawerTabId;
    label: string;
  }[] = [{ icon: Shapes, id: "overview", label: "Overview" }];

  if (isPackageGroup && selectedGroup.issue_count > 0) {
    groupTabs.push({
      count: selectedGroup.issue_count,
      icon: GalleryVerticalEnd,
      id: "affected",
      label: "Subissues",
    });
  } else if (affectedFiles.length > 0) {
    groupTabs.push({
      count: affectedFiles.length,
      icon: GalleryVerticalEnd,
      id: "affected",
      label: "Affected",
    });
  }

  const remediationIssue = unifiedIssueToSecurityIssue(leadIssue);
  const showGroupAutofix = isAutofixAvailable(remediationIssue);

  const {
    clearFix: clearGroupFix,
    error: groupFixError,
    fixResult: groupFixResult,
    handleAnalyzeIssue: handleGroupAnalyzeIssue,
    handleCreatePR: handleGroupCreatePR,
    isAnalyzing: isGroupAnalyzing,
    isCreatingPR: isGroupCreatingPR,
    prUrl: groupPrUrl,
  } = useIssueRemediation(showGroupAutofix ? remediationIssue : null, organizationId, repoId);

  if (showGroupAutofix) {
    groupTabs.push({ icon: Bot, id: "autofix", label: "Autofix" });
  }

  groupTabs.push({ icon: MessageSquare, id: "notes", label: "Comments" });

  const activeTab = groupTabs.some((tab) => tab.id === groupDrawerTab) ? groupDrawerTab : "overview";

  const groupTitle = isPackageGroup ? (selectedGroup.pkg_name ?? selectedGroup.name) : selectedGroup.name;
  const groupSource = selectedGroup.source;
  const groupSourceLabel =
    groupSource === "IaC" ? "Infrastructure as Code" : groupSource === "SAST" ? "SAST" : (groupSource ?? "");

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <IssueDrawerHeaderShell>
        <div className="min-w-0 flex-1">
          <IssueDrawerTitle>{groupTitle}</IssueDrawerTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {groupSource ? <span>{groupSourceLabel}</span> : null}
            {!isPackageGroup && groupSource !== "SAST" && groupSource !== "IaC" ? (
              <span className="truncate">
                {`${String(selectedGroup.issue_count)} occurrences ${String(selectedGroup.subtitle)}`}
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <IssueDrawerIgnoreButton
            ignoreLabel="Ignore Group"
            isIgnored={groupIsIgnored}
            onClick={() => {
              const targetStatus = groupIsIgnored ? "active" : "ignored";
              const toastId = toast.info(
                `${targetStatus === "ignored" ? "Ignoring" : "Restoring"} ${String(selectedGroup.issues.length)} issues...`,
              );
              try {
                selectedGroup.issues.forEach((issue) => {
                  onUpdateStatus(issue, targetStatus);
                });
                toast.dismiss(toastId);
                toast.success(`Group ${targetStatus === "ignored" ? "ignored" : "restored"} successfully`);
                openGroup(null);
                onRefresh();
              } catch {
                toast.dismiss(toastId);
                toast.error("Failed to update some issues in the group");
              }
            }}
            restoreLabel="Restore Group"
          />
          <Button
            className="gap-1.5"
            onClick={() => {
              setGroupDrawerTab("notes");
              setTimeout(() => groupNotesInputRef.current?.focus(), 100);
            }}
            size="sm"
            variant="outline"
          >
            <MessageSquare className="size-4" />
            Comment
          </Button>
          <Button className="gap-1.5" onClick={() => toast.info("Share coming soon")} size="sm" variant="outline">
            <Share2 className="size-4" />
          </Button>
        </div>
      </IssueDrawerHeaderShell>

      <IssueDrawerTabs activeTab={activeTab} className="mt-3" onTabChange={setGroupDrawerTab} tabs={groupTabs} />

      {activeTab === "notes" &&
      new Map(groupNotes.filter((n) => n.author).map((n) => [n.author!.id, n.author!])).size >= 2 &&
      showGroupConversationHeader ? (
        <div className="flex shrink-0 items-center justify-between border-b bg-blue-500/10 px-6 py-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">In this conversation</span>
            <div className="flex -space-x-1.5">
              {[...new Map(groupNotes.filter((n) => n.author).map((n) => [n.author!.id, n.author!])).values()].map(
                (author) => {
                  const src = author.avatar || getIdenticonUrl(author.id);
                  return (
                    <Avatar className="size-5 border-2 border-blue-500/10" key={author.id}>
                      {src ? <AvatarImage src={src} /> : null}
                      <AvatarFallback className="text-[8px]">
                        {author.first_name.charAt(0)}
                        {author.last_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  );
                },
              )}
            </div>
          </div>
          <button
            className="text-muted-foreground hover:text-foreground"
            onClick={() => {
              setShowGroupConversationHeader(false);
            }}
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}

      <div className={ISSUE_DRAWER_BODY_CLASS}>
        {activeTab === "overview" && isPackageGroup ? (
          <div className={ISSUE_DRAWER_TEXT_SECTION_SPACING}>
            {selectedGroup.issue_count === 1 && leadIssue.description ? (
              <div className="text-sm leading-relaxed text-muted-foreground">
                <ReactMarkdown components={groupOverviewMarkdownComponents} remarkPlugins={[remarkGfm]}>
                  {leadIssue.description}
                </ReactMarkdown>
              </div>
            ) : selectedGroup.issue_count > 1 ? (
              <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
                <p>
                  Review the Subissues tab to learn more about each vulnerability affecting{" "}
                  <span className="font-medium text-foreground">{selectedGroup.pkg_name ?? selectedGroup.name}</span>.
                </p>
                <p>{packageImpactText}</p>
              </div>
            ) : null}

            <hr className="border-border/60" />

            <div className="grid grid-cols-3 gap-4">
              <div className="min-w-0 space-y-1">
                <div className="text-sm text-muted-foreground">Severity</div>
                <SeverityBadge severity={selectedGroup.highest_severity} />
              </div>
              {repoName ? (
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Repository</div>
                  <div className="flex items-center gap-1.5 text-sm text-foreground">
                    {repoAvatarUrl ? (
                      <Avatar className="size-5 shrink-0">
                        <AvatarImage src={repoAvatarUrl} />
                        <AvatarFallback className="text-[8px]">{repoName.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    ) : null}
                    <a
                      className="min-w-0 truncate text-foreground underline-offset-2 hover:underline"
                      href={repoUrl ?? `/assets/repositories/${repoId}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {repoName}
                    </a>
                  </div>
                </div>
              ) : null}
              {leadIssue.created_at ? (
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Date found</div>
                  <div className="min-w-0 truncate text-sm text-foreground">
                    {new Date(leadIssue.created_at).toLocaleDateString()}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4">
              {leadIssue.location ? (
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Location</div>
                  <button
                    className="block w-full min-w-0 truncate text-left text-sm text-foreground underline-offset-2 hover:underline"
                    onClick={() => {
                      void navigator.clipboard.writeText(leadIssue.location);
                      toast.success("Copied", { description: "Location copied to clipboard" });
                    }}
                    type="button"
                  >
                    {leadIssue.location}
                  </button>
                </div>
              ) : null}
              {leadIssue.name ? (
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Rule</div>
                  <div className="min-w-0 truncate text-sm text-foreground">{leadIssue.name}</div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {activeTab === "overview" && !isPackageGroup ? (
          <div className={ISSUE_DRAWER_TEXT_SECTION_SPACING}>
            {leadIssue.description ? (
              <div className="text-sm leading-relaxed text-muted-foreground">
                <ReactMarkdown components={groupOverviewMarkdownComponents} remarkPlugins={[remarkGfm]}>
                  {leadIssue.description}
                </ReactMarkdown>
              </div>
            ) : null}

            <hr className="border-border/60" />

            <div className="grid grid-cols-3 gap-4">
              <div className="min-w-0 space-y-1">
                <div className="text-sm text-muted-foreground">Severity</div>
                <SeverityBadge severity={selectedGroup.highest_severity} />
              </div>
              {repoName ? (
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Repository</div>
                  <div className="flex items-center gap-1.5 text-sm text-foreground">
                    {repoAvatarUrl ? (
                      <Avatar className="size-5 shrink-0">
                        <AvatarImage src={repoAvatarUrl} />
                        <AvatarFallback className="text-[8px]">{repoName.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    ) : null}
                    <a
                      className="min-w-0 truncate text-foreground underline-offset-2 hover:underline"
                      href={repoUrl ?? `/assets/repositories/${repoId}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {repoName}
                    </a>
                  </div>
                </div>
              ) : null}
              {leadIssue.created_at ? (
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Date found</div>
                  <div className="min-w-0 truncate text-sm text-foreground">
                    {new Date(leadIssue.created_at).toLocaleDateString()}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4">
              {leadIssue.location ? (
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Location</div>
                  <button
                    className="block w-full min-w-0 truncate text-left text-sm text-foreground underline-offset-2 hover:underline"
                    onClick={() => {
                      void navigator.clipboard.writeText(leadIssue.location);
                      toast.success("Copied", { description: "Location copied to clipboard" });
                    }}
                    type="button"
                  >
                    {leadIssue.location}
                  </button>
                </div>
              ) : null}
              {leadIssue.name ? (
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Rule</div>
                  <div className="min-w-0 truncate text-sm text-foreground">{leadIssue.name}</div>
                </div>
              ) : null}
            </div>

            {leadIssue.remediation && groupSource !== "IaC" ? (
              <>
                <IssueDrawerSectionHeading>Remediation</IssueDrawerSectionHeading>
                <div>
                  <ReactMarkdown components={groupOverviewMarkdownComponents} remarkPlugins={[remarkGfm]}>
                    {leadIssue.remediation}
                  </ReactMarkdown>
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        {activeTab === "autofix" && showGroupAutofix ? (
          groupFixResult ? (
            <AiFixDialog
              actionsInFooter
              error={groupFixError}
              filePath={remediationIssue.file}
              fixResult={groupFixResult}
              inline
              isCreatingPR={isGroupCreatingPR}
              issueTitle={remediationIssue.message}
              onCreatePR={() => void handleGroupCreatePR()}
              onDiscard={clearGroupFix}
              onOpenChange={() => {}}
              open={false}
              prUrl={groupPrUrl}
              startLine={remediationIssue.line}
              vulnerableCode={remediationIssue.suggestion ?? undefined}
            />
          ) : groupFixError ? (
            <div className={ISSUE_DRAWER_TEXT_SECTION_SPACING}>
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                <p className="text-sm text-red-700 dark:text-red-300">{groupFixError}</p>
              </div>
              <Button onClick={() => void handleGroupAnalyzeIssue()} size="sm" variant="outline">
                Retry
              </Button>
            </div>
          ) : (
            <State.Empty
              action={
                <Button
                  className="h-8 gap-2 shadow-sm"
                  disabled={isGroupAnalyzing}
                  onClick={() => void handleGroupAnalyzeIssue()}
                  size="sm"
                >
                  {isGroupAnalyzing ? (
                    <>
                      <Spinner className="size-3.5" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Bot className="size-3.5" />
                      Generate Fix
                    </>
                  )}
                </Button>
              }
              description="Use AI to analyze this vulnerability and generate a fix suggestion. The fix can be reviewed and applied as a pull request."
              fillPage={false}
              icon={Bot}
              title="AI-Generated Fix"
            />
          )
        ) : null}

        {activeTab === "notes" ? (
          <div className="flex h-full min-h-0 flex-col">
            {groupNotes.length === 0 ? (
              <div className="flex min-h-0 flex-1 items-center justify-center">
                <div className="flex flex-col items-center">
                  <MessageSquare className="mb-3 size-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No comments yet</p>
                </div>
              </div>
            ) : (
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
                {groupNotes.map((note) => {
                  const isOwn = note.author?.id === groupUser?.id;
                  const avatarSrc = note.author?.avatar || (note.author ? getIdenticonUrl(note.author.id) : undefined);
                  return (
                    <Message align={isOwn ? "end" : "start"} className="group" key={note.id}>
                      <MessageAvatar>
                        <Avatar className="size-8">
                          {avatarSrc ? <AvatarImage src={avatarSrc} /> : null}
                          <AvatarFallback className="text-xs">
                            {note.author
                              ? `${note.author.first_name.charAt(0)}${note.author.last_name.charAt(0)}`
                              : "?"}
                          </AvatarFallback>
                        </Avatar>
                      </MessageAvatar>
                      <MessageContent>
                        {editingGroupNoteId === note.id ? (
                          <div className="flex flex-col gap-2">
                            <textarea
                              className="min-h-[60px] w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                              onChange={(e) => {
                                setEditingGroupNoteBody(e.target.value);
                              }}
                              value={editingGroupNoteBody}
                            />
                            <div className="flex justify-end gap-1">
                              <Button
                                onClick={() => {
                                  setEditingGroupNoteId(null);
                                }}
                                size="sm"
                                variant="ghost"
                              >
                                Cancel
                              </Button>
                              <Button
                                disabled={isSubmittingGroupNote || !editingGroupNoteBody.trim()}
                                onClick={() => {
                                  void handleUpdateGroupNote(note.id);
                                }}
                                size="sm"
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <MessageHeader className="text-xs font-medium">
                              {note.author ? `${note.author.first_name} ${note.author.last_name}`.trim() : "Unknown"}
                            </MessageHeader>
                            <Bubble className={isOwn ? "bg-primary text-primary-foreground" : ""}>
                              <BubbleContent>{note.body}</BubbleContent>
                            </Bubble>
                            <MessageFooter>
                              {isOwn || groupUser?.role === "owner" ? (
                                <>
                                  <div className="flex translate-y-1 items-center gap-1 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
                                    <Button
                                      aria-label="Copy note"
                                      className="size-6"
                                      onClick={() => {
                                        void navigator.clipboard.writeText(note.body);
                                        setRecentlyCopiedGroupNoteId(note.id);
                                        toast.success("Copied", { description: "Note copied to clipboard" });
                                        setTimeout(() => {
                                          setRecentlyCopiedGroupNoteId(null);
                                        }, 2000);
                                      }}
                                      size="icon"
                                      variant="ghost"
                                    >
                                      {recentlyCopiedGroupNoteId === note.id ? (
                                        <Check className="size-3" />
                                      ) : (
                                        <Copy className="size-3" />
                                      )}
                                    </Button>
                                    <Button
                                      aria-label="Edit note"
                                      className="size-6"
                                      onClick={() => {
                                        setEditingGroupNoteId(note.id);
                                        setEditingGroupNoteBody(note.body);
                                      }}
                                      size="icon"
                                      variant="ghost"
                                    >
                                      <Pencil className="size-3" />
                                    </Button>
                                    <Button
                                      aria-label="Delete note"
                                      className="size-6 text-muted-foreground hover:text-destructive"
                                      onClick={() => {
                                        void handleDeleteGroupNote(note.id);
                                      }}
                                      size="icon"
                                      variant="ghost"
                                    >
                                      <Trash2 className="size-3" />
                                    </Button>
                                  </div>
                                  <span className="ml-auto">
                                    {new Date(note.created_at).toLocaleDateString(undefined, {
                                      day: "numeric",
                                      hour: "numeric",
                                      minute: "2-digit",
                                      month: "short",
                                    })}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span>
                                    {new Date(note.created_at).toLocaleDateString(undefined, {
                                      day: "numeric",
                                      hour: "numeric",
                                      minute: "2-digit",
                                      month: "short",
                                    })}
                                  </span>
                                  <div className="ml-auto translate-y-1 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
                                    <Button
                                      aria-label="Copy note"
                                      className="size-6"
                                      onClick={() => {
                                        void navigator.clipboard.writeText(note.body);
                                        setRecentlyCopiedGroupNoteId(note.id);
                                        toast.success("Copied", { description: "Note copied to clipboard" });
                                        setTimeout(() => {
                                          setRecentlyCopiedGroupNoteId(null);
                                        }, 2000);
                                      }}
                                      size="icon"
                                      variant="ghost"
                                    >
                                      {recentlyCopiedGroupNoteId === note.id ? (
                                        <Check className="size-3" />
                                      ) : (
                                        <Copy className="size-3" />
                                      )}
                                    </Button>
                                  </div>
                                </>
                              )}
                            </MessageFooter>
                          </>
                        )}
                      </MessageContent>
                    </Message>
                  );
                })}
                <div ref={groupNotesBottomRef} />
              </div>
            )}
            <div className="shrink-0 px-4 py-3">
              <div className="relative">
                <textarea
                  className="h-[72px] w-full resize-none overflow-y-auto rounded-md border bg-background px-3 py-2.5 pr-[88px] text-sm transition-shadow outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[2px] focus-visible:ring-ring/20"
                  onChange={(e) => {
                    setNewGroupNoteBody(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSubmitGroupNote();
                    }
                  }}
                  placeholder="Write a comment..."
                  ref={groupNotesInputRef}
                  value={newGroupNoteBody}
                />
                <Button
                  className="absolute right-1.5 bottom-1.5 h-8 gap-1 rounded-md border bg-muted/50 px-2 text-xs font-medium text-muted-foreground shadow-sm hover:bg-accent hover:text-accent-foreground"
                  disabled={isSubmittingGroupNote || !newGroupNoteBody.trim()}
                  onClick={() => {
                    void handleSubmitGroupNote();
                  }}
                  type="button"
                >
                  Send
                  <kbd className="flex items-center rounded bg-muted/70 px-1 py-0.5 text-[10px] text-muted-foreground">
                    ⏎
                  </kbd>
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "affected" && isPackageGroup ? (
          <div className="overflow-hidden">
            <DataTable
              className="border-0 shadow-none"
              columns={subissueColumns}
              data={selectedGroup.issues}
              defaultPageSize={50}
              defaultSort={{ direction: "asc", key: "severity" }}
              getRowKey={(v) => v.id}
              layout="content"
              onRowClick={(issue) => {
                setSelectedIssue(issue);
              }}
              searchKey="name"
              searchPlaceholder="Search Subissues"
            />
          </div>
        ) : null}

        {activeTab === "affected" && !isPackageGroup && affectedFiles.length > 0 ? (
          <IssueDrawerAffectedFilesTable
            files={affectedFiles}
            onCopy={(file) => {
              void navigator.clipboard.writeText(file);
              toast.success("Copied", { description: "File path copied to clipboard" });
            }}
            onFileClick={(file) => {
              const matchingIssue = selectedGroup.issues.find((issue) => issue.location === file);
              if (matchingIssue) {
                setSelectedIssue(matchingIssue);
              }
            }}
          />
        ) : null}
      </div>

      <IssueDrawerFooter>
        {activeTab === "autofix" && groupFixResult && !groupPrUrl ? (
          <AiFixDialogActions
            fixCode={groupFixResult.fix_code}
            isCreatingPR={isGroupCreatingPR}
            onCreatePR={() => void handleGroupCreatePR()}
            onDiscard={clearGroupFix}
          />
        ) : null}
      </IssueDrawerFooter>
    </div>
  );
}
