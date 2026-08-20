import { Link } from "wouter";
import { Construction, ArrowRight, ShieldCheck } from "lucide-react";

/**
 * Client case tracker no longer claims eCourt sync.
 * Supervised matter progress comes from assigned bookings/cases only.
 */
export function ClientCaseTracker() {
  return (
    <section className="lc-workspace-error" style={{ maxWidth: 720, margin: "40px auto" }}>
      <Construction />
      <div>
        <p className="lc-kicker" style={{ marginBottom: 8 }}>Honest status</p>
        <h2>Court sync is not enabled</h2>
        <p>
          This screen no longer shows sample cases or “eCourt synced” labels. Track your matter from
          Client home after Legal Connect assigns counsel and approves updates.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
          <Link href="/client" className="lc-button lc-button-primary">
            <ShieldCheck /> Open client home <ArrowRight />
          </Link>
          <Link href="/client/book" className="lc-button">Get legal help</Link>
        </div>
      </div>
    </section>
  );
}
