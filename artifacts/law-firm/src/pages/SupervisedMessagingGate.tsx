import { Link } from "wouter";
import { ArrowRight, MessageSquareText, ShieldCheck } from "lucide-react";

type Audience = "client" | "advocate";

const COPY: Record<Audience, {
  title: string;
  body: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
}> = {
  client: {
    title: "Direct advocate chat is closed",
    body: "Legal Connect supervises every client↔counsel message. Post questions through Case updates so LC can review before counsel replies — nothing bypasses the LC gate.",
    primaryHref: "/client/updates",
    primaryLabel: "Open supervised case updates",
    secondaryHref: "/client/book",
    secondaryLabel: "Submit a new intake",
  },
  advocate: {
    title: "Direct client chat is closed",
    body: "Do not message clients off-platform or through demo chat. Submit updates for Legal Connect review; they reach the client only after LC approval.",
    primaryHref: "/advocate/updates",
    primaryLabel: "Post LC-reviewed update",
    secondaryHref: "/advocate",
    secondaryLabel: "Back to dashboard",
  },
};

export function SupervisedMessagingGate({ audience }: { audience: Audience }) {
  const copy = COPY[audience];
  return (
    <section className="lc-workspace-error" style={{ maxWidth: 720, margin: "40px auto" }}>
      <ShieldCheck />
      <div>
        <p className="lc-kicker" style={{ marginBottom: 8 }}>Supervised by Legal Connect</p>
        <h2>{copy.title}</h2>
        <p>{copy.body}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
          <Link href={copy.primaryHref} className="lc-button lc-button-primary">
            <MessageSquareText /> {copy.primaryLabel} <ArrowRight />
          </Link>
          <Link href={copy.secondaryHref} className="lc-button">
            {copy.secondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}

export function ClientConnectChat() {
  return <SupervisedMessagingGate audience="client" />;
}

export function AdvocateChat() {
  return <SupervisedMessagingGate audience="advocate" />;
}
