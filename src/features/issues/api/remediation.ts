import type { SecurityIssue } from "@/services/api/integration";

import { apiClient } from "@/services/api";

/**
 * Request to analyze a security issue for remediation
 */
export interface AnalyzeIssueRequest {
  issue: SecurityIssue;
}

/**
 * Response from issue analysis with remediation suggestion
 */
export interface AnalyzeIssueResponse {
  data: {
    fix: string;
  };
  message: string;
  success: boolean;
}

/**
 * Dependency update suggestion for fixing a vulnerability
 */
export interface DependencyUpdate {
  current_version: string;
  fix_type: "direct" | "override" | "resolution";
  package_name: string;
  target_version: string;
  vulnerabilities: string[];
}

/**
 * Remediation suggestion with fix code and explanation
 */
export interface RemediationResult {
  dependency_update?: DependencyUpdate;
  explanation: string;
  fix_code: string;
  original_code?: string;
}

/**
 * Remediation API service
 * Handles analysis and generation of fixes for security issues
 */
export const remediationService = {
  /**
   * Analyze a security issue and get remediation suggestions
   * @param organizationId - Organization ID
   * @param repoId - Repository ID
   * @param issue - The security issue to analyze
   * @returns Remediation suggestions including fix code and explanation
   */
  analyzeIssue: async (organizationId: string, repoId: string, issue: SecurityIssue): Promise<RemediationResult> => {
    const response = await apiClient.post<{ data: { fix: RemediationResult } }>("/api/v1/remediation/analyze", {
      issue,
      organization_id: organizationId,
      repo_id: repoId,
    });
    return response.data.data.fix;
  },

  /**
   * Create a pull request with the remediation fix
   * @param organizationId - Organization ID
   * @param repoId - Repository ID
   * @param issue - The security issue
   * @param fix - The remediation fix suggestion
   * @returns PR creation result with URL and branch name
   */
  createFixPR: async (
    organizationId: string,
    repoId: string,
    issue: SecurityIssue,
    fix?: RemediationResult,
  ): Promise<{
    branch_name: string;
    fix_preview?: string;
    pr_number?: number;
    pr_url: string;
    status: string;
  }> => {
    const response = await apiClient.post<{
      data: { branch_name: string; fix_preview?: string; pr_number?: number; pr_url: string; status: string };
    }>("/api/v1/remediation/create-pr", {
      explanation: fix?.explanation,
      fix_code: fix?.fix_code,
      issue,
      organization_id: organizationId,
      original_code: fix?.original_code,
      repo_id: repoId,
    });
    return response.data.data;
  },
};
