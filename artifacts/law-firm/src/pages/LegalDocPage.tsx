import { Link } from "wouter";
import { ArrowLeft, Scale } from "lucide-react";

type LegalDocKind = "privacy" | "terms" | "refund";

const docs: Record<LegalDocKind, { title: string; updated: string; sections: Array<{ heading: string; body: string[] }> }> = {
  privacy: {
    title: "Privacy Policy",
    updated: "1 August 2026",
    sections: [
      {
        heading: "Who we are",
        body: [
          "Legal Connect (“we”, “us”) operates India’s legal operating system for clients, advocates, interns, and administrators.",
          "This policy explains what account, case, payment, and communication data we process to deliver the service.",
        ],
      },
      {
        heading: "Data we collect",
        body: [
          "Account identity: name, email, phone, role, and professional or academic credentials you submit for verification.",
          "Matter data: case references, documents you upload, engagement terms, grievances, and supervised case updates.",
          "Payments: Razorpay order and payment identifiers, amounts, and Work Completion Hold status. We do not store full card numbers.",
          "Usage logs: authentication events, audit trails, and notification delivery status needed for security and support.",
        ],
      },
      {
        heading: "How we use data",
        body: [
          "To authenticate portals, assign counsel, supervise case communications, process fees, send service notifications, and improve reliability.",
          "We do not sell personal data. Access inside Legal Connect is role-protected (client, advocate, intern, admin).",
        ],
      },
      {
        heading: "Sharing",
        body: [
          "Payment processing with Razorpay, transactional email/SMS providers, and cloud document storage where configured.",
          "Law enforcement or regulators only when required by applicable Indian law.",
        ],
      },
      {
        heading: "Retention & rights",
        body: [
          "We retain account and matter records for as long as needed to provide the service, meet legal obligations, and resolve disputes.",
          "You may request access, correction, or deletion subject to legal retention duties by contacting support through your portal or the grievance channel.",
        ],
      },
      {
        heading: "Contact",
        body: [
          "For privacy requests, use the in-app Grievance flow or email the account administrator associated with your Legal Connect workspace.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of Use",
    updated: "1 August 2026",
    sections: [
      {
        heading: "Service",
        body: [
          "Legal Connect provides software tools for legal coordination, bookings, ProxyHub missions, chamber operations, and supervised case communications.",
          "Legal Connect is not a substitute for independent legal advice. Advocates remain responsible for professional conduct under applicable Bar Council rules.",
        ],
      },
      {
        heading: "Accounts & roles",
        body: [
          "You must provide accurate identity information for your role. Admin accounts are issued only by Legal Connect.",
          "You are responsible for keeping credentials secure and for activity under your account.",
        ],
      },
      {
        heading: "Payments & holds",
        body: [
          "Paid features (consultations, ProxyHub fees, Chamber Vault plans) are charged through Razorpay unless a free entitlement applies.",
          "Work Completion Hold and escrow-style statuses restrict release of funds until platform rules for the product are met.",
        ],
      },
      {
        heading: "Acceptable use",
        body: [
          "Do not post guaranteed-outcome advertising, solicit unlawfully, upload malware, or attempt to bypass payment or supervision controls.",
          "Case updates and client replies may be held for Legal Connect review before they become visible to the other party.",
        ],
      },
      {
        heading: "Liability",
        body: [
          "To the extent permitted by law, Legal Connect is not liable for court outcomes, counsel performance, or third-party court data availability.",
          "Platform availability is provided on a commercially reasonable basis.",
        ],
      },
    ],
  },
  refund: {
    title: "Refund Policy",
    updated: "1 August 2026",
    sections: [
      {
        heading: "When refunds apply",
        body: [
          "If a paid booking or ProxyHub mission cannot be fulfilled because of a platform failure before work starts, you may request a refund.",
          "Chamber Vault subscription renewals may be cancelled before the next billing period; unused days in a started period are generally not prorated unless required by law or approved by Admin.",
        ],
      },
      {
        heading: "Non-refundable situations",
        body: [
          "Completed consultations, missions already assigned with appearance work underway, or disputes about legal strategy/outcomes are not automatic refund grounds.",
          "Chargebacks initiated without contacting Legal Connect first may result in account review.",
        ],
      },
      {
        heading: "How to request",
        body: [
          "Open Grievance in the client portal or contact Admin with your payment id / receipt number within 7 days of the charge.",
          "Approved refunds are processed to the original payment method through Razorpay’s timelines.",
        ],
      },
    ],
  },
};

export function LegalDocPage({ kind }: { kind: LegalDocKind }) {
  const doc = docs[kind];
  return (
    <div className="lc-login-page" style={{ minHeight: "100vh" }}>
      <main className="lc-login-main" style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.25rem 4rem" }}>
        <Link href="/" className="lc-login-back" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", marginBottom: "1.5rem" }}>
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <div className="lc-login-card" style={{ padding: "2rem" }}>
          <div className="lc-login-brand" style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
            <span className="lc-brand-symbol"><Scale /></span>
            <span><strong>Legal Connect</strong><small>India's Legal OS</small></span>
          </div>
          <span className="lc-kicker">LEGAL</span>
          <h1 style={{ fontSize: "2rem", margin: "0.35rem 0 0.5rem" }}>{doc.title}</h1>
          <p style={{ color: "var(--muted-foreground, #667085)", marginBottom: "1.75rem" }}>Last updated {doc.updated}</p>
          {doc.sections.map((section) => (
            <section key={section.heading} style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.15rem", marginBottom: "0.5rem" }}>{section.heading}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph.slice(0, 48)} style={{ marginBottom: "0.65rem", lineHeight: 1.6 }}>{paragraph}</p>
              ))}
            </section>
          ))}
          <p style={{ marginTop: "2rem" }}>
            <Link href="/privacy">Privacy</Link>
            {" · "}
            <Link href="/terms">Terms</Link>
            {" · "}
            <Link href="/refund">Refunds</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export function PrivacyPage() {
  return <LegalDocPage kind="privacy" />;
}

export function TermsPage() {
  return <LegalDocPage kind="terms" />;
}

export function RefundPage() {
  return <LegalDocPage kind="refund" />;
}
