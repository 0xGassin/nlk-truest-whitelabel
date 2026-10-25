"use client";

import type { CloudResource } from "@/types";

import { useCallback, useEffect, useState } from "react";

import { parseApiError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { inventoryService } from "@/services/api";

export function useResources(organizationId: string, connectionId: string, hideDefault = true) {
  const [resources, setResources] = useState<CloudResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<null | string>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchResources = useCallback(async () => {
    if (!organizationId || !connectionId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch all resources (API returns up to 200 per page)
      let allResources: CloudResource[] = [];
      let currentPage = 1;
      let hasMore = true;
      const batchSize = 200;

      while (hasMore) {
        const data = await inventoryService.getCloudResources(
          organizationId,
          connectionId,
          currentPage,
          batchSize,
          hideDefault,
        );

        allResources = [...allResources, ...data.resources];
        setTotalCount(data.total_count);

        hasMore = data.resources.length === batchSize && allResources.length < (data.total_count || 0);
        currentPage++;

        // Safety limit - max 10 pages (2000 resources)
        if (currentPage > 10) break;
      }

      setResources(allResources);
    } catch (error_: unknown) {
      logger.error("Error fetching resources", error_);
      const apiError = parseApiError(error_);
      setError(apiError.message);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, connectionId, hideDefault]);

  useEffect(() => {
    void fetchResources();
  }, [fetchResources]);

  const runScan = async () => {
    try {
      setError(null);
      await inventoryService.runInventoryScan(organizationId, connectionId);
      await fetchResources();
    } catch (error_: unknown) {
      logger.error("Error running inventory scan", error_);
      const apiError = parseApiError(error_);
      setError(apiError.message);
    }
  };

  return {
    error,
    fetchResources,
    hasNextPage: false,
    isLoading,
    page,
    resources,
    runScan,
    setPage,
    totalCount,
  };
}
