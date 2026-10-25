import type { ServerResponse } from "@/types";

import { ensureData } from "@/lib/errors";
import { apiClient } from "@/services/api";

export interface CloudFormationLaunchResponse {
  cloudformation_url: string;
  parameters: string;
  stack_name: string;
  template: string;
}

export interface ValidateRoleARNRequest {
  access_key_id?: string;
  connection_name: string;
  credential_type: "cloudformation" | "manual";
  region: string;
  role_arn?: string;
  secret_access_key?: string;
}

export interface ValidateRoleARNResponse {
  account_id: string;
  connection_id: string;
  connection_name: string;
  credential_type: string;
  external_id?: string;
  organization_id: string;
  provider: string;
  region: string;
  role_arn?: string;
  status: string;
  validated_by: string;
}

/**
 * Generate CloudFormation template and launch URL
 */
export const generateCloudFormationTemplate = async (organizationId: string): Promise<CloudFormationLaunchResponse> => {
  const response = await apiClient.post<ServerResponse<CloudFormationLaunchResponse>>(
    `/api/v1/organizations/${organizationId}/aws/cloudformation/generate`,
    {},
  );

  return ensureData(response.data.data, "Failed to generate CloudFormation template");
};
/**
 * Validate and create AWS connection with role ARN
 */
export const validateRoleARN = async (
  organizationId: string,
  data: ValidateRoleARNRequest,
): Promise<ValidateRoleARNResponse> => {
  const response = await apiClient.post<ServerResponse<ValidateRoleARNResponse>>(
    `/api/v1/organizations/${organizationId}/aws/validate-role`,
    data,
  );

  return ensureData(response.data.data, "Failed to validate AWS role");
};
/**
 * Extract account ID from AWS role ARN
 */
export const extractAccountIdFromArn = (arn: string): null | string => {
  if (!arn.startsWith("arn:aws:iam::")) {
    return null;
  }
  // ARN format: arn:aws:iam::ACCOUNT-ID:role/ROLE-NAME
  const parts = arn.split(":");
  if (parts.length >= 5) {
    return parts[4]; // Account ID is the 5th part (index 4)
  }
  return null;
};
