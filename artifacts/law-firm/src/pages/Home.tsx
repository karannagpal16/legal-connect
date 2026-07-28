import { Link } from "wouter";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileSearch,
  Gavel,
  LayoutDashboard,
  LockKeyhole,
  MessageSquareText,
  Scale,
  ShieldAlert,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { roleHome, useAuth, type AppRole } from "@/lib/auth";

const roleCards: Array<{
  role: AppRole;
  label: string;
  description: string;
  features: string;
  icon: typeof Scale;
}> = [
  { role: "client", label: "For clients", description: "Understand your matter and get legal help.", features: "Cases · Counsel · Documents", icon: UserRound },
  { role: "advocate", label: "For advocates", description: "Run your practice from one daily workspace.", features: "Diary · Bookings · Research", icon: Gavel },
  { role: "intern", label: "For interns", description: "Learn through supervised legal work.", features: "Quests · XP · Library", icon: BookOpen },
  { role: "admin", label: "For administrators", description: "Operate the platform with a clear audit trail.", features: "Users · Cases · Payments", icon: LayoutDashboard },
];

const steps = [
  { number: "01", title: "Choose your role", text: "Your role controls the tools and information you can access." },
  { number: "02", title: "Sign in securely", text: "Use one account across your cases, requests, and activity." },
  { number: "03", title: "Work from one dashboard", text: "See only what needs your attention and act from the same screen." },
];

export function Home() {
  const { session } = useAuth();
  const workspace = session ? roleHome(session.user.role) : "/login";

  return (
    <div className="lc-home">
      <header className="lc-public-header">
        <Link href="/" className="lc-public-brand">
          <span className="lc-brand-symbol"><Scale /></span>
          <span><strong>Legal Connect</strong><small>India's Legal OS</small></span>
        </Link>
        <nav aria-label="Public navigation">
          <a href="#roles">Workspaces</a>
          <a href="#how-it-works">How it works</a>
          <a href="#security">Security</a>
        </nav>
        <div className="lc-public-actions">
          {session ? (
            <Link className="lc-button lc-button-primary" href={workspace}>Open dashboard <ArrowRight /></Link>
          ) : (
            <>
              <Link className="lc-button lc-button-quiet" href="/login">Sign in</Link>
              <Link className="lc-button lc-button-primary" href="/login?mode=register">Create account <ArrowRight /></Link>
            </>
          )}
        </div>
      </header>

      <main>
        <section className="lc-public-hero">
          <div className="lc-public-hero-image" aria-hidden="true" />
          <div className="lc-public-hero-shade" aria-hidden="true" />
          <div className="lc-public-hero-content">
            <span className="lc-public-badge"><ShieldCheck /> UDYAM registered · Built for India</span>
            <h1>Legal Connect</h1>
            <p className="lc-hero-lead">Your legal work, clearly organised.</p>
            <p className="lc-hero-copy">One secure place for clients, advocates, interns, and administrators to manage cases, conversations, bookings, and legal work.</p>
            <div className="lc-hero-actions">
              <Link className="lc-button lc-button-gold" href={workspace}>{session ? "Open your dashboard" : "Get started"} <ArrowRight /></Link>
              <a className="lc-button lc-button-glass" href="#roles">Choose a workspace</a>
            </div>
            <div className="lc-hero-proof">
              <span><CheckCircle2 /> Role-based access</span>
              <span><CheckCircle2 /> Transparent activity</span>
              <span><CheckCircle2 /> Secure legal records</span>
            </div>
          </div>
        </section>

        <section className="lc-role-section" id="roles">
          <div className="lc-section-heading">
            <span className="lc-kicker">PERSONAL WORKSPACES</span>
            <h2>One login. The right dashboard.</h2>
            <p>Choose your role and Legal Connect keeps the experience focused on the work you actually need to do.</p>
          </div>
          <div className="lc-role-grid">
            {roleCards.map((item) => (
              <Link href={`/login?role=${item.role}`} key={item.role} className="lc-role-card">
                <span className="lc-role-icon"><item.icon /></span>
                <div>
                  <h3>{item.label}</h3>
                  <p>{item.description}</p>
                  <small>{item.features}</small>
                </div>
                <ArrowRight />
              </Link>
            ))}
          </div>
        </section>

        <section className="lc-how-section" id="how-it-works">
          <div className="lc-section-heading lc-section-heading-left">
            <span className="lc-kicker">SIMPLE BY DESIGN</span>
            <h2>From login to next action in seconds.</h2>
          </div>
          <div className="lc-step-grid">
            {steps.map((step) => (
              <article key={step.number}>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="lc-security-band" id="security">
          <div className="lc-security-copy">
            <LockKeyhole />
            <div><span className="lc-kicker">SECURITY FIRST</span><h2>Your role decides what you can see.</h2><p>Protected routes, authenticated API requests, and private role workspaces keep legal information separated.</p></div>
          </div>
          <div className="lc-security-points">
            <span><FileSearch /> Case-level access</span>
            <span><MessageSquareText /> Private conversations</span>
            <span><ShieldCheck /> Auditable actions</span>
          </div>
        </section>

        <section className="lc-sos-band">
          <div><ShieldAlert /><span><strong>Need urgent legal help?</strong><small>Open the Client workspace and use Legal SOS.</small></span></div>
          <Link className="lc-button lc-button-danger" href="/login?role=client">Open Client workspace <ArrowRight /></Link>
        </section>
      </main>

      <footer className="lc-public-footer">
        <Link href="/" className="lc-public-brand"><span className="lc-brand-symbol"><Scale /></span><span><strong>Legal Connect</strong><small>Serve Dharma. Deliver Justice.</small></span></Link>
        <p>© 2026 Legal Connect · UDYAM-DL-11-0164811</p>
      </footer>
    </div>
  );
}
