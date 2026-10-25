import type { ServerResponse } from "@/types";

import { apiClient } from "./client";

export interface Feedback {
  body: string;
  created_at: string;
  entity_id?: string;
  entity_type?: string;
  feedback_type: "ai_insight" | "product";
  id: string;
  mood?: "happy" | "neutral" | "sad";
  organization_id: string;
  rating?: -1 | 1;
  topic?: string;
  user_id: string;
}

const buildOrgPath = (orgId: string, path = "") =>
  `/api/v1/organizations/${orgId}${path}`;

export const feedbackService = {
  getEntityFeedback: async (
    organizationId: string,
    entityType: string,
    entityId: string,
  ): Promise<Feedback[]> => {
    const response = await apiClient.get<ServerResponse<Feedback[]>>(
      buildOrgPath(organizationId, `/feedback/${entityType}/${entityId}`),
    );
    return response.data.data ?? [];
  },

  getUserAIInsightFeedback: async (
    organizationId: string,
    entityType: string,
    entityId: string,
  ): Promise<Feedback | null> => {
    const params = new URLSearchParams({ entity_id: entityId, entity_type: entityType });
    const response = await apiClient.get<ServerResponse<Feedback | null>>(
      buildOrgPath(organizationId, `/feedback/ai-insight?${params}`),
    );
    return response.data.data ?? null;
  },

  submitAIInsightFeedback: async (
    organizationId: string,
    entityType: string,
    entityId: string,
    rating: -1 | 1,
  ): Promise<Feedback> => {
    const response = await apiClient.post<ServerResponse<Feedback>>(
      buildOrgPath(organizationId, "/feedback/ai-insight"),
      { entity_id: entityId, entity_type: entityType, rating },
    );
    return response.data.data!;
  },

  submitProductFeedback: async (
    organizationId: string,
    topic: string,
    body: string,
    mood: "happy" | "neutral" | "sad",
  ): Promise<Feedback> => {
    const response = await apiClient.post<ServerResponse<Feedback>>(
      buildOrgPath(organizationId, "/feedback/product"),
      { body, mood, topic },
    );
    return response.data.data!;
  },
};
