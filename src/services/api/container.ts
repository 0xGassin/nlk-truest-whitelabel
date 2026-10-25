import type { ServerResponse } from "@/types";

import { ensureData } from "@/lib/errors";

import { apiClient } from "./client";

export interface ContainerScan {
  completed_at?: string;
  created_at: string;
  critical_count: number;
  error_message?: string;
  high_count: number;
  id: string;
  image_digest?: string;
  image_ref: string;
  low_count: number;
  medium_count: number;
  organization_id: string;
  package_critical_count?: number;
  package_high_count?: number;
  package_low_count?: number;
  package_medium_count?: number;
  packages_count?: number;
  progress: number;
  started_at?: string;
  status: "completed" | "failed" | "pending" | "running";
  status_message: string;
  updated_at: string;
  vulnerabilities_count: number;
}

export interface ContainerVulnerability {
  created_at: string;
  cvss?: number;
  description?: string;
  file?: string;
  fixed_version?: string;
  id: string;
  installed_version: string;
  issue_type?: string;
  line?: number;
  no_fix?: boolean;
  organization_id?: string;
  pkg_name: string;
  reachability_status?: "reachable" | "unknown" | "unreachable";
  references?: string[];
  scan_id: string;
  severity: "CRITICAL" | "HIGH" | "LOW" | "MEDIUM";
  status: "active" | "auto_ignored" | "ignored" | "solved";
  title?: string;
  triage_reason?: string;
  triage_score?: number;
  triage_status?: string;
  triaged_at?: string;
  vulnerability_id: string;
}

export interface ContainerScanSummary {
  critical_count: number;
  high_count: number;
  low_count: number;
  medium_count: number;
  total_scans: number;
  total_vulnerabilities: number;
}

export interface ContainerScanResponse {
  scan_id: string;
  status: string;
}

export interface ScansResponse {
  scans: ContainerScan[];
}

export interface VulnerabilitiesResponse {
  vulnerabilities: ContainerVulnerability[];
}

const buildPath = (orgId: string, path = "") => `/api/v1/organizations/${orgId}/container${path}`;

export const startContainerScan = async (
  organizationId: string,
  imageRef: string,
): Promise<ContainerScanResponse> => {
  const response = await apiClient.post<ServerResponse<ContainerScanResponse>>(
    buildPath(organizationId, "/scan"),
    { image_ref: imageRef },
  );
  return ensureData(response.data.data, "Failed to start container scan");
};

export const getContainerScans = async (
  organizationId: string,
  connectionIdOrLimit?: number | string,
  limitOrOffset?: number,
  offset = 0,
): Promise<ContainerScan[]> => {
  let connectionId: string | undefined;
  let limit = 20;
  let finalOffset = 0;

  if (typeof connectionIdOrLimit === "string") {
    connectionId = connectionIdOrLimit;
    limit = limitOrOffset ?? 20;
    finalOffset = offset;
  } else {
    limit = connectionIdOrLimit ?? 20;
    finalOffset = limitOrOffset ?? 0;
  }

  const params: { connection_id?: string; limit: number; offset: number } = { limit, offset: finalOffset };
  if (connectionId) params.connection_id = connectionId;

  const response = await apiClient.get<ServerResponse<ScansResponse>>(buildPath(organizationId, "/scans"), { params });
  return response.data.data?.scans ?? [];
};

export const getLatestContainerScan = async (organizationId: string): Promise<ContainerScan | null> => {
  const response = await apiClient.get<ServerResponse<ContainerScan>>(buildPath(organizationId, "/scans/latest"));
  return response.data.data ?? null;
};

export const getContainerScan = async (organizationId: string, scanId: string): Promise<ContainerScan> => {
  const response = await apiClient.get<ServerResponse<ContainerScan>>(buildPath(organizationId, `/scans/${scanId}`));
  return ensureData(response.data.data, "Container scan not found");
};

export const getContainerVulnerabilities = async (
  organizationId: string,
  connectionIdOrScanId: string,
  scanIdOrSeverity?: string,
  severityOrLimit?: number | string,
  limitOrOffset?: number,
  offset = 0,
): Promise<ContainerVulnerability[]> => {
  let _connectionId: string | undefined;
  let scanId: string;
  let severity: string | undefined;
  let limit = 1000;
  let finalOffset = 0;

  // Check if we have the "extra" argument pattern: (orgId, connId, scanId, ...)
  // If connectionIdOrScanId is a connectionId, then scanIdOrSeverity MUST be the scanId.
  // If connectionIdOrScanId is scanId, then scanIdOrSeverity is severity (optional).

  // Heuristic: If we have 3 string arguments, or 2 strings + number, it implies the 3-arg pattern.
  // Call 1: (org, conn, scan) -> 3 strings (if severity is undefined) or 3 strings + ...
  // Call 2: (org, scan, severity) -> 3 strings.
  // Call 3: (org, scan) -> 2 strings.

  // We can differentiate because the Connector page usage is explicit: (org, conn, scan)
  // Global usage: (org, scan) or (org, scan, severity)

  // Let's assume if scanIdOrSeverity matches a Scan ID format (UUID) it is a scanId?
  // Or if we simply check if `scanIdOrSeverity` is provided and IS NOT one of the severity levels?
  // Severities are CRITICAL, HIGH, MEDIUM, LOW, all.

  // But `scanIdOrSeverity` could be undefined in Global usage (org, scan).

  // Let's rely on checking if `scanIdOrSeverity` looks like a UUID vs "CRITICAL"/"HIGH"/etc?
  // Or simpler: if `scanIdOrSeverity` exists, we assume it's severity UNLESS we decided the first arg was connectionId.

  // Let's try this:
  // If the caller uses `getContainerVulnerabilities(org, conn, scan)`, then `scanIdOrSeverity` is `scan`.
  // How to distinguish from `getContainerVulnerabilities(org, scan, severity)`?

  // In the failing file, it calls: `getContainerVulnerabilities(orgId, connectionId, scan.id)` (3 args)
  // In global file: `getContainerVulnerabilities(orgId, scan.id)` (2 args)
  // or with severity: `getContainerVulnerabilities(orgId, scan.id, severity)` (3 args)

  // If we have 3 string args: (A, B, C)
  // Case 1: A=org, B=conn, C=scan
  // Case 2: A=org, B=scan, C=severity

  // We can assume B is scan if C is severity known value?
  // Severity values: 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'all'.
  // A scan ID shouldn't match those.

  const severities = new Set(["all", "CRITICAL", "HIGH", "LOW", "MEDIUM"]);

  if (scanIdOrSeverity != null && severities.has(scanIdOrSeverity)) {
    // Case 2: B matches scan, C matches severity
    scanId = connectionIdOrScanId;
    severity = scanIdOrSeverity;
    limit = (severityOrLimit as number) || 1000;
    finalOffset = limitOrOffset ?? 0;
  } else if (scanIdOrSeverity && !severities.has(scanIdOrSeverity)) {
    // Case 1: C is likely scanId (because it's not a severity). B is ConnId.
    // BUT wait, if severity is undefined in Case 2?
    // (org, scan, undefined) -> scanIdOrSeverity is undefined.

    // If scanIdOrSeverity is a string and NOT a severity, must be scanId (Case 1).
    _connectionId = connectionIdOrScanId;
    scanId = scanIdOrSeverity;
    severity = severityOrLimit as string; // 4th arg would be severity
    limit = limitOrOffset ?? 50;
    finalOffset = offset; // 6th arg would be offset? We ran out of args in the signature above.
  } else {
    // scanIdOrSeverity is undefined.
    // It could be (org, scan) -> B is scan.
    // Or (org, conn, scan?) with scan undefined? No scan is required.

    // If we only have 2 args (org, B), B is scan.
    scanId = connectionIdOrScanId;
    limit = (severityOrLimit as number) || 50;
    finalOffset = limitOrOffset ?? 0;
  }

  // Wait, the signature I wrote above needs to accommodate the 4th arg being severity for Case 1.
  // (org, conn, scan, severity, limit, offset)

  /* 
       Let's refine logic:
       If `scanIdOrSeverity` is present AND NOT a severity keyword:
         Assume (org, conn, scan, ...)
       Else:
         Assume (org, scan, severity?, ...)
    */

  if (typeof scanIdOrSeverity === "string" && !severities.has(scanIdOrSeverity)) {
    _connectionId = connectionIdOrScanId;
    scanId = scanIdOrSeverity;
    severity = severityOrLimit as string;
    limit = limitOrOffset ?? 1000;
    finalOffset = offset;
  } else {
    scanId = connectionIdOrScanId;
    severity = scanIdOrSeverity;
    limit = (severityOrLimit as number) || 1000;
    finalOffset = limitOrOffset ?? 0;
  }

  const params: Record<string, number | string> = { limit, offset: finalOffset };
  if (severity && severity !== "all") params.severity = severity;
  // We don't really use connectionId for this call as path depends on scanId, but we support the arg.

  const response = await apiClient.get<ServerResponse<VulnerabilitiesResponse>>(
    buildPath(organizationId, `/scans/${scanId}/vulnerabilities`),
    { params },
  );
  return response.data.data?.vulnerabilities ?? [];
};

export const getContainerSummary = async (organizationId: string): Promise<ContainerScanSummary> => {
  const response = await apiClient.get<ServerResponse<ContainerScanSummary>>(buildPath(organizationId, "/summary"));
  return (
    response.data.data ?? {
      critical_count: 0,
      high_count: 0,
      low_count: 0,
      medium_count: 0,
      total_scans: 0,
      total_vulnerabilities: 0,
    }
  );
};

export const deleteContainerScan = async (organizationId: string, scanId: string): Promise<void> => {
  await apiClient.delete(buildPath(organizationId, `/scans/${scanId}`));
};

export const updateVulnerabilityStatus = async (
  organizationId: string,
  vulnerabilityId: string,
  status: "active" | "ignored" | "solved",
): Promise<void> => {
  await apiClient.patch(buildPath(organizationId, `/vulnerabilities/${vulnerabilityId}/status`), {
    status,
  });
};

/**
 * Download SBOM for a container image
 */
export const downloadSBOM = async (image: string): Promise<void> => {
  const response = await apiClient.get("/api/v1/container/sbom", {
    params: { image },
    responseType: "blob",
  });

  const url = globalThis.URL.createObjectURL(new Blob([response.data as BlobPart]));
  const link = document.createElement("a");
  link.href = url;

  const contentDisposition: string | undefined = response.headers["content-disposition"] as string | undefined;
  let fileName = `sbom-${(image ?? "image").replaceAll(/[^a-z0-9]/gi, "_")}.json`;
  if (contentDisposition) {
    const fileNameMatch: null | RegExpMatchArray = /filename="?(.+)"?/.exec(contentDisposition);
    if (fileNameMatch?.[1]) fileName = fileNameMatch[1];
  }

  link.setAttribute("download", fileName);
  document.body.append(link);
  link.click();
  link.remove();
  globalThis.URL.revokeObjectURL(url);
};

export const containerService = {
  deleteContainerScan,
  downloadSBOM,
  getContainerScan,
  getContainerScans,
  getContainerSummary,
  getContainerVulnerabilities,
  getLatestContainerScan,
  startContainerScan,
  updateVulnerabilityStatus,
};
