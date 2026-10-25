import { apiClient } from "./client";

/** A single GraphQL error returned by the server. */
export interface GraphQLError {
  extensions?: Record<string, unknown>;
  message: string;
  path?: (number | string)[];
}

/** Shape of the GraphQL execution response body. */
export interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: GraphQLError[];
}

export type GraphQLVariables = Record<string, unknown>;

/**
 * Executes a read-only GraphQL query against the org-scoped context-layer endpoint.
 * Reuses the shared axios client, so auth headers and token refresh are handled.
 * The GraphQL handler writes the execution result directly to the body, so no
 * ServerResponse unwrapping is needed.
 */
export const executeGraphQL = async <T = unknown>(
  organizationId: string,
  query: string,
  variables?: GraphQLVariables,
): Promise<GraphQLResponse<T>> => {
  const response = await apiClient.post<GraphQLResponse<T>>(`/api/v1/organizations/${organizationId}/graphql`, {
    query,
    variables: variables ?? {},
  });
  return response.data;
};
