import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showRetry?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error for debugging
    console.error('Jodex AI Assistant Error Boundary:', error, errorInfo);

    // Call error callback if provided
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    }
  };

  getErrorType = (error?: Error): string => {
    if (!error) return 'unknown';

    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    }
    if (message.includes('voice') || message.includes('audio')) {
      return 'voice';
    }
    if (message.includes('api') || message.includes('openai')) {
      return 'api';
    }
    if (message.includes('permission') || message.includes('denied')) {
      return 'permission';
    }

    return 'general';
  };

  getErrorMessage = (error?: Error): string => {
    const errorType = this.getErrorType(error);

    switch (errorType) {
      case 'network':
        return 'Network connection error. Please check your internet connection and try again.';
      case 'voice':
        return 'Voice features are unavailable. This might be due to browser limitations or missing permissions.';
      case 'api':
        return 'AI service temporarily unavailable. Please try again in a moment.';
      case 'permission':
        return 'Permission required. Please allow microphone access to use voice features.';
      default:
        return 'An unexpected error occurred. Please refresh the page or try again.';
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorType = this.getErrorType(this.state.error);
      const canRetry = this.props.showRetry && this.retryCount < this.maxRetries;

      return (
        <div
          className="jodex-error-boundary flex flex-col items-center justify-center p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
          role="alert"
          aria-live="assertive"
        >
          <div className="text-center max-w-md">
            {/* Error Icon */}
            <div className="mb-4">
              <svg
                className="w-12 h-12 mx-auto text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            {/* Error Message */}
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
              Something went wrong
            </h3>

            <p className="text-sm text-red-600 dark:text-red-300 mb-6">
              {this.getErrorMessage(this.state.error)}
            </p>

            {/* Error details (for development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-4 text-left">
                <summary className="cursor-pointer text-xs text-red-500 hover:text-red-400">
                  Error details
                </summary>
                <pre className="mt-2 text-xs bg-red-100 dark:bg-red-900/30 p-2 rounded overflow-auto max-h-32">
                  <code>
                    {this.state.error.toString()}
                    {this.state.errorInfo && '\n' + this.state.errorInfo.componentStack}
                  </code>
                </pre>
              </details>
            )}

            {/* Retry Button */}
            {canRetry && (
              <button
                onClick={this.handleRetry}
                className="jodex-btn jodex-btn-primary text-sm"
                aria-label="Retry loading the component"
              >
                Try Again {this.retryCount > 0 && `(${this.maxRetries - this.retryCount} attempts left)`}
              </button>
            )}

            {/* Retry exhausted message */}
            {this.retryCount >= this.maxRetries && (
              <p className="text-xs text-red-500 mt-2">
                Maximum retry attempts reached. Please refresh the page.
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC to wrap components with error boundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

// Hook for functional components
export const useErrorBoundary = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  // Throw error to be caught by nearest error boundary
  if (error) {
    throw error;
  }

  return { captureError, resetError };
};