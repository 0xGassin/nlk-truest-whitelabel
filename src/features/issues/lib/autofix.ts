import type { SecurityIssue } from "@/services/api/integration";

export function resolveIssueType(issue: SecurityIssue): string {
  const explicit = issue.issue_type?.trim().toLowerCase();
  if (explicit) {
    return explicit;
  }

  const tool = issue.tool?.trim().toLowerCase();
  if (tool === "semgrep") {
    return "sast";
  }
  if (tool === "trivy-iac") {
    return "iac";
  }
  if (tool === "trivy-sca") {
    return "dependencies";
  }

  return "iac";
}

export function isIacIssue(issue: SecurityIssue): boolean {
  return resolveIssueType(issue) === "iac";
}

export function isAutofixAvailable(issue: SecurityIssue): boolean {
  if (!issue.file.trim()) {
    return false;
  }

  const type = resolveIssueType(issue);
  return type === "sast" || type === "iac";
}

export function hasSemgrepAutofix(issue: SecurityIssue): boolean {
  return resolveIssueType(issue) === "sast" && issue.tool === "semgrep" && Boolean(issue.remediation?.trim());
}
