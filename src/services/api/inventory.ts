import type { CloudResource, CloudResourcesResponse, HistoryItem, ServerResponse } from "@/types";

import { ensureData } from "@/lib/errors";

import { apiClient } from "./client";

/** Response type for paginated resources API */
interface ResourcesApiResponse {
  resources: CloudResource[];
  total?: number;
  total_count?: number;
}

/** Type guard to check if response is a ResourcesApiResponse object */
function isResourcesApiResponse(data: unknown): data is ResourcesApiResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    "resources" in data &&
    Array.isArray((data as ResourcesApiResponse).resources)
  );
}

/**
 * Get all cloud resources for a connection
 */
export const getCloudResources = async (
  organizationId: string,
  connectionId: string,
  page = 1,
  pageSize = 50,
  hideDefault = true,
): Promise<CloudResourcesResponse> => {
  const response = await apiClient.get<ServerResponse<CloudResource[] | ResourcesApiResponse>>(
    `/api/v1/organizations/${organizationId}/connections/${connectionId}/resources`,
    {
      params: {
        hide_default: hideDefault,
        limit: pageSize,
        page,
      },
    },
  );
  const data = response.data.data;

  if (!data) {
    return { resources: [], total_count: 0 };
  }

  if (Array.isArray(data)) {
    return { resources: data, total_count: data.length };
  }

  if (isResourcesApiResponse(data)) {
    const totalCount = data.total ?? data.total_count ?? data.resources.length;
    return {
      resources: data.resources,
      total_count: totalCount,
    };
  }

  return { resources: [], total_count: 0 };
};

/**
 * Get a single cloud resource by ID
 */
export const getCloudResourceById = async (
  organizationId: string,
  connectionId: string,
  resourceId: string,
): Promise<CloudResource> => {
  const response = await apiClient.get<ServerResponse<CloudResource>>(
    `/api/v1/organizations/${organizationId}/connections/${connectionId}/resources/${resourceId}`,
  );
  return ensureData(response.data.data, "Resource not found");
};

/**
 * Run an inventory scan for a connection
 */
export const runInventoryScan = async (organizationId: string, connectionId: string): Promise<void> => {
  await apiClient.post(`/api/v1/organizations/${organizationId}/connections/${connectionId}/inventory`);
};

/**
 * Get resource history
 */
export const getResourceHistory = async (
  organizationId: string,
  connectionId: string,
  resourceId: string,
): Promise<HistoryItem[]> => {
  const response = await apiClient.get<ServerResponse<HistoryItem[]>>(
    `/api/v1/organizations/${organizationId}/connections/${connectionId}/resources/${resourceId}/history`,
  );
  return ensureData(response.data.data, "Failed to fetch resource history");
};
