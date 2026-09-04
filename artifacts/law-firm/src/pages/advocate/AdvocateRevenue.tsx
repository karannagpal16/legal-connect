import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BriefcaseBusiness, HandCoins, IndianRupee, RefreshCw, Wallet } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { formatINR } from "@/lib/utils";
import { workspaceRequest } from "@/lib/workspace";

type EarningsRow = {
  id: string | number;
  kind: string;
  title: string;
  detail?: string;
  amount: number;
  status?: string;
  released?: boolean;
  platformFee?: number;
  appTaxGst?: number;
  gross?: number;
  createdAt?: string | null;
};

type MyEarnings = {
  ok: boolean;
  summary: {
    clientTaskRevenue: number;
    proxyEarned: number;
    proxyPosted: number;
    clientSpend: number;
    totalEarned: number;
    totalSpent: number;
  };
  clientIntakes: EarningsRow[];
  proxyAsPoster: EarningsRow[];
  proxyAsCounsel: EarningsRow[];
};

function formatWhen(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function AdvocateRevenue() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [holderName, setHolderName] = useState(session?.user?.name || "");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const query = useQuery({
    queryKey: ["my-app-earnings", session?.user.id],
    queryFn: () => workspaceRequest<MyEarnings>("/api/analytics/my-earnings", session?.token),
    enabled: Boolean(session?.token),
    staleTime: 15_000,
  });
  const payoutQuery = useQuery({
    queryKey: ["payout-account", session?.user.id],
    queryFn: () => workspaceRequest<{ ok: boolean; account?: { bankAccountLast4?: string; bankIfsc?: string; kycStatus?: string; holderName?: string } | null }>("/api/advocate/payout-account", session?.token),
    enabled: Boolean(session?.token),
    staleTime: 30_000,
  });
  const savePayout = useMutation({
    mutationFn: () => workspaceRequest("/api/advocate/payout-account", session?.token, {
      method: "POST",
      body: JSON.stringify({ holderName, accountNumber, ifsc }),
    }),
    onSuccess: () => {
      setAccountNumber("");
      queryClient.invalidateQueries({ queryKey: ["payout-account", session?.user.id] });
    },
  });

  if (query.isLoading) {
    return (
      <div className="lc-workspace-loading">
        <span className="lc-spinner" />
        <p>Loading your app earnings…</p>
      </div>
    );
  }

  if (query.isError) {
    return (
      <section className="lc-workspace-error">
        <div>
          <h2>Earnings unavailable</h2>
          <p>{query.error.message}</p>
        </div>
        <button className="lc-button lc-button-primary" type="button" onClick={() => query.refetch()}>
          <RefreshCw /> Retry
        </button>
      </section>
    );
  }

  const summary = query.data?.summary;
  const clientRows = query.data?.clientIntakes || [];
  const proxyEarnedRows = query.data?.proxyAsCounsel || [];
  const proxyPostedRows = query.data?.proxyAsPoster || [];

  return (
    <div className="lc-workspace-page space-y-6">
      <section className="lc-command-hero lc-advocate-command">
        <div>
          <span className="lc-kicker">MY APP EARNINGS</span>
          <h2>Revenue from client &amp; proxy work</h2>
          <p>
            Your earnings from paid client intakes and ProxyHub missions on Legal Connect.
            Professional fees are split-settled to the bank account below; ProxyHub never receives the gross first.
          </p>
        </div>
      </section>

      <section className="lc-operational-panel">
        <header>
          <div>
            <span>Split settlement</span>
            <h2>Verified payout account</h2>
          </div>
        </header>
        <div style={{ padding: 16 }} className="space-y-3">
          <p className="text-sm text-muted-foreground">
            LC pays your professional fee here on each approved booking. Current: {payoutQuery.data?.account
              ? `${payoutQuery.data.account.holderName || "Saved"} · ****${payoutQuery.data.account.bankAccountLast4 || "----"} · ${payoutQuery.data.account.bankIfsc || ""} (${payoutQuery.data.account.kycStatus || "submitted"})`
              : "not on file — queued until you add it."}
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            <input className="w-full p-3 rounded-xl border border-border bg-background" placeholder="Account holder" value={holderName} onChange={(event) => setHolderName(event.target.value)} />
            <input className="w-full p-3 rounded-xl border border-border bg-background" placeholder="Account number" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} />
            <input className="w-full p-3 rounded-xl border border-border bg-background uppercase" placeholder="IFSC" value={ifsc} onChange={(event) => setIfsc(event.target.value)} />
          </div>
          <button
            type="button"
            className="lc-button lc-button-primary"
            disabled={savePayout.isPending}
            onClick={() => savePayout.mutate()}
          >
            {savePayout.isPending ? "Saving…" : "Save payout account"}
          </button>
          {savePayout.isError ? <p className="text-sm text-destructive">{(savePayout.error as Error).message}</p> : null}
          {savePayout.isSuccess ? <p className="text-sm text-muted-foreground">Payout account saved for split settlement.</p> : null}
        </div>
      </section>

      <section className="lc-workspace-metrics" aria-label="Earnings summary">
        <div>
          <IndianRupee />
          <span>
            <strong>{formatINR(summary?.totalEarned || 0)}</strong>
            <small>Total earned on app</small>
          </span>
        </div>
        <div>
          <BriefcaseBusiness />
          <span>
            <strong>{formatINR(summary?.clientTaskRevenue || 0)}</strong>
            <small>Client intake fees</small>
          </span>
        </div>
        <div>
          <HandCoins />
          <span>
            <strong>{formatINR(summary?.proxyEarned || 0)}</strong>
            <small>Proxy net released</small>
          </span>
        </div>
        <div>
          <Wallet />
          <span>
            <strong>{formatINR(summary?.proxyPosted || 0)}</strong>
            <small>Proxy tasks you posted</small>
          </span>
        </div>
      </section>

      <div className="lc-practice-grid">
        <section className="lc-operational-panel">
          <header>
            <div>
              <span>Client tasks</span>
              <h2>Paid intakes assigned to you</h2>
            </div>
          </header>
          <div className="lc-chamber-task-list" style={{ padding: 16 }}>
            {clientRows.length ? clientRows.map((row) => (
              <div key={`client-${row.id}`}>
                <span>
                  <strong>{row.title}</strong>
                  <small>
                    {row.detail || "Client intake"}
                    {row.createdAt ? ` · ${formatWhen(row.createdAt)}` : ""}
                    {row.status ? ` · ${row.status}` : ""}
                  </small>
                </span>
                <em>{formatINR(row.amount)}</em>
              </div>
            )) : (
              <p className="lc-inline-empty">No paid client intakes attributed to your enrollment yet.</p>
            )}
          </div>
        </section>

        <section className="lc-operational-panel">
          <header>
            <div>
              <span>ProxyHub · Earned</span>
              <h2>Missions where you were proxy counsel</h2>
            </div>
          </header>
          <div className="lc-chamber-task-list" style={{ padding: 16 }}>
            {proxyEarnedRows.length ? proxyEarnedRows.map((row) => (
              <div key={`proxy-earn-${row.id}`}>
                <span>
                  <strong>{row.title}</strong>
                  <small>
                    {row.detail || "Proxy mission"}
                    {row.released ? " · Released" : " · Pending release"}
                    {row.gross != null ? ` · Gross ${formatINR(row.gross)}` : ""}
                  </small>
                </span>
                <em>{formatINR(row.amount)}</em>
              </div>
            )) : (
              <p className="lc-inline-empty">No proxy assignments credited to you yet.</p>
            )}
          </div>
        </section>
      </div>

      <section className="lc-operational-panel">
        <header>
          <div>
            <span>ProxyHub · Posted</span>
            <h2>Fees you paid to post proxy appearances</h2>
          </div>
        </header>
        <div className="lc-chamber-task-list" style={{ padding: 16 }}>
          {proxyPostedRows.length ? proxyPostedRows.map((row) => (
            <div key={`proxy-post-${row.id}`}>
              <span>
                <strong>{row.title}</strong>
                <small>
                  {row.detail || "Proxy post"}
                  {row.status ? ` · ${row.status}` : ""}
                  {row.createdAt ? ` · ${formatWhen(row.createdAt)}` : ""}
                </small>
              </span>
              <em>{formatINR(row.amount)}</em>
            </div>
          )) : (
            <p className="lc-inline-empty">You have not posted a paid ProxyHub task yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
