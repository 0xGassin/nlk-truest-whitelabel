"use client";

import type { FeedIssueGroup, GroupedStats } from "../hooks/use-issue-grouping";
import type { FeedStats, UnifiedIssue } from "@/services/api/feed";

import { useCallback, useEffect, useRef, useState } from "react";

import { State } from "@/components/state";
import { useAuth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { getOrganizationId } from "@/lib/organization";
import { feedService } from "@/services/api/feed";

import { computeIssueGrouping, useIssueGrouping } from "../hooks/use-issue-grouping";
import { FeedIssuesTable } from "./feed-issues-table";
import { FeedStatsCards } from "./feed-stats-cards";

export function FeedDashboard() {
  const { user } = useAuth();
  const organizationId = getOrganizationId(user);
  const [stats, setStats] = useState<FeedStats | null>(null);
  const [issues, setIssues] = useState<UnifiedIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<null | string>(null);
  const [activeTab, setActiveTab] = useState("active");
  const [groupByPackage, setGroupByPackage] = useState(true);
  const isInitialMountRef = useRef(true);

  const issuesTabRef = useRef("active");

  const { groupedIssues, groupedStats } = useIssueGrouping(issues, groupByPackage);

  const [cachedStatsByTab, setCachedStatsByTab] = useState<Record<string, GroupedStats>>({});
  const [activeIssuesForTrend, setActiveIssuesForTrend] = useState<(FeedIssueGroup | UnifiedIssue)[]>([]);

  useEffect(() => {
    if (groupedStats && issuesTabRef.current === activeTab) {
      setCachedStatsByTab((prev) => ({ ...prev, [activeTab]: groupedStats }));
    }
  }, [activeTab, groupedStats]);

  const loadTabIssues = useCallback(
    async (tab: string) => {
      if (!organizationId) {
        setStats(null);
        setIssues([]);
        setError(null);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const [s, i] = await Promise.all([feedService.getStats(), feedService.getIssues({ status: tab })]);
        setStats(s);
        issuesTabRef.current = tab;
        setIssues(i);
        if (tab === "active") {
          setActiveIssuesForTrend(computeIssueGrouping(i).groupedIssues);
        }
      } catch (error_) {
        logger.error("Failed to load feed", { error: error_ });
        setError(error_ instanceof Error ? error_.message : "Failed to load feed");
      } finally {
        setIsLoading(false);
      }
    },
    [organizationId],
  );

  useEffect(() => {
    if (!organizationId) {
      setStats(null);
      setIssues([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    async function init() {
      setIsLoading(true);
      setError(null);
      try {
        const [s, activeIssues, ignoredIssues, solvedIssues] = await Promise.all([
          feedService.getStats(),
          feedService.getIssues({ status: "active" }),
          feedService.getIssues({ status: "ignored" }),
          feedService.getIssues({ status: "solved" }),
        ]);

        setStats(s);
        issuesTabRef.current = "active";
        setIssues(activeIssues);
        setActiveIssuesForTrend(computeIssueGrouping(activeIssues).groupedIssues);

        const activeGrouped = computeIssueGrouping(activeIssues);
        const ignoredGrouped = computeIssueGrouping(ignoredIssues);
        const solvedGrouped = computeIssueGrouping(solvedIssues);

        setCachedStatsByTab({
          active: activeGrouped.groupedStats,
          ignored: ignoredGrouped.groupedStats,
          solved: solvedGrouped.groupedStats,
        });
      } catch (error_) {
        logger.error("Failed to load feed", { error: error_ });
        setError(error_ instanceof Error ? error_.message : "Failed to load feed");
      } finally {
        setIsLoading(false);
      }
    }
    void init();
  }, [organizationId]);

  useEffect(() => {
    if (!organizationId) return;
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    void loadTabIssues(activeTab);
  }, [activeTab, loadTabIssues, organizationId]);

  if (!organizationId) {
    return <State.Empty preset="noOrganization" />;
  }

  if (isLoading && !stats) {
    return <State.Loading />;
  }

  if (error && !stats) {
    return (
      <State.Error
        description={error}
        onRetry={() => {
          void loadTabIssues(activeTab);
        }}
        title="Failed to load feed"
      />
    );
  }

  const hasIssuesToDisplay =
    stats != null && stats.active_issues + stats.ignored_issues + stats.auto_ignored + stats.solved_issues > 0;

  if (!hasIssuesToDisplay) {
    return <State.Empty preset="noIssues" />;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        <div className="shrink-0">
          <FeedStatsCards groupedStats={cachedStatsByTab.active} issuesOverTime={activeIssuesForTrend} stats={stats} />
        </div>

        <div className="min-h-0 flex-1">
          <FeedIssuesTable
            groupByPackage={groupByPackage}
            isLoading={isLoading}
            issues={groupedIssues}
            onGroupByPackageChange={setGroupByPackage}
            onRefresh={() => {
              void loadTabIssues(activeTab);
            }}
            onStatusChange={setActiveTab}
            stats={{
              active_issues: stats.active_issues,
              ignored_issues: stats.ignored_issues,
              solved_issues: stats.solved_issues,
            }}
            status={activeTab}
          />
        </div>
      </div>
    </div>
  );
}
