import { useMemo } from "react";
import { BriefcaseBusiness, Clock3, Gavel, Wallet } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { formatINR } from "@/lib/utils";

type EarningSource = "advisory" | "proxy";
type EarningStatus = "released" | "escrow";

interface EarningEntry {
  id: string;
  /** ISO date the payout was recorded. */
  date: string;
  source: EarningSource;
  /** Court name (proxy payout) or client name (advisory). */
  reference: string;
  status: EarningStatus;
  /** Net payout to the advocate, in INR. */
  amount: number;
}

const SOURCE_LABEL: Record<EarningSource, string> = {
  advisory: "Client Advisory",
  proxy: "Proxy Task Payout",
};

const STATUS_LABEL: Record<EarningStatus, string> = {
  released: "Released",
  escrow: "Escrow Hold",
};

/**
 * Advocate personal earnings ledger. This is intentionally isolated from the
 * platform-wide founder analytics (managed revenue, 10% marketplace commission,
 * Singapore expansion goal) which remain Admin-only in `RevenueTracker`.
 *
 * The rows below are a representative wallet feed used while running against the
 * local/demo store; swap for a per-advocate wallet API when one is available.
 */
const SAMPLE_LEDGER: EarningEntry[] = [
  { id: "earn-1", date: "2026-07-28", source: "advisory", reference: "Rohan Mehta — 1-time advisory", status: "released", amount: 850 },
  { id: "earn-2", date: "2026-07-22", source: "proxy", reference: "Patiala House Courts — bail mention", status: "released", amount: 1200 },
  { id: "earn-3", date: "2026-07-15", source: "advisory", reference: "Anjali Verma — 1-time advisory", status: "released", amount: 850 },
  { id: "earn-4", date: "2026-07-10", source: "proxy", reference: "Saket District Court — evidence", status: "escrow", amount: 1500 },
  { id: "earn-5", date: "2026-07-02", source: "proxy", reference: "Tis Hazari Courts — adjournment", status: "released", amount: 900 },
  { id: "earn-6", date: "2026-06-25", source: "advisory", reference: "Vikram Singh — 1-time advisory", status: "escrow", amount: 850 },
  { id: "earn-7", date: "2026-06-18", source: "proxy", reference: "Rouse Avenue Courts — charge arguments", status: "released", amount: 1400 },
  { id: "earn-8", date: "2026-06-12", source: "advisory", reference: "Neha Kapoor — 1-time advisory", status: "released", amount: 650 },
];

function sumWhere(ledger: EarningEntry[], predicate: (entry: EarningEntry) => boolean) {
  return ledger.reduce((total, entry) => (predicate(entry) ? total + entry.amount : total), 0);
}

export function AdvocateRevenue() {
  const { session } = useAuth();
  const ledger = SAMPLE_LEDGER;

  const totals = useMemo(() => {
    const advisory = sumWhere(ledger, (e) => e.source === "advisory" && e.status === "released");
    const proxy = sumWhere(ledger, (e) => e.source === "proxy" && e.status === "released");
    const escrow = sumWhere(ledger, (e) => e.status === "escrow");
    return { advisory, proxy, escrow, net: advisory + proxy };
  }, [ledger]);

  const orderedLedger = useMemo(
    () => ledger.toSorted((a, b) => b.date.localeCompare(a.date)),
    [ledger],
  );

  const name = (session?.user.name || "Counsel").replace(/^Adv\.\s*/i, "");

  return (
    <div className="lc-workspace-page">
      <section className="lc-command-hero lc-advocate-command">
        <div>
          <span className="lc-kicker">ADVOCATE EARNINGS LEDGER</span>
          <h2>Your personal earnings, {name}.</h2>
          <p>
            Track what you have personally earned on Legal Connect from 1-time client advisories and
            completed proxy court appearances. Platform-wide revenue is managed separately by Legal Connect.
          </p>
        </div>
      </section>

      <section className="lc-workspace-metrics" aria-label="Personal earnings summary">
        <div><Wallet /><span><strong>{formatINR(totals.net)}</strong><small>Total net earnings</small></span></div>
        <div><Gavel /><span><strong>{formatINR(totals.advisory)}</strong><small>Client advisory earnings</small></span></div>
        <div><BriefcaseBusiness /><span><strong>{formatINR(totals.proxy)}</strong><small>Proxy task payouts</small></span></div>
        <div><Clock3 /><span><strong>{formatINR(totals.escrow)}</strong><small>Pending escrow holds</small></span></div>
      </section>

      <section className="lc-operational-panel" style={{ marginTop: 20 }}>
        <header>
          <div>
            <span>Personal ledger</span>
            <h2>Itemised earnings</h2>
          </div>
        </header>
        <div className="lc-earnings-table" role="table" aria-label="Itemised earnings ledger">
          <div className="lc-earnings-row lc-earnings-row-head" role="row">
            <span>Date</span>
            <span>Source</span>
            <span>Court / client</span>
            <span>Status</span>
            <span className="lc-earnings-amount">Net payout</span>
          </div>
          {orderedLedger.map((entry) => (
            <div className="lc-earnings-row" role="row" key={entry.id}>
              <span><strong>{new Date(entry.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</strong></span>
              <span><em className={`lc-earnings-tag ${entry.source}`}>{SOURCE_LABEL[entry.source]}</em></span>
              <span><strong>{entry.reference}</strong></span>
              <span><em className={`lc-earnings-tag ${entry.status}`}>{STATUS_LABEL[entry.status]}</em></span>
              <span className="lc-earnings-amount"><strong>{formatINR(entry.amount)}</strong></span>
            </div>
          ))}
        </div>
        <p className="lc-inline-empty" style={{ margin: 0, padding: "12px 16px" }}>
          Escrow holds are released after proof audit and client rating confirmation by Legal Connect.
        </p>
      </section>
    </div>
  );
}
