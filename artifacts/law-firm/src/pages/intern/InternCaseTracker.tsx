import { Link } from "wouter";
import { Construction, ArrowRight, BookOpen } from "lucide-react";

/**
 * Intern case tracker no longer claims live eCourt sync or sample firm matters.
 */
export function InternCaseTracker() {
  return (
    <section className="lc-workspace-error" style={{ maxWidth: 720, margin: "40px auto" }}>
      <Construction />
      <div>
        <p className="lc-kicker" style={{ marginBottom: 8 }}>Not enabled in this release</p>
        <h2>Live case learning desk is not synced</h2>
        <p>
          Fake “eCourt synced” intern cases are retired. Use chamber quests and the library for
          supervised learning until real assigned matters are exposed to interns.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
          <Link href="/intern/quests" className="lc-button lc-button-primary">
            <BookOpen /> Open quests <ArrowRight />
          </Link>
          <Link href="/intern" className="lc-button">Intern home</Link>
        </div>
      </div>
    </section>
  );
}
