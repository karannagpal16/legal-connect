import { useQuery } from "@tanstack/react-query";
import { IndianRupee, RefreshCw, Wallet } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { formatINR } from "@/lib/utils";
import { workspaceRequest } from "@/lib/workspace";

type EarningsRow = {
  id: string | number;
  title: string;
  detail?: string;
  amount: number;
  status?: string;
  createdAt?: string | null;
};

type MyEarnings = {
  summary: {
    clientSpend: number;
    totalSpent: number;
  };
  clientIntakes: EarningsRow[];
};

function formatWhen(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function ClientPayments() {
  const { session } = useAuth();
  const query = useQuery({
    queryKey: ["my-app-earnings", session?.user.id],
    queryFn: () => workspaceRequest<MyEarnings>("/api/analytics/my-earnings", session?.token),
    enabled: Boolean(session?.token),
    staleTime: 15_000,
  });

  if (query.isLoading) {
    return (
      <div className="lc-workspace-loading">
        <span className="lc-spinner" />
        <p>Loading your payments…</p>
      </div>
    );
  }

  if (query.isError) {
    return (
      <section className="lc-workspace-error">
        <div>
          <h2>Payments unavailable</h2>
          <p>{query.error.message}</p>
        </div>
        <button className="lc-button lc-button-primary" type="button" onClick={() => query.refetch()}>
          <RefreshCw /> Retry
        </button>
      </section>
    );
  }

  const rows = query.data?.clientIntakes || [];
  const spent = query.data?.summary?.clientSpend || query.data?.summary?.totalSpent || 0;

  return (
    <div className="lc-workspace-page space-y-6">
      <section className="lc-command-hero">
        <div>
          <span className="lc-kicker">YOUR APP PAYMENTS</span>
          <h2>Client booking spend</h2>
          <p>Amounts you paid on Legal Connect for counsel intakes. Founder revenue and Singapore goals are Admin-only.</p>
          <div className="lc-hero-button-row" style={{ marginTop: "0.85rem" }}>
            <Link className="lc-button lc-button-primary" href="/client/book">Get legal help</Link>
            <Link className="lc-button" href="/client">Back to home</Link>
          </div>
        </div>
      </section>

      <section className="lc-workspace-metrics">
        <div>
          <IndianRupee />
          <span>
            <strong>{formatINR(spent)}</strong>
            <small>Total paid for counsel</small>
          </span>
        </div>
        <div>
          <Wallet />
          <span>
            <strong>{rows.length}</strong>
            <small>Bookings tracked</small>
          </span>
        </div>
      </section>

      <section className="lc-operational-panel">
        <header>
          <div>
            <span>Client tasks</span>
            <h2>Payments for counsel bookings</h2>
          </div>
        </header>
        <div className="lc-chamber-task-list" style={{ padding: 16 }}>
          {rows.length ? rows.map((row) => (
            <div key={String(row.id)}>
              <span>
                <strong>{row.title}</strong>
                <small>
                  {row.detail || "Counsel booking"}
                  {row.createdAt ? ` · ${formatWhen(row.createdAt)}` : ""}
                  {row.status ? ` · ${row.status}` : ""}
                </small>
              </span>
              <em>{formatINR(row.amount)}</em>
            </div>
          )) : (
            <p className="lc-inline-empty">No counsel payments yet. Book verified counsel to get started.</p>
          )}
        </div>
      </section>
    </div>
  );
}
