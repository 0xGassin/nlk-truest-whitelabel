import type { User } from "./auth";
import type { Organization } from "./organization";

export type InvitationStatus = "accepted" | "declined" | "expired" | "pending";
export type OrganizationRole = "admin" | "member" | "owner";

export interface OrganizationInvitation {
  created_at: string;
  created_by?: User;
  email: string;
  expires_at: string;
  id: string;
  organization?: Organization;
  role: OrganizationRole;
  status: InvitationStatus;
}

export interface InviteMemberRequest {
  email: string;
  role: OrganizationRole;
}

export interface AcceptInvitationRequest {
  token: string;
}
