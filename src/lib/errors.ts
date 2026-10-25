import type { ServerResponse } from "@/types";
import type { AxiosError } from "axios";

/**
 * Custom API Error class for better error handling
 *
 * Extends the standard Error class with additional context
 * about HTTP status codes and response data.
 */
export class ApiError extends Error {
  /**
   * HTTP status code from the response
   */
  public readonly statusCode?: number;

  /**
   * Response data from the server
   */
  public readonly data?: unknown;

  /**
   * Machine-readable error code from the API response
   */
  public readonly code?: string;

  /**
   * Error details from the server response
   */
  public readonly error?: unknown;

  /**
   * Whether this is a network error (no response received)
   */
  public readonly isNetworkError: boolean;

  constructor(
    message: string,
    statusCode?: number,
    data?: unknown,
    error?: unknown,
    isNetworkError = false,
    code?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.data = data;
    this.error = error;
    this.isNetworkError = isNetworkError;
    this.code = code;

    Error.captureStackTrace(this, ApiError);
  }
}

/**
 * Parses an Axios error into an ApiError instance
 *
 * @param error - The error to parse (usually from axios)
 * @returns An ApiError instance with parsed information
 *
 * @example
 * ```typescript
 * try {
 *   await apiClient.get('/api/v1/users');
 * } catch (error) {
 *   const apiError = parseApiError(error);
 *   console.error(apiError.statusCode, apiError.message);
 * }
 * ```
 */
export function parseApiError(error: unknown): ApiError {
  // Handle Axios errors
  if (isAxiosError(error)) {
    const axiosError = error as AxiosError<ServerResponse>;
    const response = axiosError.response;
    const request: unknown = axiosError.request;

    // Network error (no response received)
    if (!response && request) {
      return new ApiError(
        "Network error. Please check your connection and try again.",
        undefined,
        undefined,
        undefined,
        true,
      );
    }

    // Server responded with error
    if (response) {
      const status = response.status;
      const serverResponse = response.data;
      const errorData = serverResponse.error;
      const message = serverResponse.message ?? getDefaultErrorMessage(status);

      return new ApiError(message, status, serverResponse.data, errorData, false, serverResponse.code);
    }
  }

  // Handle generic Error instances
  if (error instanceof Error) {
    return new ApiError(error.message);
  }

  // Handle unknown error types
  return new ApiError("An unexpected error occurred. Please try again later.");
}

/**
 * Type guard to check if an error is an Axios error
 */
function isAxiosError(error: unknown): error is AxiosError {
  return (
    typeof error === "object" &&
    error !== null &&
    ("isAxiosError" in error || "response" in error || "request" in error)
  );
}

/**
 * Gets a default error message based on HTTP status code
 */
function getDefaultErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return "Invalid request. Please check your input.";
    case 401:
      return "Authentication required. Please log in.";
    case 403:
      return "You do not have permission to perform this action.";
    case 404:
      return "The requested resource was not found.";
    case 409:
      return "A conflict occurred. The resource may already exist.";
    case 422:
      return "Validation failed. Please check your input.";
    case 429:
      return "Too many requests. Please try again later.";
    case 500:
      return "Internal server error. Please try again later.";
    case 502:
      return "Bad gateway. The server is temporarily unavailable.";
    case 503:
      return "Service unavailable. Please try again later.";
    default:
      return "An error occurred. Please try again.";
  }
}

/**
 * Checks if an error is an ApiError instance
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Safely extracts data from a server response, throwing an error if data is null/undefined.
 * Use this instead of non-null assertions (data!) to ensure runtime safety.
 *
 * @param data - The data from the server response
 * @param errorMessage - Custom error message if data is missing
 * @returns The data if it exists
 * @throws {ApiError} If data is null or undefined
 *
 * @example
 * ```typescript
 * const response = await apiClient.get<ServerResponse<User>>('/api/v1/user');
 * return ensureData(response.data.data, 'User not found');
 * ```
 */
export function ensureData<T>(data: null | T | undefined, errorMessage = "No data received from server"): T {
  if (data === null || data === undefined) {
    throw new ApiError(errorMessage, 500);
  }
  return data;
}

/**
 * Extracts validation errors from an API error response
 *
 * @param error - The ApiError to extract validation errors from
 * @returns Array of validation errors with field and message
 */
export function extractValidationErrors(error: ApiError): { field: string; message: string }[] {
  if (!error.error || typeof error.error !== "object") {
    return [];
  }

  const errorObj = error.error as Record<string, unknown>;

  // Handle array of validation errors
  if (Array.isArray(errorObj)) {
    return errorObj
      .filter((err): err is { field?: string; message?: string } => {
        return typeof err === "object" && err !== null;
      })
      .map((err) => ({
        field: err.field ?? "unknown",
        message: err.message ?? "Validation error",
      }));
  }

  // Handle object with field errors
  if (typeof errorObj === "object") {
    return Object.entries(errorObj)
      .filter(([, value]) => typeof value === "string")
      .map(([field, message]) => ({
        field,
        message: message as string,
      }));
  }

  return [];
}
