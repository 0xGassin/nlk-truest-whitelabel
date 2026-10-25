import type { ServerResponse } from "@/types";

import { ensureData } from "@/lib/errors";
import { apiClient } from "@/services/api";

export interface GCPServiceAccountKeyResponse {
  key_type: string;
  project_id: string;
  service_account_key: string;
}

export interface ValidateServiceAccountRequest {
  connection_name: string;
  connection_purpose?: string;
  project_id: string;
  project_number: string;
  region?: string;
  service_account_key: string;
}

export interface ValidateServiceAccountResponse {
  connection_id: string;
  connection_name: string;
  organization_id: string;
  project_id: string;
  project_number: string;
  provider: string;
  region: string;
  status: string;
  validated_by: string;
}

/**
 * Validate and create GCP connection with service account key
 */
export const validateServiceAccount = async (
  organizationId: string,
  data: ValidateServiceAccountRequest,
): Promise<ValidateServiceAccountResponse> => {
  const response = await apiClient.post<ServerResponse<ValidateServiceAccountResponse>>(
    `/api/v1/organizations/${organizationId}/gcp/validate-service-account`,
    data,
  );

  return ensureData(response.data.data, "Failed to validate GCP service account");
};

interface ServiceAccountKey {
  [key: string]: unknown;
  auth_uri?: string;
  client_email?: string;
  client_id?: string;
  private_key?: string;
  private_key_id?: string;
  project_id?: string;
  project_number?: string;
  token_uri?: string;
  type?: string;
}

/**
 * Extract project ID from service account key JSON
 */
export const extractProjectIdFromKey = (serviceAccountKey: string): null | string => {
  try {
    const parsed = JSON.parse(serviceAccountKey) as ServiceAccountKey;
    return parsed.project_id ?? null;
  } catch {
    return null;
  }
};

/**
 * Extract project number from service account key JSON
 */
export const extractProjectNumberFromKey = (serviceAccountKey: string): null | string => {
  try {
    const parsed = JSON.parse(serviceAccountKey) as ServiceAccountKey;
    return parsed.project_number ?? null;
  } catch {
    return null;
  }
};

/**
 * Validate service account key format
 */
export const validateServiceAccountKeyFormat = (serviceAccountKey: string): boolean => {
  try {
    const parsed = JSON.parse(serviceAccountKey) as ServiceAccountKey;

    const requiredFields = [
      "type",
      "project_id",
      "private_key_id",
      "private_key",
      "client_email",
      "client_id",
      "auth_uri",
      "token_uri",
    ];
    return requiredFields.every((field) => field in parsed);
  } catch {
    return false;
  }
};
