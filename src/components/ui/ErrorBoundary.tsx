import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-cream-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-2xl border border-cream-200 p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>

            <h1 className="font-serif text-2xl text-charcoal-900 font-bold mb-3">
              Something went wrong
            </h1>

            <p className="font-sans text-warm-500 mb-6">
              We encountered an unexpected error. Please try refreshing the page or return to the homepage.
            </p>

            {this.state.error && (
              <div className="bg-cream-50 rounded-lg p-4 mb-6 text-left">
                <p className="font-sans text-xs text-warm-400 font-semibold mb-1">Error details:</p>
                <p className="font-sans text-xs text-charcoal-600 break-all">
                  {this.state.error.message || 'Unknown error'}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-charcoal-900 text-white rounded-xl font-sans text-sm font-semibold hover:bg-charcoal-800 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>

              <Link
                to="/"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gold-500 text-charcoal-900 rounded-xl font-sans text-sm font-semibold hover:bg-gold-600 transition-colors"
              >
                <Home className="w-4 h-4" />
                Go Home
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook-based error boundary wrapper
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
): React.ComponentType<P> {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

// Section-level error boundary for graceful degradation
interface SectionErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  sectionName?: string;
}

export function SectionErrorBoundary({
  children,
  fallback,
  sectionName = 'This section'
}: SectionErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={
        fallback || (
          <div className="bg-cream-50 rounded-xl p-6 text-center border border-cream-200">
            <AlertTriangle className="w-8 h-8 text-warm-400 mx-auto mb-3" />
            <p className="font-sans text-sm text-warm-500">
              {sectionName} couldn't load. Please refresh the page.
            </p>
          </div>
        )
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
