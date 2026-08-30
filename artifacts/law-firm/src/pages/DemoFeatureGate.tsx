import { Link } from "wouter";
import { ArrowRight, Construction, ShieldCheck } from "lucide-react";

type DemoSurface =
  | "wellness"
  | "rights"
  | "legal-guide"
  | "reminders"
  | "ai-assistant"
  | "advocate-reminders"
  | "intern-ai"
  | "court-tracker"
  | "judges-roster"
  | "court-radar";

const COPY: Record<DemoSurface, {
  title: string;
  body: string;
  primaryHref: string;
  primaryLabel: string;
}> = {
  wellness: {
    title: "Wellness check-in is not live yet",
    body: "This demo surface is retired for launch. Use Get legal help or supervised case updates for real matters.",
    primaryHref: "/client/book",
    primaryLabel: "Get legal help",
  },
  rights: {
    title: "Rights feed is not live yet",
    body: "Static demo cards are retired. Legal Connect will publish verified rights guidance only after counsel review.",
    primaryHref: "/client",
    primaryLabel: "Back to client home",
  },
  "legal-guide": {
    title: "Legal guide library is not live yet",
    body: "Static demo guides are retired so clients are not shown unverified how-to content at launch.",
    primaryHref: "/client/book",
    primaryLabel: "Submit an intake",
  },
  reminders: {
    title: "Hearing reminders desk is not live yet",
    body: "Fake local reminder rows are retired. Hearing dates appear on your supervised matter once LC records them.",
    primaryHref: "/client",
    primaryLabel: "Open client home",
  },
  "ai-assistant": {
    title: "General AI assistant is not live",
    body: "Only source-locked LawBot is available for legal Q&A, and only when approved sources are indexed. This free-form assistant is retired.",
    primaryHref: "/client/lawbot",
    primaryLabel: "Open LawBot",
  },
  "advocate-reminders": {
    title: "Client reminder dispatch is not live yet",
    body: "Demo WhatsApp/SMS reminder tools are retired. Post LC-reviewed case updates instead.",
    primaryHref: "/advocate/updates",
    primaryLabel: "Post case update",
  },
  "intern-ai": {
    title: "Intern AI desk is not live",
    body: "Free-form AI chat is retired for launch. Use the library and chamber quests for supervised learning work.",
    primaryHref: "/intern",
    primaryLabel: "Back to intern home",
  },
  "court-tracker": {
    title: "Authorized real-time court status is coming soon",
    body: "Legal Connect does not display an official District Court live board. Matter dates and orders in your workspace are records you or counsel enter, or data from an authorized public source when one is connected. Estimated or sample status is never presented as a court order.",
    primaryHref: "/client",
    primaryLabel: "Open client home",
  },
  "judges-roster": {
    title: "Official judge roster is not live",
    body: "Legal Connect does not publish a live judicial roster. Hearing dates and benches belong on your Case Diary, entered by you or recorded from an authorized source.",
    primaryHref: "/advocate/cases",
    primaryLabel: "Open Case Diary",
  },
  "court-radar": {
    title: "Authorized real-time court status is coming soon",
    body: "Court Radar is a future integration. Phase 1 does not scrape, infer, or display unofficial District Court cause lists or CIS boards.",
    primaryHref: "/advocate/cases",
    primaryLabel: "Open Case Diary",
  },
};

export function DemoFeatureGate({ surface }: { surface: DemoSurface }) {
  const copy = COPY[surface];
  return (
    <section className="lc-workspace-error" style={{ maxWidth: 720, margin: "40px auto" }}>
      <Construction />
      <div>
        <p className="lc-kicker" style={{ marginBottom: 8 }}>Not available at launch</p>
        <h2>{copy.title}</h2>
        <p>{copy.body}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
          <Link href={copy.primaryHref} className="lc-button lc-button-primary">
            <ShieldCheck /> {copy.primaryLabel} <ArrowRight />
          </Link>
          <Link href="/client" className="lc-button">Client home</Link>
        </div>
      </div>
    </section>
  );
}

export function ClientWellness() {
  return <DemoFeatureGate surface="wellness" />;
}

export function ClientRightsFeed() {
  return <DemoFeatureGate surface="rights" />;
}

export function ClientLegalGuide() {
  return <DemoFeatureGate surface="legal-guide" />;
}

export function ClientReminders() {
  return <DemoFeatureGate surface="reminders" />;
}

export function ClientAIAssistant() {
  return <DemoFeatureGate surface="ai-assistant" />;
}

export function AdvocateReminders() {
  return <DemoFeatureGate surface="advocate-reminders" />;
}

export function InternAIAssistant() {
  return <DemoFeatureGate surface="intern-ai" />;
}

export function ClientCaseTracker() {
  return <DemoFeatureGate surface="court-tracker" />;
}

export function AdvocateJudges() {
  return <DemoFeatureGate surface="judges-roster" />;
}

export function CourtRadarComingSoon() {
  return <DemoFeatureGate surface="court-radar" />;
}
