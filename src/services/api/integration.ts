import { apiClient } from "./client";

// Interfaces defined below to avoid duplication

export interface SecurityIssue {
  description?: string;
  file: string;
  id?: string;
  issue_type?: string;
  line?: number;
  message: string;
  metadata?: SecurityIssueMetadata;
  references?: string[];
  remediation?: string;
  rule: string;
  severity: string;
  source?: string;
  status: "active" | "auto_ignored" | "ignored" | "solved";
  suggestion?: string;
  tool?: string;
  triage_reason?: string;
  triage_score?: number;
  triage_status?: string;
}

/** Security issue metadata with typed fields */
export interface SecurityIssueMetadata {
  [key: string]: boolean | number | string | undefined;
  cloud_provider?: string;
  cve_id?: string;
  cvss_score?: number;
  cwe_id?: string;
  owasp_category?: string;
  resource_name?: string;
  resource_type?: string;
}

// Backwards compatibility alias

export interface Deployment {
  commit_sha?: string;
  deployed_at: string;
  deployed_by?: string;
  deployment_method: string;
  id: string;
  repo_id: string;
  resource_count: number;
}

export const integrationApi = {
  downloadSBOM: async (organizationId: string, repoId: string): Promise<Blob> => {
    const response = await apiClient.get<Blob>(`/api/v1/organizations/${organizationId}/github/repos/${repoId}/sbom`, {
      responseType: "blob",
    });
    return response.data;
  },

  generateOrganizationSBOMPDF: async (organizationId: string, packages?: SBOMPackage[]): Promise<Blob> => {
    const response = await apiClient.post<Blob>(
      `/api/v1/organizations/${organizationId}/sboms/report`,
      { packages },
      { responseType: "blob" },
    );
    return response.data;
  },

  generateSBOMPDF: async (organizationId: string, repoId: string): Promise<Blob> => {
    const response = await apiClient.get<Blob>(
      `/api/v1/organizations/${organizationId}/github/repos/${repoId}/report/sbom`,
      { responseType: "blob" },
    );
    return response.data;
  },

  getContainerSBOM: async (organizationId: string, imageRef: string): Promise<Blob> => {
    const response = await apiClient.get<Blob>(`/api/v1/organizations/${organizationId}/container/sbom`, {
      params: { image: imageRef },
      responseType: "blob",
    });
    return response.data;
  },

  getOrganizationPackages: async (
    organizationId: string,
    params?: { limit?: number; offset?: number; search?: string },
  ): Promise<{ packages: SBOMPackage[]; total: number }> => {
    const response = await apiClient.get<{ data: { packages: SBOMPackage[]; total: number } }>(
      `/api/v1/organizations/${organizationId}/sboms/packages`,
      { params },
    );
    return response.data.data;
  },

  getOrganizationSBOMs: async (organizationId: string): Promise<SBOMSummary[]> => {
    const response = await apiClient.get<{ data: SBOMSummary[] }>(`/api/v1/organizations/${organizationId}/sboms`);
    return response.data.data;
  },

  getRepoDeployments: async (organizationId: string, repoId: string, limit = 50): Promise<Deployment[]> => {
    const response = await apiClient.get<{ data: Deployment[] }>(
      `/api/v1/organizations/${organizationId}/github/repos/${repoId}/deployments`,
      { params: { limit } },
    );
    return response.data.data;
  },

  getRepoHealthSummary: async (organizationId: string): Promise<RepositoryHealth[]> => {
    const response = await apiClient.get<{ data: RepositoryHealth[] }>(
      `/api/v1/organizations/${organizationId}/github/health-summary`,
    );
    return response.data.data;
  },

  ignoreIssue: async (
    organizationId: string,
    repoId: string,
    ruleId: string,
    filePath: string,
    lineNumber?: number,
  ): Promise<void> => {
    await apiClient.post(`/api/v1/organizations/${organizationId}/github/repos/${repoId}/ignore`, {
      file_path: filePath,
      line_number: lineNumber,
      organization_id: organizationId,
      rule_id: ruleId,
    });
  },

  triggerSecurityScan: async (organizationId: string, repoId: string): Promise<void> => {
    await apiClient.post(`/api/v1/organizations/${organizationId}/github/repos/${repoId}/scan`);
  },

  unignoreIssue: async (organizationId: string, repoId: string, ignoreId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/organizations/${organizationId}/github/repos/${repoId}/ignore/${ignoreId}`);
  },
};

export interface RepositoryHealth {
  active_resource_count: number;
  critical_count: number;
  cspm_issue_count: number;
  dependency_issue_count: number;
  grouped_critical_count: number;
  grouped_high_count: number;
  grouped_issue_count: number;
  grouped_low_count: number;
  grouped_medium_count: number;
  health_score: number;
  high_count: number;
  ignored_count: number;
  last_deployment?: string;
  last_scan_at?: string;
  low_count: number;
  medium_count: number;
  repo_id: string;
  scan_progress?: number;
  scan_status_msg?: string;
  secret_issue_count: number;
  security_issue_count: number;
  security_issues?: SecurityIssue[];
}

export interface SBOMPackage {
  container_scan_id?: string;
  license: string;
  name: string;
  repo_id?: string;
  risk: string;
  source?: string;
  source_type?: "container" | "repository";
  type?: string;
  version: string;
}

export interface SBOMSummary {
  last_generated_at: string;
  repo_id: string;
  repo_name: string;
  type: "container" | "repository";
}

export interface IgnoredSecurityIssue {
  file_path: string;
  id: string;
  ignored_at: string;
  ignored_by?: string;
  repo_id: string;
  rule_id: string;
}

// Backwards compatibility alias
