import { Link } from "wouter";
import { Construction, ExternalLink, ArrowRight, Gavel } from "lucide-react";

/**
 * Official judge/leave rosters are not integrated for this release.
 * Hardcoded bench lists were retired so the portal never claims live court status.
 */
export function AdvocateJudges() {
  return (
    <section className="lc-workspace-error" style={{ maxWidth: 760, margin: "40px auto" }}>
      <Construction />
      <div>
        <p className="lc-kicker" style={{ marginBottom: 8 }}>Not enabled in this release</p>
        <h2>Judge roster is not live-synced</h2>
        <p>
          Static Supreme Court / High Court bench lists and leave statuses have been removed.
          Use official court websites for sitting lists until a permitted integration exists.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
          <Link href="/advocate/cases" className="lc-button lc-button-primary">
            <Gavel /> Open my cases <ArrowRight />
          </Link>
          <a href="https://main.sci.gov.in/" target="_blank" rel="noreferrer" className="lc-button">
            SCI portal <ExternalLink />
          </a>
          <a href="https://delhihighcourt.nic.in/" target="_blank" rel="noreferrer" className="lc-button">
            Delhi HC <ExternalLink />
          </a>
        </div>
      </div>
    </section>
  );
}
