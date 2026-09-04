import { Component, type ErrorInfo, type ReactNode } from "react"
import { AlertTriangle, RotateCcw, Home } from "lucide-react"
import { SmartHireLogo } from "./smart-hire-logo"

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error("Uncaught application error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#FAF8F5] text-charcoal flex flex-col font-sans relative overflow-hidden">
          <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
            <SmartHireLogo />
            <span className="text-[11px] font-mono uppercase tracking-widest text-red-700 px-2.5 py-1 rounded-full border border-red-200 bg-red-50">
              System Error
            </span>
          </header>

          <main className="flex-1 flex items-center justify-center px-6 py-12">
            <div className="max-w-md w-full bg-white rounded-xl border border-[#E6E0D6] p-6 sm:p-8 shadow-2xs text-center space-y-5">
              <div className="size-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mx-auto">
                <AlertTriangle className="size-6" />
              </div>

              <div>
                <h1 className="font-serif text-xl sm:text-2xl font-bold text-charcoal">
                  Something unexpected happened
                </h1>
                <p className="text-xs text-[#78716C] mt-2 leading-relaxed">
                  An error occurred while rendering this page. Our team has been notified.
                </p>
              </div>

              {this.state.error && (
                <div className="text-left bg-stone-50 border border-[#E6E0D6] rounded-md p-3 max-h-36 overflow-auto">
                  <p className="text-[11px] font-mono text-red-700 break-words font-semibold">
                    {this.state.error.toString()}
                  </p>
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-terracotta px-4 py-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-terracotta-dark transition-colors cursor-pointer"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Reload Page</span>
                </button>

                <button
                  type="button"
                  onClick={this.handleReset}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-[#E6E0D6] bg-white px-4 py-2.5 text-xs font-semibold text-charcoal hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                >
                  <Home className="size-3.5" />
                  <span>Go to Home</span>
                </button>
              </div>
            </div>
          </main>
        </div>
      );
    }

    return this.props.children;
  }
}
