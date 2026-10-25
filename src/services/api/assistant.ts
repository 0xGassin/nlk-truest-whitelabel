import type { ServerResponse } from "@/types";

import { ensureData } from "@/lib/errors";

import { apiClient } from "./client";

/** A conversation thread scoped to one user within one organization. */
export interface AssistantThread {
  created_at: string;
  id: string;
  organization_id: string;
  title: string;
  updated_at: string;
  user_id: string;
}

/** One step of the agent's reasoning while translating a prompt into GraphQL. */
export interface ThinkingStep {
  graphql_query?: string;
  purpose?: string;
  result?: unknown;
  step: string;
}

/** A single turn in a thread. Assistant messages carry agent metadata. */
export interface AssistantMessage {
  content: string;
  created_at: string;
  graphql_query?: string;
  graphql_result?: unknown;
  id: string;
  role: "assistant" | "user";
  thinking?: ThinkingStep[];
  thread_id: string;
}

/**
 * Creates a new assistant conversation thread for the organization.
 */
export const createThread = async (organizationId: string, title: string): Promise<AssistantThread> => {
  const response = await apiClient.post<ServerResponse<AssistantThread>>(
    `/api/v1/organizations/${organizationId}/assistant/threads`,
    { title },
  );
  return ensureData(response.data.data, "Failed to create conversation");
};

/**
 * Sends a user message to the assistant and returns the assistant's reply,
 * including its thinking steps, the generated GraphQL query, and the result.
 */
export const sendMessage = async (
  organizationId: string,
  threadId: string,
  content: string,
): Promise<AssistantMessage> => {
  const response = await apiClient.post<ServerResponse<AssistantMessage>>(
    `/api/v1/organizations/${organizationId}/assistant/threads/${threadId}/messages`,
    { content },
  );
  return ensureData(response.data.data, "Failed to process message");
};

/**
 * Lists the caller's conversations within the organization.
 */
export const listThreads = async (organizationId: string): Promise<AssistantThread[]> => {
  const response = await apiClient.get<ServerResponse<AssistantThread[]>>(
    `/api/v1/organizations/${organizationId}/assistant/threads`,
  );
  return ensureData(response.data.data, "Failed to list conversations");
};

/**
 * Returns the full message history of a thread.
 */
export const getMessages = async (organizationId: string, threadId: string): Promise<AssistantMessage[]> => {
  const response = await apiClient.get<ServerResponse<AssistantMessage[]>>(
    `/api/v1/organizations/${organizationId}/assistant/threads/${threadId}/messages`,
  );
  return ensureData(response.data.data, "Failed to retrieve messages");
};
