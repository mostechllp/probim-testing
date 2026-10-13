import React from "react";
import { FiAlertTriangle, FiRefreshCw } from "react-icons/fi";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // ✅ Only log to console — never surface to UI
    console.error("[ErrorBoundary] Caught error:", error);
    console.error("[ErrorBoundary] Component stack:", errorInfo?.componentStack);

    // Optional: send to monitoring (Sentry, LogRocket, etc.)
    // logErrorToService(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      // ✅ Show only a generic message — no error details
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiAlertTriangle className="text-red-500 text-3xl" />
            </div>
            <h3 className="text-lg font-bold text-[var(--text)] mb-2">
              Something went wrong
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              We couldn't load this section. Please try again.
            </p>
            <button
              onClick={this.handleRetry}
              className="px-6 py-2 bg-green-500 text-white rounded-full font-semibold text-sm hover:bg-green-600 transition-colors flex items-center gap-2 mx-auto"
            >
              <FiRefreshCw size={16} />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;