import { useEffect, useState } from "react";
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
import { AnimatePresence, motion } from "framer-motion";
import { roleHome, useAuth } from "@/lib/auth";
import { legalQuotes } from "@/lib/workspace";

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
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(
      () => setQuoteIndex((current) => (current + 1) % legalQuotes.length),
      6000,
    );
    return () => window.clearInterval(timer);
  }, []);

  const quote = legalQuotes[quoteIndex];

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
          <Link href="/transparency">Transparency</Link>
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
          <div className="lc-dharma-chakra" aria-hidden="true"><span /></div>

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

            <blockquote className="lc-dharma-quote" aria-live="polite">
              <span aria-hidden="true">“</span>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={quoteIndex}
                  initial={{ opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -7 }}
                  transition={{ duration: 0.35 }}
                >
                  <p lang={quote.category === "Dharma" ? "sa" : "en"}>{quote.original}</p>
                  <cite>{quote.translation} <em>{quote.source}</em></cite>
                </motion.div>
              </AnimatePresence>
              <div className="lc-quote-progress" aria-label={`Quote ${quoteIndex + 1} of ${legalQuotes.length}`}>
                {legalQuotes.map((item, index) => (
                  <button
                    key={`${item.source}-${index}`}
                    type="button"
                    className={index === quoteIndex ? "active" : ""}
                    onClick={() => setQuoteIndex(index)}
                    aria-label={`Show quote ${index + 1}`}
                  />
                ))}
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
                <div className="lc-dharma-portal-links">
                  <Link href="/login?role=intern">Intern portal</Link>
                  <Link href="/login?role=admin">Admin access</Link>
                </div>
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
        <p>
          © 2026 Legal Connect · UDYAM-DL-11-0164811
          {" · "}
          <Link href="/privacy">Privacy</Link>
          {" · "}
          <Link href="/terms">Terms</Link>
          {" · "}
          <Link href="/refund">Refunds</Link>
        </p>
        <Link href="/login?mode=register">Create an account <ArrowRight aria-hidden="true" /></Link>
      </footer>
    </div>
  );
}
