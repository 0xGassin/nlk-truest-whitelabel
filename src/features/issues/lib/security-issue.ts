import type { UnifiedIssue } from "@/services/api/feed";
import type { SecurityIssue } from "@/services/api/integration";

export function unifiedIssueToSecurityIssue(issue: UnifiedIssue): SecurityIssue {
  const fallbackIssueType = (
    issue.source === "SAST"
      ? "sast"
      : issue.source === "Dependencies"
        ? "dependencies"
        : issue.source === "CSPM"
          ? "cspm"
          : "iac"
  ) as SecurityIssue["issue_type"];

  const originalIssue = issue.original_issue as Partial<SecurityIssue> | undefined;

  if (originalIssue) {
    return {
      ...originalIssue,
      file: originalIssue.file ?? issue.location.split(":")[0],
      id: originalIssue.id ?? issue.id,
      issue_type: originalIssue.issue_type ?? fallbackIssueType,
      line: originalIssue.line ?? (Number.parseInt(issue.location.split(":")[1] || "0", 10) || undefined),
    } as SecurityIssue;
  }

  return {
    description: issue.description,
    file: issue.location.split(":")[0],
    id: issue.id,
    issue_type: issue.type || fallbackIssueType,
    line: Number.parseInt(issue.location.split(":")[1] || "0", 10) || undefined,
    message: issue.title ?? "",
    metadata: (issue as { metadata?: SecurityIssue["metadata"] } & UnifiedIssue).metadata,
    remediation: issue.remediation,
    rule: issue.name,
    severity: issue.severity,
    status: issue.status as SecurityIssue["status"],
    suggestion: (issue as { suggestion?: string } & UnifiedIssue).suggestion,
    tool: issue.scanner_title,
  };
}
