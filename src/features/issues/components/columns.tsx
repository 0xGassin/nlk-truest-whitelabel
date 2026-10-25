import type { ColumnDef } from "@/components/ui/data-table";
import type { IgnoredSecurityIssue, SecurityIssue } from "@/services/api/integration";

import { Button } from "@/components/ui/button";
import { dataTablePrimaryTextClass, dataTableSecondaryTextClass } from "@/components/ui/data-table";
import { getSeverityWeight, SeverityBadge } from "@/components/ui/severity-badge";

import { SecurityIssueRow } from "./security-issue-row";

interface GetActiveColumnsProps {
  onIgnore: (issue: SecurityIssue) => void;
  organizationId?: string;
  repoId?: string;
}

export function getActiveColumns({
  onIgnore,
  organizationId,
  repoId,
}: GetActiveColumnsProps): ColumnDef<SecurityIssue>[] {
  return [
    {
      cell: (issue) => <SeverityBadge severity={issue.severity} />,
      header: "Severity",
      id: "severity",
      sortable: true,
      sortValue: (issue) => getSeverityWeight(issue.severity),
      width: "120px",
    },
    {
      cell: (issue) => (
        <div className="flex max-w-[500px] flex-col gap-0.5">
          <span className={dataTablePrimaryTextClass} title={issue.message}>
            {issue.message}
          </span>
          <span className={dataTableSecondaryTextClass} title={`${issue.file}:${String(issue.line)}`}>
            {issue.file}:{issue.line}
          </span>
        </div>
      ),
      header: "Issue",
      id: "message",
      sortable: true,
    },
    {
      align: "right",
      cell: (issue) => (
        <SecurityIssueRow issue={issue} onIgnore={onIgnore} organizationId={organizationId} repoId={repoId} />
      ),
      header: "Actions",
      id: "actions",
      width: "180px",
    },
  ];
}

interface GetIgnoredColumnsProps {
  onUnignore: (issue: IgnoredSecurityIssue) => void;
}

export function getIgnoredColumns({ onUnignore }: GetIgnoredColumnsProps): ColumnDef<IgnoredSecurityIssue>[] {
  return [
    {
      cell: (issue) => <span className="font-mono text-sm">{issue.rule_id}</span>,
      header: "Rule ID",
      id: "rule_id",
      sortable: true,
    },
    {
      cell: (issue) => <span className="font-mono text-sm text-muted-foreground">{issue.file_path}</span>,
      header: "File Path",
      id: "file_path",
      sortable: true,
    },
    {
      cell: (issue) => (
        <span className="text-sm text-muted-foreground">{new Date(issue.ignored_at).toLocaleDateString()}</span>
      ),
      header: "Ignored At",
      id: "ignored_at",
      sortable: true,
    },
    {
      align: "right",
      cell: (issue) => (
        <Button
          className="h-8 text-muted-foreground hover:text-foreground"
          onClick={() => {
            onUnignore(issue);
          }}
          size="sm"
          variant="ghost"
        >
          Unignore
        </Button>
      ),
      header: "Actions",
      id: "actions",
      width: "120px",
    },
  ];
}
