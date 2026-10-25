import type { RepoWithHealth } from "../components/columns";
import type { GitHubRepo } from "@/services/api/github";

import { useCallback, useEffect, useState } from "react";

import { toast } from "@/components/ui/toast/toast";
import { logger } from "@/lib/logger";
import { githubApi } from "@/services/api/github";
import { integrationApi } from "@/services/api/integration";

function getHttpStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("response" in error)) {
    return undefined;
  }
  return (error as { response?: { status?: number } }).response?.status;
}

export function useRepositories(organizationId?: string) {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [repos, setRepos] = useState<RepoWithHealth[]>([]);
  const [scanningRepos, setScanningRepos] = useState<Set<string>>(() => new Set());

  const fetchData = useCallback(async () => {
    if (!organizationId) return;
    try {
      const [linkedRepos, healthSummary] = await Promise.all([
        githubApi.getLinkedRepos(organizationId),
        integrationApi.getRepoHealthSummary(organizationId),
      ]);

      const healthMap = new Map(healthSummary.map((h) => [h.repo_id, h]));

      const reposWithHealth = linkedRepos.map((repo) => {
        const health = healthMap.get(repo.id);
        if (health) {
          return {
            ...repo,
            critical_count: health.critical_count,
            dependency_count: health.dependency_issue_count,
            grouped_critical_count: health.grouped_critical_count,
            grouped_high_count: health.grouped_high_count,
            grouped_issue_count: health.grouped_issue_count,
            grouped_low_count: health.grouped_low_count,
            grouped_medium_count: health.grouped_medium_count,
            high_count: health.high_count,
            ignored_count: health.ignored_count,
            last_scan: health.last_scan_at,
            low_count: health.low_count,
            medium_count: health.medium_count,
            scan_progress: health.scan_progress ?? repo.scan_progress,
            scan_status_msg: health.scan_status_msg ?? repo.scan_status_msg,
            secret_count: health.secret_issue_count,
            security_issue_count: health.security_issue_count,
          };
        }
        return repo;
      });

      setRepos(reposWithHealth);
    } catch (error) {
      toast.error("Failed to fetch repositories", {
        description: "There was an error loading your linked repositories.",
      });
      logger.error("Failed to fetch repositories", error);
    } finally {
      setIsInitialLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    if (!organizationId) {
      setIsInitialLoading(false);
      setRepos([]);
      return;
    }
    void fetchData();
  }, [organizationId, fetchData]);

  const triggerScan = async (repo: GitHubRepo, options?: { silentSuccessToast?: boolean }) => {
    if (!organizationId) return;
    setScanningRepos((prev) => new Set(prev).add(repo.id));

    try {
      await integrationApi.triggerSecurityScan(organizationId, repo.id);
      if (!options?.silentSuccessToast) {
        toast.success("Security scan started", {
          description: "Progress will update while the scanner runs.",
        });
      }
    } catch (error: unknown) {
      setScanningRepos((prev) => {
        const next = new Set(prev);
        next.delete(repo.id);
        return next;
      });
      if (getHttpStatus(error) !== 403) {
        toast.error("Failed to trigger scan", {
          description: "We could not start the security scan for this repository.",
        });
      }
      logger.error("Failed to trigger scan", error);
      throw error;
    }
  };

  const handleUnlink = async (repo: GitHubRepo) => {
    if (!organizationId) return;

    if (
      !confirm(`Are you sure you want to unlink ${repo.full_name}? This will remove all scan data for this repository.`)
    ) {
      return;
    }

    try {
      await githubApi.unlinkRepo(organizationId, repo.full_name);
      toast.success("Repository unlinked", {
        description: `${repo.full_name} has been unlinked`,
      });
      void fetchData();
    } catch (error) {
      toast.error("Failed to unlink repository", {
        description: "There was an error removing the link to this repository.",
      });
      logger.error("Failed to unlink repository", error);
    }
  };

  return {
    handleUnlink,
    isLoading: isInitialLoading,
    refresh: fetchData,
    repos,
    scanningRepos,
    triggerScan,
  };
}
