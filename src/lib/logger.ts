/**
 * Centralized Logger Utility
 *
 * Provides consistent logging across the application with support for
 * different log levels and environment-aware behavior.
 *
 * In production, only warnings and errors are logged.
 * In development, all log levels are enabled.
 */

type LogContext = Record<string, unknown>;

const isDev = process.env.NODE_ENV === "development";

/**
 * Format log message with optional context
 */
function formatMessage(message: string, context?: LogContext): string {
  if (!context || Object.keys(context).length === 0) {
    return message;
  }
  return `${message} ${JSON.stringify(context)}`;
}

/**
 * Get timestamp for log entries
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Logger utility with consistent formatting and environment-aware behavior
 */
export const logger = {
  /**
   * Log API errors with consistent formatting
   */
  apiError(endpoint: string, error: unknown, context?: LogContext): void {
    const errorDetails = extractApiErrorDetails(error);
    this.error(`API Error: ${endpoint}`, error, {
      ...context,
      ...errorDetails,
    });
  },

  /**
   * Debug level logging - only shown in development
   */
  debug(message: string, context?: LogContext): void {
    if (isDev) {
      console.debug(`[DEBUG] ${getTimestamp()} - ${formatMessage(message, context)}`);
    }
  },

  /**
   * Error level logging - shown in all environments
   * Optionally includes error object for stack trace
   */
  error(message: string, error?: unknown, context?: LogContext): void {
    let errorMessage = "An unknown error occurred";
    let errorStack: string | undefined;

    if (error instanceof Error) {
      errorMessage = error.message;
      errorStack = error.stack;
    } else if (typeof error === "string") {
      errorMessage = error;
    } else if (error !== null && typeof error === "object") {
      // Try to extract message from common error patterns
      const obj = error as Record<string, unknown>;
      errorMessage =
        typeof obj.message === "string" ? obj.message : typeof obj.error === "string" ? obj.error : JSON.stringify(obj);
    } else if (error !== undefined) {
      errorMessage = JSON.stringify(error);
    }

    console.error(
      `[ERROR] ${getTimestamp()} - ${formatMessage(message, {
        ...context,
        error: errorMessage,
        ...(isDev && errorStack ? { stack: errorStack } : {}),
      })}`,
    );
  },

  /**
   * Info level logging - only shown in development
   */
  info(message: string, context?: LogContext): void {
    if (isDev) {
      console.info(`[INFO] ${getTimestamp()} - ${formatMessage(message, context)}`);
    }
  },

  /**
   * Warning level logging - shown in all environments
   */
  warn(message: string, context?: LogContext): void {
    console.warn(`[WARN] ${getTimestamp()} - ${formatMessage(message, context)}`);
  },
};

/**
 * Extract useful details from API errors
 */
function extractApiErrorDetails(error: unknown): LogContext {
  if (!error || typeof error !== "object") {
    return {};
  }

  const axiosError = error as {
    code?: string;
    message?: string;
    response?: {
      data?: { error?: string; message?: string };
      status?: number;
    };
  };

  return {
    code: axiosError.code,
    message: axiosError.response?.data?.message ?? axiosError.response?.data?.error ?? axiosError.message,
    status: axiosError.response?.status,
  };
}

/**
 * Type-safe error message extractor
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const apiError = error as {
      message?: string;
      response?: {
        data?: { error?: string; message?: string };
      };
    };

    return (
      apiError.response?.data?.message ??
      apiError.response?.data?.error ??
      apiError.message ??
      "An unexpected error occurred"
    );
  }

  return String(error);
}

export default logger;
