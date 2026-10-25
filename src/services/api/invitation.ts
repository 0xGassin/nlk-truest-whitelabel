import type { AcceptInvitationRequest, InviteMemberRequest, OrganizationInvitation, ServerResponse } from "@/types";

import { ensureData } from "@/lib/errors";

import { apiClient } from "./client";

/**
 * Get incoming invitations for the current user
 */
export const getIncomingInvitations = async (): Promise<OrganizationInvitation[]> => {
  const response = await apiClient.get<ServerResponse<OrganizationInvitation[]>>("/api/v1/invitations/incoming");
  return response.data.data ?? [];
};

/**
 * Accept an organization invitation
 */
export const acceptInvitation = async (request: AcceptInvitationRequest): Promise<void> => {
  await apiClient.post<ServerResponse<void>>("/api/v1/invitations/accept", request);
};
/**
 * Accept an organization invitation by ID
 */
export const acceptInvitationByID = async (invitationId: string): Promise<void> => {
  await apiClient.post<ServerResponse<void>>(`/api/v1/invitations/${invitationId}/accept`);
};
/**
 * Invite a member to an organization
 */
export const inviteMember = async (orgId: string, request: InviteMemberRequest): Promise<OrganizationInvitation> => {
  const response = await apiClient.post<ServerResponse<OrganizationInvitation>>(
    `/api/v1/organizations/${orgId}/invitations`,
    request,
  );
  return ensureData(response.data.data, "Failed to send invitation");
};

/**
 * Get organization invitations (for organization admins)
 */
export const getOrganizationInvitations = async (orgId: string): Promise<OrganizationInvitation[]> => {
  const response = await apiClient.get<ServerResponse<OrganizationInvitation[]>>(
    `/api/v1/organizations/${orgId}/invitations`,
  );
  return response.data.data ?? [];
};

/**
 * Revoke an organization invitation
 */
export const revokeInvitation = async (orgId: string, invitationId: string): Promise<void> => {
  await apiClient.delete(`/api/v1/organizations/${orgId}/invitations/${invitationId}`);
};
