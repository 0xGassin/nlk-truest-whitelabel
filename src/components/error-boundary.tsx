"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/logger";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
  hasError: boolean;
}

/**
 * Error Boundary component to catch React errors and display a fallback UI.
 * Prevents the entire app from crashing when a component throws an error.
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null, hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error, hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      logger.error("ErrorBoundary caught an error", { componentStack: errorInfo.componentStack, error: error.message });
    }

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ error: null, hasError: false });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] items-center justify-center p-8">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="size-6 text-destructive" />
              </div>
              <CardTitle>Something went wrong</CardTitle>
              <CardDescription>
                An unexpected error occurred. Please try again or contact support if the problem persists.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {process.env.NODE_ENV === "development" && this.state.error ? (
                <div className="max-h-32 overflow-auto rounded-md bg-muted p-3 font-mono text-xs text-muted-foreground">
                  {this.state.error.message}
                </div>
              ) : null}
              <Button className="w-full" onClick={this.handleRetry}>
                <RefreshCw className="mr-2 size-4" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary wrapper for functional components
 */
// eslint-disable-next-line react-refresh/only-export-components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode,
): React.FC<P> {
  const WrappedComponent: React.FC<P> = (props) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName ?? Component.name})`;

  return WrappedComponent;
}
