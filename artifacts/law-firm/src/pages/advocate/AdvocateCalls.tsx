import { Link } from "wouter";
import { Construction, Phone, ArrowRight, ShieldCheck } from "lucide-react";

/**
 * Live telephony is not enabled for this release.
 * Sample incoming/recent call lists were removed so advocates never see fake live activity.
 */
export function AdvocateCalls() {
  return (
    <section className="lc-workspace-error" style={{ maxWidth: 720, margin: "40px auto" }}>
      <Construction />
      <div>
        <p className="lc-kicker" style={{ marginBottom: 8 }}>Not enabled in this release</p>
        <h2>Secure calls desk is not live yet</h2>
        <p>
          Sample call queues and mock recent-call history have been retired. When a telephony provider
          is integrated, assigned advisory bookings will surface here. Until then, use supervised
          bookings and case updates.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
          <Link href="/advocate/bookings" className="lc-button lc-button-primary">
            <Phone /> Open bookings <ArrowRight />
          </Link>
          <Link href="/advocate/updates" className="lc-button">
            <ShieldCheck /> Post case update
          </Link>
        </div>
      </div>
    </section>
  );
}
