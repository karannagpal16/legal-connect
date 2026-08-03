import { Component, type ErrorInfo, type ReactNode } from "react";
import { useLocation } from "wouter";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { clearChunkReloadLatch, isChunkLoadError } from "@/lib/lazyRoute";

type Props = {
  children: ReactNode;
  resetKey?: string;
};

type State = {
  error: Error | null;
  autoReloading: boolean;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null, autoReloading: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Legal Connect screen failed to render", error, info);
    if (isChunkLoadError(error) && typeof window !== "undefined" && !this.state.autoReloading) {
      const key = "lc_chunk_reload";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, String(Date.now()));
        this.setState({ autoReloading: true });
        window.location.reload();
      }
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null, autoReloading: false });
    }
  }

  componentDidMount() {
    clearChunkReloadLatch();
  }

  render() {
    if (this.state.autoReloading) {
      return (
        <div className="lc-route-loading" role="status">
          <span className="lc-spinner" />
          <p>Updating workspace files...</p>
        </div>
      );
    }

    if (!this.state.error) return this.props.children;

    return (
      <main className="lc-error-page" role="alert">
        <section className="lc-error-panel">
          <span className="lc-error-icon" aria-hidden="true">
            <AlertTriangle />
          </span>
          <p className="lc-kicker">Screen recovery</p>
          <h1>This screen could not load</h1>
          <p>
            Your session is still safe. Retry this screen, or return to the home page and continue from there.
          </p>
          <pre className="lc-error-detail">{this.state.error.message}</pre>
          <div className="lc-error-actions">
            <button
              className="lc-button lc-button-primary"
              onClick={() => {
                clearChunkReloadLatch();
                window.location.reload();
              }}
            >
              <RefreshCw /> Retry
            </button>
            <button className="lc-button lc-button-quiet" onClick={() => window.location.assign("/")}>
              <Home /> Home
            </button>
          </div>
        </section>
      </main>
    );
  }
}

/** Resets the error boundary whenever the route changes so one bad page cannot trap the whole app. */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <AppErrorBoundary resetKey={location}>{children}</AppErrorBoundary>;
}
