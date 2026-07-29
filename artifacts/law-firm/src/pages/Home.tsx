import { Link } from "wouter";
import {
  ArrowRight,
  BriefcaseBusiness,
  Headphones,
  LockKeyhole,
  Scale,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react";
import { roleHome, useAuth } from "@/lib/auth";

const trustPoints = [
  {
    title: "Secure by design",
    text: "Protected legal records",
    icon: ShieldCheck,
  },
  {
    title: "Dharma-centric",
    text: "Clarity, fairness, integrity",
    icon: Scale,
  },
  {
    title: "Access anywhere",
    text: "One workspace on every device",
    icon: Smartphone,
  },
  {
    title: "Priority support",
    text: "Help when your matter needs it",
    icon: Headphones,
  },
];

export function Home() {
  const { session } = useAuth();
  const workspace = session ? roleHome(session.user.role) : "/login";

  return (
    <div className="lc-dharma-home">
      <header className="lc-dharma-header">
        <Link href="/" className="lc-dharma-brand" aria-label="Legal Connect home">
          <span className="lc-dharma-brand-mark" aria-hidden="true">
            <span />
          </span>
          <span className="lc-dharma-brand-copy">
            <strong>Legal Connect</strong>
            <small>Serve Dharma. Deliver Justice.</small>
          </span>
        </Link>

        <nav aria-label="Public navigation">
          <a href="#people">For People</a>
          <a href="#professionals">For Legal Professionals</a>
          <a href="#security">Security</a>
        </nav>

        <Link className="lc-dharma-login" href={workspace}>
          {session ? "Dashboard" : "Login"}
          <ArrowRight aria-hidden="true" />
        </Link>
      </header>

      <main>
        <section className="lc-dharma-stage" aria-labelledby="legal-connect-title">
          <div className="lc-dharma-backdrop" aria-hidden="true" />
          <div className="lc-dharma-shade" aria-hidden="true" />
          <div className="lc-dharma-orbit" aria-hidden="true"><span /></div>

          <div className="lc-dharma-stage-inner">
            <div className="lc-dharma-hero">
              <div className="lc-dharma-product-name">
                <span>India's legal operating system</span>
                <h1 id="legal-connect-title">Legal Connect</h1>
              </div>

              <p className="lc-dharma-motto" aria-label="Serve Dharma. Deliver Justice.">
                <span>Serve Dharma.</span>
                <i aria-hidden="true" />
                <span>Deliver Justice.</span>
              </p>
            </div>

            <blockquote className="lc-dharma-quote">
              <span aria-hidden="true">“</span>
              <div>
                <p lang="sa">यतो धर्मस्ततो जयः</p>
                <cite>Where there is Dharma, there is Victory. <em>Mahabharata</em></cite>
              </div>
            </blockquote>

            <div className="lc-dharma-portals" aria-label="Choose your Legal Connect workspace">
              <article className="lc-dharma-portal-card" id="people">
                <span className="lc-dharma-portal-icon"><UserRound aria-hidden="true" /></span>
                <div className="lc-dharma-portal-copy">
                  <span>For people</span>
                  <h2>Your legal journey, simplified.</h2>
                  <p>Track matters, receive updates, connect with trusted advocates, and keep every legal step organised.</p>
                </div>
                <Link className="lc-dharma-card-action lc-dharma-card-action-light" href="/login?role=client">
                  Continue as client <ArrowRight aria-hidden="true" />
                </Link>
              </article>

              <article className="lc-dharma-portal-card" id="professionals">
                <span className="lc-dharma-portal-icon"><BriefcaseBusiness aria-hidden="true" /></span>
                <div className="lc-dharma-portal-copy">
                  <span>For legal professionals</span>
                  <h2>Power your practice. Elevate justice.</h2>
                  <p>Manage cases, teams, bookings, court missions, documents, and clients from one focused workspace.</p>
                </div>
                <Link className="lc-dharma-card-action lc-dharma-card-action-gold" href="/login?role=advocate">
                  Professional login <ArrowRight aria-hidden="true" />
                </Link>
              </article>
            </div>

            <div className="lc-dharma-trust" id="security">
              {trustPoints.map((item) => (
                <div key={item.title}>
                  <item.icon aria-hidden="true" />
                  <span><strong>{item.title}</strong><small>{item.text}</small></span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="lc-dharma-footer">
        <span><LockKeyhole aria-hidden="true" /> Role-protected access</span>
        <p>© 2026 Legal Connect · UDYAM-DL-11-0164811</p>
        <Link href="/login?mode=register">Create an account <ArrowRight aria-hidden="true" /></Link>
      </footer>
    </div>
  );
}
