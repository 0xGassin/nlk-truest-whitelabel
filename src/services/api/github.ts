import type { GitHubRepoRaw } from "@/types/api";

import { apiClient } from "./client";

/**
 * GitHub repository linked to the organization
 */
export interface GitHubRepo {
  created_at: string;
  default_branch: string;
  description: string;
  full_name: string;
  github_repo_id: number;
  html_url: string;
  id: string;
  integration_id: string;
  last_scan_at?: string;
  name: string;
  private: boolean;
  scan_progress?: number;
  scan_status_msg?: string;
  updated_at: string;
}

/**
 * GitHub OAuth integration configuration
 */
export interface GitHubIntegration {
  created_at: string;
  github_username: string;
  id: string;
  installation_id?: number;
  organization_id: string;
}

/**
 * GitHub integration API service
 * Handles OAuth login, repository linking, and GitHub operations
 */
export const githubApi = {
  /**
   * Disconnect a GitHub integration from the organization
   * @param orgId - Organization ID
   * @param integrationId - Integration ID to disconnect
   */
  disconnectIntegration: async (orgId: string, integrationId: string) => {
    await apiClient.delete(`/api/v1/organizations/${orgId}/github/integrations/${integrationId}`);
  },

  /**
   * Generate a security report for a GitHub repository
   * @param orgId - Organization ID
   * @param repoId - Repository ID
   * @returns Report file as blob
   */
  generateReport: async (orgId: string, repoId: string) => {
    const response = await apiClient.get<Blob>(`/api/v1/organizations/${orgId}/github/repos/${repoId}/report`, {
      responseType: "blob",
    });
    return response.data;
  },

  /**
   * Get all GitHub integrations for the organization
   * @param orgId - Organization ID
   * @returns List of GitHub integrations
   */
  getIntegrations: async (orgId: string) => {
    const response = await apiClient.get<{ data: GitHubIntegration[] }>(
      `/api/v1/organizations/${orgId}/github/integrations`,
    );
    return response.data.data;
  },

  /**
   * Get all linked GitHub repositories
   * @param orgId - Organization ID
   * @returns List of linked repositories
   */
  getLinkedRepos: async (orgId: string) => {
    const response = await apiClient.get<{ data: GitHubRepo[] }>(`/api/v1/organizations/${orgId}/github/link`);
    return response.data.data;
  },

  /**
   * Link a GitHub repository to the organization
   * @param orgId - Organization ID
   * @param repoName - Repository name (owner/repo)
   * @returns Linked repository details
   */
  linkRepo: async (orgId: string, repoName: string) => {
    const response = await apiClient.post<{ data: GitHubRepo }>(`/api/v1/organizations/${orgId}/github/link`, {
      repo_name: repoName,
    });
    return response.data.data;
  },

  /**
   * List available GitHub repositories
   * @param orgId - Organization ID
   * @returns List of available repositories
   */
  listRepos: async (orgId: string) => {
    const response = await apiClient.get<{ data: GitHubRepoRaw[] }>(`/api/v1/organizations/${orgId}/github/repos`);
    return response.data.data;
  },

  /**
   * Initiate GitHub OAuth login flow
   * @param orgId - Organization ID
   */
  login: async (orgId: string) => {
    // Fetch login URL from backend
    const response = await apiClient.get<{ data: { url: string } }>(
      `/api/v1/organizations/${orgId}/github/login?org_id=${orgId}`,
    );
    // Redirect to GitHub OAuth
    globalThis.location.href = response.data.data.url;
  },

  /**
   * Unlink a GitHub repository from the organization
   * @param orgId - Organization ID
   * @param repoName - Repository name to unlink
   */
  unlinkRepo: async (orgId: string, repoName: string) => {
    await apiClient.delete(`/api/v1/organizations/${orgId}/github/link`, {
      data: { repo_name: repoName },
    });
  },
};
