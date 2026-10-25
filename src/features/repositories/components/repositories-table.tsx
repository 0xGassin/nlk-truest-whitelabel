import type { ColumnDef } from "@/components/ui/data-table";
import type { Filter, FilterFieldConfig } from "@/components/ui/filters";
import type { PlusIconHandle } from "@/components/ui/plus";
import type { GitHubRepo } from "@/services/api/github";

import { ListFilter, MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ContextMenuItem, ContextMenuSeparator } from "@/components/ui/context-menu";
import {
  DataTable,
  DataTableRefreshButton,
  dataTableToolbarButtonClassName,
  dataTableToolbarInputClassName,
} from "@/components/ui/data-table";
import { Filters } from "@/components/ui/filters";
import { IssueSeverityBar } from "@/components/ui/issue-severity-bar";
import { PlusIcon } from "@/components/ui/plus";
import { SmoothProgress } from "@/components/ui/smooth-progress";
import { formatDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

const selectOperators = [
  { label: "is", value: "is" },
  { label: "is not", value: "is_not" },
];

export interface RepoWithHealth extends GitHubRepo {
  critical_count?: number;
  grouped_critical_count?: number;
  grouped_high_count?: number;
  grouped_issue_count?: number;
  grouped_low_count?: number;
  grouped_medium_count?: number;
  high_count?: number;
  /** @deprecated Use security_issue_count */
  iac_problem_count?: number;
  ignored_count?: number;
  last_scan?: string;
  low_count?: number;
  medium_count?: number;
  scan_progress?: number;
  scan_status_msg?: string;
  security_issue_count?: number;
}

interface RepositoriesTableProps {
  isLoading: boolean;
  onGenerateReport: (repo: GitHubRepo) => void;
  onLinkRepo: () => void;
  onRefresh: () => void;
  onScan: (repo: GitHubRepo) => void;
  onUnlink: (repo: GitHubRepo) => void;
  repos: RepoWithHealth[];
  scanningRepos: Set<string>;
}

export function RepositoriesTable({
  isLoading,
  onGenerateReport,
  onLinkRepo,
  onRefresh,
  onScan,
  onUnlink,
  repos,
  scanningRepos,
}: RepositoriesTableProps) {
  const router = useRouter();
  const linkRepoIconRef = useRef<null | PlusIconHandle>(null);
  const [filters, setFilters] = useState<Filter[]>([]);

  const filterFields: FilterFieldConfig[] = useMemo(
    () => [
      {
        key: "visibility",
        label: "Visibility",
        operators: selectOperators,
        options: [
          { label: "Public", value: "public" },
          { label: "Private", value: "private" },
        ],
        type: "select",
      },
      {
        key: "scanStatus",
        label: "Scan Status",
        operators: selectOperators,
        options: [
          { label: "Scanning", value: "scanning" },
          { label: "Never scanned", value: "never" },
          { label: "Scanned", value: "scanned" },
        ],
        type: "select",
      },
      {
        key: "issues",
        label: "Issues",
        operators: selectOperators,
        options: [
          { label: "Critical", value: "critical" },
          { label: "High", value: "high" },
          { label: "Medium", value: "medium" },
          { label: "Low", value: "low" },
          { label: "None", value: "none" },
        ],
        type: "select",
      },
    ],
    [],
  );

  const filteredRepos = useMemo(() => {
    if (filters.length === 0) return repos;
    return repos.filter((repo) => {
      return filters.every((filter) => {
        const value = typeof filter.values[0] === "string" ? filter.values[0] : "";
        if (filter.field === "visibility") {
          const matches = repo.private ? value === "private" : value === "public";
          return filter.operator === "is_not" ? !matches : matches;
        }
        if (filter.field === "scanStatus") {
          const matches =
            value === "scanning"
              ? scanningRepos.has(repo.id)
              : value === "never"
                ? !repo.last_scan
                : !!repo.last_scan && !scanningRepos.has(repo.id);
          return filter.operator === "is_not" ? !matches : matches;
        }
        if (filter.field === "issues") {
          const counts = {
            critical: repo.grouped_critical_count ?? 0,
            high: repo.grouped_high_count ?? 0,
            low: repo.grouped_low_count ?? 0,
            medium: repo.grouped_medium_count ?? 0,
          };
          const total = counts.critical + counts.high + counts.medium + counts.low;
          const matches = value === "none" ? total === 0 : counts[value as keyof typeof counts] > 0;
          return filter.operator === "is_not" ? !matches : matches;
        }
        return true;
      });
    });
  }, [filters, repos, scanningRepos]);

  const columns: ColumnDef<RepoWithHealth>[] = useMemo(
    () => [
      {
        cell: (repo) => (
          <div className="truncate text-[14px] font-normal leading-5 text-foreground" title={repo.full_name}>
            {repo.full_name}
          </div>
        ),
        header: "Repository",
        id: "full_name",
        sortable: true,
      },
      {
        cell: (repo) => (
          <span className="text-[14px] font-normal leading-5 text-foreground/80">{repo.default_branch}</span>
        ),
        header: "Branch",
        id: "default_branch",
        sortable: true,
      },
      {
        cell: (repo) =>
          repo.last_scan ? (
            <span className="text-[13px] font-normal text-gray-900/80 dark:text-foreground/80">
              {formatDate(repo.last_scan)}
            </span>
          ) : (
            <span className="text-[13px] font-normal text-gray-900/80 dark:text-foreground/60">No scan yet</span>
          ),
        header: "Last Scan",
        id: "last_scan",
        sortable: true,
      },
      {
        cell: (repo) =>
          scanningRepos.has(repo.id) ? (
            <SmoothProgress
              message={repo.scan_status_msg ?? "Starting repository scan..."}
              progress={Math.max(1, repo.scan_progress ?? 0)}
            />
          ) : (
            <IssueSeverityBar
              critical={repo.grouped_critical_count ?? 0}
              high={repo.grouped_high_count ?? 0}
              low={repo.grouped_low_count ?? 0}
              medium={repo.grouped_medium_count ?? 0}
            />
          ),
        header: "Issues",
        id: "issues",
        sortable: true,
        sortValue: (repo) =>
          (repo.grouped_critical_count ?? 0) +
          (repo.grouped_high_count ?? 0) +
          (repo.grouped_medium_count ?? 0) +
          (repo.grouped_low_count ?? 0),
      },
      {
        align: "right",
        cell: (repo) => (
          <div
            className="flex items-center justify-end"
            onClick={(e) => {
              e.stopPropagation();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") e.stopPropagation();
            }}
            role="button"
            tabIndex={-1}
          >
            <Button
              className="size-7 p-0"
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                const event = new MouseEvent("contextmenu", {
                  bubbles: true,
                  cancelable: true,
                  clientX: e.clientX,
                  clientY: e.clientY,
                  button: 2,
                });
                e.currentTarget.dispatchEvent(event);
              }}
            >
              <MoreHorizontal className="size-5" />
            </Button>
          </div>
        ),
        header: "Actions",
        id: "actions",
        width: "72px",
      },
    ],
    [onScan, onUnlink, onGenerateReport, scanningRepos, router],
  );

  const renderContextMenu = useCallback(
    (repo: RepoWithHealth) => (
      <>
        <ContextMenuItem
          disabled={scanningRepos.has(repo.id)}
          onClick={() => {
            onScan(repo);
          }}
        >
          Scan Repository
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => {
            router.push(`/assets/repositories/${repo.id}`);
          }}
        >
          View Details
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => {
            onGenerateReport(repo);
          }}
        >
          Generate Report
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          variant="destructive"
          onClick={() => {
            onUnlink(repo);
          }}
        >
          Unlink Repository
        </ContextMenuItem>
      </>
    ),
    [onScan, onUnlink, onGenerateReport, scanningRepos, router],
  );

  const toolbarButtonClassName = dataTableToolbarButtonClassName;

  const filtersToolbar = (
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
          onClick={() => {
            setFilters([]);
          }}
          variant="outline"
        >
          <ListFilter className="size-4" />
          Clear
        </Button>
      ) : null}
    </div>
  );

  const actions = (
    <>
      <Button
        className="h-9 gap-2 border-0 bg-[#0033ff] text-white hover:bg-[#0033ff]/90"
        onClick={onLinkRepo}
        onMouseEnter={() => {
          linkRepoIconRef.current?.startAnimation();
        }}
        onMouseLeave={() => {
          linkRepoIconRef.current?.stopAnimation();
        }}
        size="sm"
      >
        <PlusIcon className="text-white" ref={linkRepoIconRef} size={16} />
        Link Repository
      </Button>
      <DataTableRefreshButton className={toolbarButtonClassName} isLoading={isLoading} onClick={onRefresh} />
    </>
  );

  return (
    <DataTable
      actions={actions}
      className="h-full min-h-0"
      columns={columns}
      data={filteredRepos}
      defaultSort={{ direction: "desc", key: "last_scan" }}
      emptyMessage={
        repos.length === 0
          ? "No repositories linked yet."
          : filters.length > 0
            ? "No repositories found matching your filters."
            : "No repositories found matching your search."
      }
      extraToolbarContent={filtersToolbar}
      getRowHref={(repo) => `/assets/repositories/${repo.id}`}
      getRowKey={(repo) => repo.id}
      isLoading={isLoading}
      keepToolbarWhileLoading
      loadingMessage="Loading repositories..."
      onRowClick={(repo) => {
        router.push(`/assets/repositories/${repo.id}`);
      }}
      renderContextMenu={renderContextMenu}
      searchKey="full_name"
      searchPlaceholder="Search Repositories"
      tableClassName="table-fixed w-full"
      toolbarButtonClassName={toolbarButtonClassName}
      toolbarInputClassName={dataTableToolbarInputClassName}
    />
  );
}
