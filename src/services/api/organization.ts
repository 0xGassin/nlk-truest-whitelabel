import type {
  Organization,
  OrganizationLimits,
  OrganizationMember,
  OrganizationManualRescanUsage,
  ServerResponse,
  UpdateOrganizationRequest,
} from "@/types";

import { ensureData } from "@/lib/errors";

import { apiClient } from "./client";

/**
 * Get organization by ID
 *
 * @param orgId - Organization ID
 * @returns Organization data
 * @throws {ApiError} If organization not found or access denied
 *
 * @example
 * ```typescript
 * const org = await organizationService.getOrganization('org-123');
 * ```
 */
export const getOrganization = async (orgId: string): Promise<Organization> => {
  const response = await apiClient.get<
    ServerResponse<
      | {
          assets?: unknown;
          limits?: OrganizationLimits;
          manual_rescans?: OrganizationManualRescanUsage;
          organization: Organization;
        }
      | Organization
    >
  >(`/api/v1/organizations/${orgId}`);
  const data = ensureData(response.data.data, "Organization not found");

  if (!("organization" in data)) return data;

  return {
    ...data.organization,
    ...(data.limits === undefined ? {} : { limits: data.limits }),
    ...(data.manual_rescans === undefined ? {} : { manual_rescans: data.manual_rescans }),
  };
};

/**
 * Update organization
 */
export const updateOrganization = async (orgId: string, data: UpdateOrganizationRequest): Promise<Organization> => {
  const response = await apiClient.put<ServerResponse<Organization>>(`/api/v1/organizations/${orgId}`, data);
  return ensureData(response.data.data, "Failed to update organization");
};

/**
 * Delete organization
 */
export const deleteOrganization = async (orgId: string): Promise<void> => {
  await apiClient.delete(`/api/v1/organizations/${orgId}`);
};

/**
 * Get organization members
 */
export const getOrganizationMembers = async (orgId: string): Promise<OrganizationMember[]> => {
  const response = await apiClient.get<ServerResponse<OrganizationMember[]>>(`/api/v1/organizations/${orgId}/members`);
  return response.data.data ?? [];
};

/**
 * Remove a member from the organization
 */
export const removeMember = async (orgId: string, userId: string): Promise<void> => {
  await apiClient.delete(`/api/v1/organizations/${orgId}/members/${userId}`);
};

/**
 * Transfer organization ownership
 */
export const transferOwnership = async (orgId: string, newOwnerId: string): Promise<void> => {
  await apiClient.post(`/api/v1/organizations/${orgId}/transfer-ownership`, {
    new_owner_id: newOwnerId,
  });
};

/**
 * Update a member's role
 */
export const updateMemberRole = async (orgId: string, userId: string, role: string): Promise<void> => {
  await apiClient.put(`/api/v1/organizations/${orgId}/members/${userId}/role`, {
    role,
  });
};

/**
 * Leave the organization
 */
/**
 * Leave the organization
 *
 * Removes the current user from the specified organization.
 *
 * @param orgId - Organization ID to leave
 * @throws {ApiError} If leaving fails (unauthorized, not a member, etc.)
 *
 * @example
 * ```typescript
 * await organizationService.leaveOrganization('org-123');
 * ```
 */
export const leaveOrganization = async (orgId: string): Promise<void> => {
  await apiClient.post(`/api/v1/organizations/${orgId}/leave`);
};

/**
 * Toggle auto-triage setting
 */
export const toggleAutoTriage = async (enabled: boolean): Promise<{ message: string }> => {
  const response = await apiClient.patch<ServerResponse<{ message: string }>>("/api/v1/organizations/settings", {
    enabled,
  });
  return response.data.data ?? { message: response.data.message ?? "Auto-triage setting updated" };
};
