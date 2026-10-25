import { apiClient } from "./client";

/**
 * Aggregated security issue statistics for the organization
 */
export interface FeedStats {
  active_issues: number;
  auto_ignored: number;
  grouped_stats?: GroupedStats;
  ignored_issues: number;
  new_issues: number;
  open_issues: number;
  severity_breakdown: {
    critical: number;
    high: number;
    low: number;
    medium: number;
  };
  solved_issues: number;
}

/**
 * Grouped statistics aggregated across all scanners
 */
export interface GroupedStats {
  autoCount: number;
  manualCount: number;
  severity: {
    critical: number;
    high: number;
    low: number;
    medium: number;
  };
  total: number;
}

/**
 * Security issue from any scanner (Container, CSPM, IaC, etc.)
 */
export interface Issue {
  contextual_description?: string;
  created_at: string;
  cvss?: number;
  description?: string;
  fixed_version?: string;
  id: string;
  installed_version?: string;
  location: string;
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  original_issue?: any;
  pkg_name?: string;
  references?: string[];
  remediation?: string;
  resource_id?: string;
  resource_ids?: string[];
  resource_name?: string;
  scan_id: string;
  scanner_title: string;
  severity: string;
  source: string;
  status: string;
  status_label: string;
  title?: string;
  triage_reason?: string;
  triage_status?: string;
  type: string;
  updated_at: string;
  vuln_title?: string;
}

// Alias for compatibility
export type UnifiedIssue = Issue;

/**
 * Activity feed API service
 * Handles retrieval of security issues and statistics across all scanners
 */
export const feedService = {
  /**
   * Get security issues from all scanners
   * @param filters - Optional filters for status and resource
   * @returns Array of security issues
   */
  getIssues: async (filters: { resource_id?: string; status?: string } = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.resource_id) params.append("resource_id", filters.resource_id);
    const response = await apiClient.get<{ data: Issue[] }>(`/api/v1/feed/issues?${params}`);
    return response.data.data ?? [];
  },

  /**
   * Get aggregated feed statistics
   * @returns Feed statistics including issue counts and severity breakdown
   */
  getStats: async () => {
    const response = await apiClient.get<{ data: FeedStats }>("/api/v1/feed/stats");
    return response.data.data;
  },
};
