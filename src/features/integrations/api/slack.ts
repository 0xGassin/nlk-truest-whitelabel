import type { ServerResponse } from "@/types";

import { apiClient } from "@/services/api";

export interface SlackChannel {
  id: string;
  name: string;
  private: boolean;
}

export interface SlackConnectionStatus {
  channel_id?: string;
  channel_name?: string;
  connected: boolean;
  team_id?: string;
  team_name?: string;
}

export interface SlackNotificationRule {
  enabled: boolean;
  organization_id?: string;
  severity: string;
  source: string;
}

export interface SlackRulesResponse {
  rules: SlackNotificationRule[];
}

const buildPath = (orgId: string, path = "") => `/api/v1/organizations/${orgId}/slack${path}`;

export const slackApi = {
  connect: async (orgId: string): Promise<string> => {
    const response = await apiClient.post<ServerResponse<{ redirect_url: string }>>(buildPath(orgId, "/connect"));
    return response.data.data?.redirect_url ?? "";
  },

  disconnect: async (orgId: string): Promise<void> => {
    await apiClient.delete(buildPath(orgId));
  },

  getChannels: async (orgId: string): Promise<SlackChannel[]> => {
    const response = await apiClient.get<ServerResponse<{ channels: SlackChannel[] }>>(buildPath(orgId, "/channels"));
    return response.data.data?.channels ?? [];
  },

  getRules: async (orgId: string): Promise<SlackNotificationRule[]> => {
    const response = await apiClient.get<ServerResponse<SlackRulesResponse>>(buildPath(orgId, "/rules"));
    return response.data.data?.rules ?? [];
  },

  setChannel: async (orgId: string, channelId: string, channelName: string): Promise<void> => {
    await apiClient.post(buildPath(orgId, "/channel"), {
      channel_id: channelId,
      channel_name: channelName,
    });
  },

  updateRules: async (orgId: string, rules: SlackNotificationRule[]): Promise<void> => {
    await apiClient.put(buildPath(orgId, "/rules"), {
      rules: rules.map(({ enabled, severity, source }) => ({ enabled, severity, source })),
    });
  },

  verify: async (orgId: string): Promise<SlackConnectionStatus> => {
    const response = await apiClient.get<ServerResponse<SlackConnectionStatus>>(buildPath(orgId, "/verify"));
    return response.data.data ?? { connected: false };
  },
};
