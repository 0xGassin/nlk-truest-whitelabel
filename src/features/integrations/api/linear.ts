import type { ServerResponse } from "@/types";

import { ensureData } from "@/lib/errors";
import { apiClient } from "@/services/api";

interface LinearConnectResponse {
  redirect_url: string;
}

interface LinearTeamResponse {
  team_id: string;
}

interface LinearTeamsResponse {
  data: {
    teams: {
      nodes: { id: string; key: string; name: string }[];
    };
  };
}

interface LinearTeamUpdateResponse {
  data: Record<string, unknown>;
}

interface LinearVerifyResponse {
  connected: boolean;
}

export interface CreateLinearIssuePayload {
  description?: string;
  finding_id: string;
  severity?: string;
  source?: string;
  title: string;
  url?: string;
}

export interface CreateLinearIssueResponse {
  identifier: string;
  issue_id: string;
  title: string;
  url: string;
}

/**
 * Linear.app issue tracking integration API service
 * Handles authentication and issue creation in Linear
 */
export const linearApi = {
  connectionLink: async (): Promise<string> => {
    const response = await apiClient.post<ServerResponse<LinearConnectResponse>>(`/api/v1/integrations/linear/connect`);
    return response.data.data?.redirect_url ?? "";
  },

  createIssueFromFinding: async (payload: CreateLinearIssuePayload): Promise<CreateLinearIssueResponse> => {
    const response = await apiClient.post<ServerResponse<CreateLinearIssueResponse>>(
      `/api/v1/integrations/linear/issue`,
      payload,
    );
    return ensureData(response.data.data, "Linear issue creation returned no data");
  },

  getCurrentTeam: async (): Promise<string> => {
    const response = await apiClient.get<ServerResponse<LinearTeamResponse>>(`/api/v1/integrations/linear/team`);
    return response.data.data?.team_id ?? "";
  },

  getTeams: async (): Promise<{ id: string; key: string; name: string }[]> => {
    const response = await apiClient.get<LinearTeamsResponse>(`/api/v1/integrations/linear/teams`);
    return response.data.data.teams.nodes;
  },

  setTeamId: async (teamId: string): Promise<Record<string, unknown>> => {
    const response = await apiClient.post<ServerResponse<LinearTeamUpdateResponse>>(
      `/api/v1/integrations/linear/team`,
      {
        team_id: teamId,
      },
    );
    return response.data.data as unknown as Record<string, unknown>;
  },

  verifyConnection: async (): Promise<boolean> => {
    const response = await apiClient.get<ServerResponse<LinearVerifyResponse>>(`/api/v1/integrations/linear/verify`);
    return response.data.data?.connected ?? false;
  },
};
