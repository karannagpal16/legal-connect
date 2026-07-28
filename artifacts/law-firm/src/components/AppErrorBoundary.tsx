import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Legal Connect screen failed to render", error, info);
  }

  render() {
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
          <div className="lc-error-actions">
            <button className="lc-button lc-button-primary" onClick={() => window.location.reload()}>
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
