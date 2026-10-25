import type { User } from "./auth";

export interface OrganizationLimits extends Record<string, unknown> {
  domains?: number | null;
}

export interface OrganizationManualRescanUsage {
  limit: number | null;
  used: number;
}

export interface Organization {
  auto_triage_enabled: boolean;
  created_at: string;
  id: string;
  limits?: OrganizationLimits;
  manual_rescans?: OrganizationManualRescanUsage;
  name: string;
  subscription: string;
  updated_at?: string;
}

export interface OrganizationMember {
  created_at: string;
  id: string;
  joined_at: string;
  organization?: Organization;
  organization_id: string;
  role: string;
  updated_at: string;
  user?: User;
  user_id: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  subscription?: string;
}
