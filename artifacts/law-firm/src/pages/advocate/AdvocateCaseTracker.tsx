import { Link } from "wouter";
import { Construction, ExternalLink, ArrowRight, Gavel } from "lucide-react";

/**
 * Hardcoded firmCases / fake "eCourt synced" claims are retired for launch.
 * Official eCourts links remain available; no live sync is claimed until permitted integration exists.
 */
export function AdvocateCaseTracker() {
  return (
    <section className="lc-workspace-error" style={{ maxWidth: 760, margin: "40px auto" }}>
      <Construction />
      <div>
        <p className="lc-kicker" style={{ marginBottom: 8 }}>Not enabled in this release</p>
        <h2>Firm case tracker is not live-synced</h2>
        <p>
          Static demo matters and “eCourt synced” labels have been removed so the portal never
          pretends court data is mirrored. Use assigned matters from My Cases, and open official
          eCourts portals for court records.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
          <Link href="/advocate/cases" className="lc-button lc-button-primary">
            <Gavel /> Open my cases <ArrowRight />
          </Link>
          <a
            href="https://services.ecourts.gov.in/ecourtindia_v6/"
            target="_blank"
            rel="noreferrer"
            className="lc-button"
          >
            Official eCourts <ExternalLink />
          </a>
        </div>
      </div>
    </section>
  );
}
