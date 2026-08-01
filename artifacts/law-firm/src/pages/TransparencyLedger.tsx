import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Scale, ShieldCheck } from "lucide-react";

interface Ledger {
  generatedAt: string;
  missionsPosted: number;
  missionsCompleted: number;
  escrowHeldMissions: number;
  proofsSubmitted: number;
  verifiedAdvocates: number;
  paidBookings: number;
  openGrievances: number;
  feeSplit: { advocatePct: number; platformPct: number; gatewayGstPct: number };
  mode?: string;
}

export function TransparencyLedger() {
  const query = useQuery({
    queryKey: ["public-transparency"],
    queryFn: async () => {
      const response = await fetch("/api/public/transparency");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Transparency ledger unavailable.");
      return payload.ledger as Ledger;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const ledger = query.data;

  return (
    <div className="lc-transparency-page">
      <header className="lc-transparency-header">
        <Link href="/" className="lc-transparency-back"><ArrowLeft /> Legal Connect</Link>
        <div>
          <span>Public ledger</span>
          <h1>Transparency Ledger</h1>
        </div>
      </header>

      <main>
        <section className="lc-transparency-hero">
          <Scale />
          <div>
            <h2>Live platform accountability</h2>
            <p>Each ProxyHub fee is split openly: advocate share, platform operations, and gateway/GST. Counts update from live records — no personal case details are shown.</p>
          </div>
        </section>

        {query.isLoading ? <p className="lc-transparency-empty">Loading live stats…</p> : null}
        {query.isError ? <p className="lc-transparency-empty">{(query.error as Error).message}</p> : null}

        {ledger ? (
          <>
            <section className="lc-transparency-grid" aria-label="Live platform stats">
              <article><strong>{ledger.missionsPosted}</strong><span>Proxy missions posted</span></article>
              <article><strong>{ledger.missionsCompleted}</strong><span>Missions completed</span></article>
              <article><strong>{ledger.escrowHeldMissions}</strong><span>Escrow-held missions</span></article>
              <article><strong>{ledger.proofsSubmitted}</strong><span>Order-sheet proofs</span></article>
              <article><strong>{ledger.verifiedAdvocates}</strong><span>Advocate accounts</span></article>
              <article><strong>{ledger.paidBookings}</strong><span>Paid bookings</span></article>
              <article><strong>{ledger.openGrievances}</strong><span>Open grievances</span></article>
              <article><strong>{ledger.feeSplit.advocatePct}%</strong><span>Advocate fee share</span></article>
            </section>

            <section className="lc-transparency-split">
              <h3>3-line fee breakdown</h3>
              <ul>
                <li><ShieldCheck /> Advocate counsel — {ledger.feeSplit.advocatePct}%</li>
                <li><ShieldCheck /> Legal Connect platform — {ledger.feeSplit.platformPct}%</li>
                <li><ShieldCheck /> Gateway + GST — {ledger.feeSplit.gatewayGstPct}%</li>
              </ul>
              <small>Updated {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(ledger.generatedAt))}</small>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
