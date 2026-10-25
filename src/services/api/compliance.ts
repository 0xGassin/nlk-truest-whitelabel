import type { UnifiedIssue } from "./feed";
import type { ComplianceControl, ComplianceResponse, FrameworksResponse, ScanResponse, ServerResponse } from "@/types";
import type { AxiosInstance } from "axios";

import { ensureData } from "@/lib/errors";

let _apiClient: AxiosInstance | null = null;
function getClient(): AxiosInstance {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, unicorn/prefer-module
  _apiClient ??= (require("./client") as { apiClient: AxiosInstance }).apiClient;
  return _apiClient;
}

// Re-export types for convenience
export type { ComplianceControl, ComplianceResponse, FrameworksResponse, ScanResponse };

export interface CSPMIssueRecord {
  check_name: string;
  check_title?: string;
  created_at: string;
  description?: string;
  id: string;
  remediation?: string;
  resources?: string[];
  scan_id?: string;
  severity: string;
  status?: { String?: null | string } | null | string;
  updated_at?: string;
}

export interface CSPMIssuesResponse {
  issues?: CSPMIssueRecord[];
  total?: number;
}

interface MapCSPMIssueOptions {
  accountId?: string;
  connectionId?: string;
  connectionName?: string;
}

export function normalizeCSPMIssueStatus(status: CSPMIssueRecord["status"]): string {
  const rawStatus =
    typeof status === "string" ? status : status && typeof status === "object" ? (status.String ?? "") : "";

  switch (rawStatus) {
    case "open":
      return "active";
    case "resolved":
      return "solved";
    default:
      return rawStatus || "active";
  }
}

export function getCSPMIssueStatusLabel(status: string): string {
  switch (status) {
    case "auto_ignored":
    case "ignored":
      return "Ignored";
    case "fixed":
    case "resolved":
    case "solved":
      return "Solved";
    default:
      return "Active";
  }
}

function formatCSPMIssueLocation(resources: string[] = []): string {
  if (resources.length === 0) {
    return "";
  }

  if (resources.length === 1) {
    return resources[0];
  }

  return `${resources[0]} (+${String(resources.length - 1)} others)`;
}

export function mapCSPMIssueToUnifiedIssue(issue: CSPMIssueRecord, options: MapCSPMIssueOptions = {}): UnifiedIssue {
  const resources = issue.resources ?? [];
  const status = normalizeCSPMIssueStatus(issue.status);

  const title = issue.check_title || issue.check_name;

  return {
    created_at: issue.created_at,
    description: issue.description ?? "",
    id: issue.id,
    location: formatCSPMIssueLocation(resources),
    name: issue.check_name,
    original_issue: issue,
    remediation: issue.remediation ?? "",
    resource_id: options.connectionId,
    resource_ids: resources,
    resource_name: options.connectionName || options.accountId || options.connectionId,
    scan_id: issue.scan_id ?? "",
    scanner_title: "CSPM",
    severity: issue.severity,
    source: "CSPM",
    status,
    status_label: getCSPMIssueStatusLabel(status),
    title,
    type: "cspm",
    updated_at: issue.updated_at ?? issue.created_at,
  };
}

export function mapCSPMIssuesToUnifiedIssues(
  issues: CSPMIssueRecord[] | undefined,
  options: MapCSPMIssueOptions = {},
): UnifiedIssue[] {
  return (issues ?? []).map((issue) => mapCSPMIssueToUnifiedIssue(issue, options));
}

/**
 * Start a scan for a connection
 */
export const startScan = async (organizationId: string, connectionId: string): Promise<ScanResponse> => {
  const response = await getClient().post<ServerResponse<ScanResponse>>(
    `/api/v1/organizations/${organizationId}/connections/${connectionId}/scan`,
  );
  return ensureData(response.data.data, "Failed to start scan");
};

/**
 * List available compliance frameworks for a connection
 */
export const listComplianceFrameworks = async (organizationId: string, connectionId: string): Promise<string[]> => {
  const response = await getClient().get<ServerResponse<FrameworksResponse>>(
    `/api/v1/organizations/${organizationId}/connections/${connectionId}/cspm/compliance/frameworks`,
  );
  const frameworks = response.data.data?.frameworks ?? [];

  return frameworks;
};

/**
 * Get compliance data for a connection, optionally filtered by framework
 */
export const getCompliance = async (
  organizationId: string,
  connectionId: string,
  framework?: string,
): Promise<ComplianceControl[]> => {
  const params = framework ? { framework } : {};
  const response = await getClient().get<ServerResponse<ComplianceResponse>>(
    `/api/v1/organizations/${organizationId}/connections/${connectionId}/cspm/compliance`,
    { params },
  );
  return response.data.data?.findings ?? [];
};

/**
 * Get CSPM issues for a connection
 */
export const getCSPMIssues = async (
  organizationId: string,
  connectionId: string,
  params: { limit?: number; offset?: number; passed?: boolean; severity?: string; status?: string } = {},
): Promise<CSPMIssuesResponse> => {
  const response = await getClient().get<ServerResponse<CSPMIssuesResponse>>(
    `/api/v1/organizations/${organizationId}/connections/${connectionId}/cspm/issues`,
    { params },
  );
  return ensureData(response.data.data, "Failed to fetch CSPM issues");
};

/**
 * Update the status of a CSPM issue (e.g. active, ignored, solved)
 */
export const updateCSPMIssueStatus = async (
  organizationId: string,
  connectionId: string,
  issueId: string,
  status: string,
): Promise<void> => {
  await getClient().patch(
    `/api/v1/organizations/${organizationId}/connections/${connectionId}/cspm/issues/${issueId}/status`,
    { status },
  );
};
