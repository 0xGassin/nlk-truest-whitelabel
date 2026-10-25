import type { ServerResponse } from "@/types";
import type { AxiosError } from "axios";

/**
 * Typed API Error for better error handling across the application
 */
export interface ApiErrorResponse {
  error?: string;
  message?: string;
  status?: number;
}

/**
 * Type guard to check if error is an Axios error
 */
export function isAxiosError(error: unknown): error is AxiosError<ServerResponse> {
  return typeof error === "object" && error !== null && "isAxiosError" in error && (error as AxiosError).isAxiosError;
}

/**
 * Extract error message from various error types
 */
export function extractErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const response = error.response?.data;
    return (response?.message ?? response?.error ?? error.message) || "An unexpected error occurred";
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "An unexpected error occurred";
}

/**
 * Extract status code from error
 */
export function extractErrorStatus(error: unknown): number | undefined {
  if (isAxiosError(error)) {
    return error.response?.status;
  }
  return undefined;
}

/**
 * Type for security issue severity levels
 */
export type Severity = "critical" | "error" | "high" | "info" | "low" | "medium" | "warning";

/**
 * Base security issue interface for filtering
 */
export interface BaseSeverityItem {
  severity: string;
}

/**
 * Filter items by severity with type safety
 */
export function filterBySeverity<T extends BaseSeverityItem>(items: T[], severity: Severity): T[] {
  return items.filter((item) => item.severity === severity);
}

/**
 * Count items by severity
 */
export function countBySeverity(items: BaseSeverityItem[], severity: Severity): number {
  return filterBySeverity(items, severity).length;
}

/**
 * Container scan params interface
 */
export interface ContainerScanParams {
  connection_id?: string;
  image_ref: string;
}

/**
 * Container query params interface
 */
export interface ContainerQueryParams {
  connection_id?: string;
  limit: number;
  offset: number;
}

/**
 * GitHub repository from API (raw)
 */
export interface GitHubRepoRaw {
  archived: boolean;
  default_branch: string;
  description: null | string;
  full_name: string;
  html_url: string;
  id: number;
  name: string;
  owner: {
    avatar_url: string;
    login: string;
  };
  private: boolean;
}
