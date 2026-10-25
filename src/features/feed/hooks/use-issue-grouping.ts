import type { UnifiedIssue } from "@/services/api/feed";

import { useMemo } from "react";

import { scaPkgName } from "@/lib/sca-display";

export interface FeedIssueGroup {
  created_at: string;
  highest_severity: string;
  id: string;
  installed_version?: string;
  issue_count: number;
  issues: UnifiedIssue[];
  location: string;
  name: string;
  pkg_name?: string;
  resource_id?: string;
  resource_name?: string;
  source: string;
  status: string;
  status_label?: string;
  subtitle?: string;
  type: string;
}

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

export const SEVERITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, LOW: 3, MEDIUM: 2 };

/**
 * Pure function that computes grouping + stats from a list of issues.
 * Can be called outside of React (e.g. in an async callback).
 */
export function computeIssueGrouping(issues: UnifiedIssue[]): {
  groupedIssues: (FeedIssueGroup | UnifiedIssue)[];
  groupedStats: GroupedStats;
} {
  const groups = new Map<string, FeedIssueGroup>();
  const others: UnifiedIssue[] = [];

  issues.forEach((issue) => {
    let key = "";
    let isGroupable = false;
    const packageName = issue.pkg_name ?? (issue.source === "Dependencies" ? scaPkgName(issue) : undefined);

    // Group package-based issues (containers and repo dependencies) by package + resource
    if (packageName && issue.resource_id) {
      key = `${packageName}::${issue.resource_id}`;
      isGroupable = true;
    }
    // Group IaC/SAST Issues (by Rule Name + Resource)
    else if ((issue.source === "IaC" || issue.source === "SAST") && issue.name && issue.resource_id) {
      key = `${issue.name}::${issue.resource_id}`;
      isGroupable = true;
    }

    if (isGroupable) {
      const existing = groups.get(key);

      if (existing) {
        existing.issues.push(issue);
        existing.issue_count++;
        const newSev = (issue.severity || "LOW").toUpperCase();
        const existingSev = (existing.highest_severity || "LOW").toUpperCase();
        if ((SEVERITY_ORDER[newSev] ?? 4) < (SEVERITY_ORDER[existingSev] ?? 4)) {
          existing.highest_severity = issue.severity;
        }
        // Keep the most recent created_at
        if (new Date(issue.created_at) > new Date(existing.created_at)) {
          existing.created_at = issue.created_at;
        }
      } else {
        let groupName = issue.name;
        if (packageName) {
          groupName = packageName;
        } else if (issue.source === "IaC" || issue.source === "SAST") {
          const description = issue.description ?? issue.title ?? issue.name;
          const firstSentence = description.split(/[.\n](?:\s|$)/)[0];
          groupName = firstSentence.trim();
        }

        groups.set(key, {
          created_at: issue.created_at,
          highest_severity: issue.severity,
          id: key,
          installed_version: issue.installed_version,
          issue_count: 1,
          issues: [issue],
          location: issue.location,
          name: groupName,
          pkg_name: packageName,
          resource_id: issue.resource_id,
          resource_name: issue.resource_name,
          source: issue.source,
          status: issue.status,
          status_label: issue.status_label,
          type: issue.type,
        });
      }
    } else {
      others.push(issue);
    }
  });

  groups.forEach((group) => {
    if (group.pkg_name) {
      const version = group.installed_version ? ` v${group.installed_version}` : "";
      const resourceLabel = group.resource_name ?? (group.source === "Dependencies" ? "repository" : "package");
      group.subtitle = `${String(group.issue_count)} vulnerabilities in ${resourceLabel}${version}`;
    } else if (group.source === "IaC" || group.source === "SAST") {
      const filenames = [
        ...new Set(
          group.issues.map((i) => {
            const pathParts = i.location.split(":")[0].split("/");
            return pathParts.at(-1);
          }),
        ),
      ];

      filenames.sort();

      const maxFiles = 3;
      let subtitle = "in " + filenames.slice(0, maxFiles).join(", ");
      if (filenames.length > maxFiles) {
        subtitle += ` and ${String(filenames.length - maxFiles)} more`;
      }
      group.subtitle = subtitle;
    }
  });

  const sortedGroups = [...groups.values()];
  const groupedIssues = [...sortedGroups, ...others];

  // Calculate stats
  const allItems = [...sortedGroups, ...others.map((i) => ({ highest_severity: i.severity }))];
  const sevCounts = {
    critical: 0,
    high: 0,
    low: 0,
    medium: 0,
  };

  allItems.forEach((g) => {
    const s = g.highest_severity.toLowerCase() as keyof typeof sevCounts;
    sevCounts[s]++;
  });

  // Count grouped manual vs auto-ignored
  // A group is "auto_ignored" if any of its issues has status "auto_ignored"
  let autoCount = 0;
  let manualCount = 0;
  sortedGroups.forEach((g) => {
    const hasAutoIgnored = g.issues.some((i) => i.status === "auto_ignored");
    if (hasAutoIgnored) autoCount++;
    else if (g.issues.some((i) => i.status === "ignored")) manualCount++;
  });
  others.forEach((i) => {
    if (i.status === "auto_ignored") autoCount++;
    else if (i.status === "ignored") manualCount++;
  });

  const groupedStats: GroupedStats = {
    autoCount,
    manualCount,
    severity: sevCounts,
    total: allItems.length,
  };

  return { groupedIssues, groupedStats };
}

export function useIssueGrouping(issues: UnifiedIssue[], enabled: boolean) {
  return useMemo(() => {
    if (!Array.isArray(issues) || issues.length === 0) {
      return { groupedIssues: [], groupedStats: undefined };
    }

    if (!enabled) {
      return { groupedIssues: issues, groupedStats: undefined };
    }

    return computeIssueGrouping(issues);
  }, [issues, enabled]);
}
