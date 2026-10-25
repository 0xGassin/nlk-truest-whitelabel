import type { ColumnDef } from "@/components/ui/data-table";
import type { GitHubRepo } from "@/services/api/github";

import { Eye, FileText, MoreHorizontal, Play, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { dataTablePrimaryTextClass, dataTableSecondaryTextClass } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IssueSeverityBar } from "@/components/ui/issue-severity-bar";
import { SmoothProgress } from "@/components/ui/smooth-progress";
import { toast } from "@/components/ui/toast/toast";
import { formatDate } from "@/lib/date-utils";

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

interface GetRepositoryColumnsProps {
  onGenerateReport: (repo: RepoWithHealth) => void;
  onScan: (repo: RepoWithHealth) => void;
  onUnlink: (repo: RepoWithHealth) => void;
  onViewDetails: (repo: RepoWithHealth) => void;
  scanningRepos: Set<string>;
}

export function getRepositoryColumns({
  onGenerateReport,
  onScan,
  onUnlink,
  onViewDetails,
  scanningRepos,
}: GetRepositoryColumnsProps): ColumnDef<RepoWithHealth>[] {
  return [
    {
      cell: (repo) => (
        <div className="min-w-0">
          <div className={"max-w-[300px] " + dataTablePrimaryTextClass} title={repo.full_name}>
            {repo.full_name}
          </div>
          <div className={dataTableSecondaryTextClass}>
            <span className="truncate">{repo.default_branch}</span>
          </div>
        </div>
      ),
      header: "Repository",
      id: "full_name",
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
      cell: (repo) => {
        if (scanningRepos.has(repo.id)) {
          return <SmoothProgress message={repo.scan_status_msg ?? "Scanning..."} progress={repo.scan_progress ?? 0} />;
        }
        return (
          <IssueSeverityBar
            critical={repo.grouped_critical_count ?? 0}
            high={repo.grouped_high_count ?? 0}
            low={repo.grouped_low_count ?? 0}
            medium={repo.grouped_medium_count ?? 0}
          />
        );
      },
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
          className="flex items-center justify-center"
          onClick={(e) => {
            e.stopPropagation();
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
          }}
          role="presentation"
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="size-8 p-0 text-foreground/60 hover:bg-[#e2e2e2] hover:text-foreground dark:hover:bg-accent"
                size="sm"
                variant="ghost"
              >
                <MoreHorizontal className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={scanningRepos.has(repo.id)}
                onClick={() => {
                  onScan(repo);
                }}
              >
                {scanningRepos.has(repo.id) ? <Spinner className="mr-2" /> : <Play className="mr-2 size-4" />}
                Scan Repository
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  onViewDetails(repo);
                }}
              >
                <Eye className="mr-2 size-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  try {
                    toast.info("Generating report...", {
                      description: "We are preparing your security assessment report.",
                    });
                    onGenerateReport(repo);
                  } catch {
                    // Handled in parent
                  }
                }}
              >
                <FileText className="mr-2 size-4" />
                Generate Report
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  onUnlink(repo);
                }}
              >
                <Trash2 className="mr-2 size-4" />
                Unlink Repository
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
      header: "Actions",
      id: "actions",
      width: "72px",
    },
  ];
}
