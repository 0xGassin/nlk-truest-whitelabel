import type { ColumnDef } from "@/components/ui/data-table";
import type { Issue } from "@/services/api/feed";
import type { CloudResource } from "@/types";

import { AlertCircle, AlertTriangle, ArrowDownLeft, ArrowUpRight, ChevronDown, History, Shapes } from "lucide-react";
import { useState } from "react";

import { DataTable } from "@/components/ui/data-table";
import { detailDrawerSurfaceClassName, DrawerContent } from "@/components/ui/drawer";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "@/components/ui/toast/toast";
import { SEVERITY_ORDER } from "@/features/feed/hooks/use-issue-grouping";
import {
  ISSUE_DRAWER_BODY_CLASS,
  ISSUE_DRAWER_SECTIONS_CLASS,
  IssueDrawerFooter,
  IssueDrawerHeaderSection,
  IssueDrawerTabs,
  IssueDrawerTitle,
} from "@/features/issues/components/issue-drawer-ui";
import { cn } from "@/lib/utils";

import { formatRelationshipType, formatResourceType } from "../lib/resource-type";
import { IssueSemiDrawer } from "./issue-semi-drawer";
import { ResourceHistory } from "./resource-history";
import { ResourceTypeIcon } from "./resource-type-icon";

/** A node directly connected to the resource, from the resource graph. */
export interface RelatedResource {
  arn: string;
  direction: "in" | "out";
  label: string;
  relationshipType: string;
  resourceType?: string;
}

interface ResourceDetailsDrawerProps {
  connectionId: string;
  connectionName?: null | string;
  isLoadingMetadata: boolean;
  issues?: Issue[];
  metadataError: null | string;
  organizationId: string;
  relatedResources?: RelatedResource[];
  resource: CloudResource | null;
  showHistory?: boolean;
}

type ResourceDrawerView = "history" | "issues" | "overview";

export function ResourceDetailsDrawer({
  connectionId,
  connectionName,
  isLoadingMetadata,
  issues,
  metadataError,
  organizationId,
  relatedResources,
  resource,
  showHistory = true,
}: ResourceDetailsDrawerProps) {
  const [activeView, setActiveView] = useState<ResourceDrawerView>("overview");
  const [isMetadataOpen, setIsMetadataOpen] = useState(true);
  const [isRelationshipsOpen, setIsRelationshipsOpen] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  if (!resource) return null;

  const typeLabel = formatResourceType(resource.resource_type);
  const metadataEntries =
    resource.metadata && Object.keys(resource.metadata).length > 0 ? Object.entries(resource.metadata) : [];

  const issueColumns: ColumnDef<Issue>[] = [
    {
      cell: (issue) => <SeverityBadge severity={issue.severity} />,
      header: "Severity",
      id: "severity",
      sortable: true,
      sortValue: (issue) => SEVERITY_ORDER[issue.severity.toUpperCase()] ?? 4,
      width: "100px",
    },
    {
      cell: (issue) => (
        <div className="min-w-0">
          <div className="truncate text-[14px] leading-5 font-normal text-foreground" title={issue.title ?? issue.name}>
            {issue.title ?? issue.name}
          </div>
          <div className="mt-0.5 truncate text-[13px] leading-5 font-normal text-foreground/80" title={issue.source}>
            {issue.source}
          </div>
        </div>
      ),
      header: "Issue",
      id: "name",
      sortable: true,
    },
    {
      cell: (issue) => <StatusBadge label={issue.status_label} status={issue.status} />,
      header: "Status",
      id: "status",
      sortable: true,
      width: "100px",
    },
  ];

  const drawerTabs: {
    count?: number;
    icon: typeof Shapes;
    id: ResourceDrawerView;
    label: string;
  }[] = [{ icon: Shapes, id: "overview", label: "Overview" }];

  if (issues) {
    drawerTabs.push({ count: issues.length, icon: AlertTriangle, id: "issues", label: "Issues" });
  }

  if (showHistory) {
    drawerTabs.push({ icon: History, id: "history", label: "History" });
  }

  return (
    <DrawerContent
      className={cn(detailDrawerSurfaceClassName, "flex flex-col overflow-hidden p-0 outline-none")}
      side="right"
    >
      <div className="flex h-full flex-col overflow-hidden">
        <IssueDrawerHeaderSection>
          <div className="flex items-center gap-3.5">
            <div className="flex size-7 shrink-0 items-center justify-center">
              <ResourceTypeIcon className="mt-0.5 size-7" type={resource.resource_type} />
            </div>
            <div className="min-w-0 flex-1">
              <IssueDrawerTitle className="truncate">{resource.resource_name ?? resource.resource_id}</IssueDrawerTitle>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">{typeLabel}</div>
            </div>
          </div>
        </IssueDrawerHeaderSection>

        <IssueDrawerTabs activeTab={activeView} className="mt-3" onTabChange={setActiveView} tabs={drawerTabs} />

        <div className={ISSUE_DRAWER_BODY_CLASS}>
          {activeView === "overview" ? (
            isLoadingMetadata ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <Spinner className="size-6" />
                  <p className="text-sm text-muted-foreground">Loading resource...</p>
                </div>
              </div>
            ) : (
              <div className={ISSUE_DRAWER_SECTIONS_CLASS}>
                {metadataError ? (
                  <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                    <AlertCircle className="mt-0.5 size-5 text-red-600 dark:text-red-400" />
                    <div>
                      <h4 className="font-medium text-red-900 dark:text-red-100">Error</h4>
                      <p className="text-sm text-red-700 dark:text-red-300">{metadataError}</p>
                    </div>
                  </div>
                ) : null}

                <div className="grid grid-cols-3 gap-4">
                  <div className="min-w-0 space-y-1">
                    <div className="text-sm text-muted-foreground">Connector</div>
                    <div className="flex items-center gap-1.5 text-sm text-foreground">
                      <span className="min-w-0 truncate">{connectionName ?? connectionId}</span>
                    </div>
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="text-sm text-muted-foreground">Region</div>
                    <div className="min-w-0 truncate text-sm text-foreground">{resource.region || "global"}</div>
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="text-sm text-muted-foreground">Source</div>
                    <div className="min-w-0 truncate text-sm text-foreground">
                      {resource.source_type === "iac"
                        ? "Infrastructure as Code"
                        : resource.source_type === "manual"
                          ? "ClickOps"
                          : "-"}
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-4">
                  {resource.discovered_at ? (
                    <div className="min-w-0 space-y-1">
                      <div className="text-sm text-muted-foreground">Discovered</div>
                      <div className="min-w-0 truncate text-sm text-foreground">
                        {new Date(resource.discovered_at).toLocaleString()}
                      </div>
                    </div>
                  ) : null}
                  {resource.last_seen_at ? (
                    <div className="min-w-0 space-y-1">
                      <div className="text-sm text-muted-foreground">Last seen</div>
                      <div className="min-w-0 truncate text-sm text-foreground">
                        {new Date(resource.last_seen_at).toLocaleString()}
                      </div>
                    </div>
                  ) : null}
                  {resource.arn ? (
                    <div className="min-w-0 space-y-1">
                      <div className="text-sm text-muted-foreground">ARN</div>
                      <button
                        className="block w-full min-w-0 truncate text-left text-sm text-foreground underline-offset-2 hover:underline"
                        onClick={() => {
                          void navigator.clipboard.writeText(resource.arn ?? "");
                          toast.success("Copied", { description: "ARN copied to clipboard" });
                        }}
                        type="button"
                      >
                        {resource.arn}
                      </button>
                    </div>
                  ) : null}
                </div>

                {(relatedResources && relatedResources.length > 0) || metadataEntries.length > 0 ? (
                  <div className="-mx-6 divide-y divide-border/50 border-y bg-card">
                    {relatedResources && relatedResources.length > 0 ? (
                      <div>
                        <button
                          aria-expanded={isRelationshipsOpen}
                          className={cn(
                            "flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium",
                            isRelationshipsOpen && "border-b",
                          )}
                          onClick={() => {
                            setIsRelationshipsOpen(!isRelationshipsOpen);
                          }}
                          type="button"
                        >
                          <div className="flex items-center gap-2">
                            <ChevronDown
                              className={cn(
                                "size-4 text-muted-foreground transition-transform",
                                !isRelationshipsOpen && "-rotate-90",
                              )}
                            />
                            <span>Relationships</span>
                          </div>
                          <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                            {relatedResources.length}
                          </span>
                        </button>
                        {isRelationshipsOpen ? (
                          <div className="divide-y divide-border/50 bg-muted/50">
                            {relatedResources.map((related) => (
                              <div className="px-4 py-2 text-sm" key={`${related.direction}:${related.arn}`}>
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  {related.direction === "in" ? (
                                    <ArrowDownLeft className="size-3.5 shrink-0" />
                                  ) : (
                                    <ArrowUpRight className="size-3.5 shrink-0" />
                                  )}
                                  <span>{formatRelationshipType(related.relationshipType)}</span>
                                  <span>{related.direction === "in" ? "(in)" : "(out)"}</span>
                                </div>
                                <div className="mt-0.5 flex items-center gap-2 font-mono text-[13px] break-all text-foreground">
                                  {related.resourceType ? (
                                    <ResourceTypeIcon className="size-4 shrink-0" type={related.resourceType} />
                                  ) : null}
                                  <span className="min-w-0">{related.label}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {metadataEntries.length > 0 ? (
                      <div>
                        <button
                          aria-expanded={isMetadataOpen}
                          className={cn(
                            "flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium",
                            isMetadataOpen && "border-b",
                          )}
                          onClick={() => {
                            setIsMetadataOpen(!isMetadataOpen);
                          }}
                          type="button"
                        >
                          <div className="flex items-center gap-2">
                            <ChevronDown
                              className={cn(
                                "size-4 text-muted-foreground transition-transform",
                                !isMetadataOpen && "-rotate-90",
                              )}
                            />
                            <span>Metadata</span>
                          </div>
                          <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                            {metadataEntries.length}
                          </span>
                        </button>
                        {isMetadataOpen ? (
                          <div className="divide-y divide-border/50 bg-muted/50">
                            {metadataEntries.map(([key, value]) => (
                              <div className="px-4 py-2 text-sm" key={key}>
                                <div className="text-muted-foreground">{key}</div>
                                <div className="mt-0.5 font-mono text-[13px] break-all text-foreground">
                                  {String(value)}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )
          ) : activeView === "issues" ? (
            <DataTable
              className="min-h-0"
              columns={issueColumns}
              data={issues ?? []}
              defaultSort={{ direction: "asc", key: "severity" }}
              emptyMessage="No active issues for this resource."
              getRowKey={(issue) => issue.id}
              layout="content"
              onRowClick={(issue) => {
                setSelectedIssue(issue);
              }}
              searchKey="name"
              searchPlaceholder="Search Issues"
              tableClassName="table-fixed w-full"
            />
          ) : (
            <ResourceHistory connectionId={connectionId} organizationId={organizationId} resourceId={resource.id} />
          )}
        </div>

        <IssueDrawerFooter />
      </div>

      <IssueSemiDrawer
        issue={selectedIssue}
        onClose={() => {
          setSelectedIssue(null);
        }}
      />
    </DrawerContent>
  );
}
