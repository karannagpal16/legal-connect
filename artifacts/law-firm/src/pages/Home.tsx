import { useEffect, useState, type ElementType } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  BriefcaseBusiness,
  ChevronDown,
  Cloud,
  Headphones,
  LockKeyhole,
  LogIn,
  MessageCircle,
  Play,
  Quote,
  Scale,
  Shield,
  Smartphone,
  Users,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { enterPortal } from "@/pages/auth/AuthPages";
import type { Portal } from "@/lib/authFlow";

const quotes = [
  {
    sanskrit: "यतो धर्मस्ततो जयः",
    english: "Where there is Dharma, there is Victory.",
    source: "Mahabharata",
  },
  {
    sanskrit: "धर्मो रक्षति रक्षितः",
    english: "Dharma protects those who protect it.",
    source: "Manusmriti",
  },
  {
    sanskrit: "सत्यमेव जयते",
    english: "Truth alone triumphs.",
    source: "Mundaka Upanishad",
  },
  {
    sanskrit: "Justice should not be delayed by confusion.",
    english: "Every matter deserves clarity, control, and a next step.",
    source: "Legal Connect",
  },
];

const trustLogos = [
  "KHURANA & KHURANA",
  "LEX SHIELD",
  "SINGH & ASSOCIATES",
  "VERITAS LEGAL",
  "JURIS CHAMBERS",
];

const features = [
  { icon: Shield, title: "Bank-Grade Security", text: "Private matter data, guarded sessions, and role-specific workspaces." },
  { icon: Scale, title: "Dharma-Centric Approach", text: "A serious legal platform shaped around clarity, fairness, and accountability." },
  { icon: Cloud, title: "All-in-One Platform", text: "Cases, documents, court missions, reminders, receipts, and communication." },
  { icon: Smartphone, title: "Anywhere, Anytime", text: "Access your legal workspace cleanly across desktop and mobile." },
  { icon: Headphones, title: "Priority Support", text: "Clear escalation paths when a matter, booking, or mission needs attention." },
];

function DharmaChakra({ size = 52 }: { size?: number }) {
  const r = size / 2;
  const cx = r;
  const cy = r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <defs>
        <linearGradient id="lc-chakra-gold" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#f0d58f" />
          <stop offset="48%" stopColor="#cda45e" />
          <stop offset="100%" stopColor="#8f6330" />
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r * 0.82} fill="none" stroke="url(#lc-chakra-gold)" strokeWidth="2.2" />
      <circle cx={cx} cy={cy} r={r * 0.58} fill="none" stroke="url(#lc-chakra-gold)" strokeWidth="1.2" opacity="0.85" />
      <circle cx={cx} cy={cy} r={r * 0.13} fill="url(#lc-chakra-gold)" />
      {Array.from({ length: 24 }).map((_, index) => {
        const angle = (index * 15 * Math.PI) / 180;
        const start = r * 0.17;
        const end = r * 0.72;
        return (
          <line
            key={index}
            x1={cx + start * Math.cos(angle)}
            y1={cy + start * Math.sin(angle)}
            x2={cx + end * Math.cos(angle)}
            y2={cy + end * Math.sin(angle)}
            stroke="url(#lc-chakra-gold)"
            strokeWidth={index % 3 === 0 ? 1.1 : 0.65}
            opacity={index % 3 === 0 ? 1 : 0.72}
          />
        );
      })}
    </svg>
  );
}

function QuoteCard() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setActive((current) => (current + 1) % quotes.length), 4200);
    return () => window.clearInterval(timer);
  }, []);

  const quote = quotes[active];

  return (
    <div className="relative min-h-[178px] overflow-hidden rounded-lg border border-[#cda45e42] bg-[#07101d99] p-6 shadow-[0_22px_80px_rgba(0,0,0,0.34)] backdrop-blur-md">
      <Quote className="mb-5 h-7 w-7 text-[#cda45e]" />
      <AnimatePresence mode="wait">
        <motion.div
          key={quote.sanskrit}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
        >
          <p className="font-serif text-xl font-bold leading-relaxed text-[#f3ead7]">{quote.sanskrit}</p>
          <p className="mt-3 max-w-xs text-sm leading-6 text-[#f2e9d5]">{quote.english}</p>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#cda45e]">- {quote.source}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function PortalPanel({
  portal,
  eyebrow,
  title,
  text,
  action,
  icon: Icon,
  image,
}: {
  portal: Portal;
  eyebrow: string;
  title: string;
  text: string;
  action: string;
  icon: ElementType;
  image: string;
}) {
  const [, navigate] = useLocation();

  return (
    <button
      onClick={() => enterPortal(portal, navigate)}
      className="group relative min-h-[260px] overflow-hidden rounded-lg border border-[#cda45e47] bg-[#101b2d] text-left shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
    >
      <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-[0.58] transition duration-500 group-hover:scale-[1.04] group-hover:opacity-70" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#07101df2] via-[#07101dc2] to-[#07101d38]" />
      <div className="relative flex h-full min-h-[260px] flex-col justify-center p-7 sm:p-9">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-[#cda45e66] bg-[#cda45e17]">
          <Icon className="h-5 w-5 text-[#e2c27b]" />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#cda45e]">{eyebrow}</p>
        <h3 className="mt-3 max-w-[310px] font-serif text-2xl font-bold leading-tight text-[#f3ead7]">{title}</h3>
        <p className="mt-4 max-w-[330px] text-sm leading-6 text-[#d9cfba]">{text}</p>
        <span className="mt-6 inline-flex w-fit items-center gap-3 rounded-md bg-[#cda45e] px-5 py-3 text-sm font-bold text-[#08111f] transition group-hover:bg-[#e2c27b]">
          {action} <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </button>
  );
}

export function Home() {
  const [, navigate] = useLocation();

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050b14] text-[#f3ead7]">
      <section className="relative min-h-screen overflow-hidden">
        <img
          src="/images/premium-legal-connect-reference.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-72"
          style={{ objectPosition: "72% center" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_35%,rgba(205,164,94,0.2),transparent_24%),linear-gradient(90deg,#050b14_0%,rgba(5,11,20,0.94)_30%,rgba(5,11,20,0.58)_58%,rgba(5,11,20,0.35)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#050b14] to-transparent" />

        <header className="relative z-10 mx-auto flex max-w-[1500px] items-center justify-between px-6 py-7 sm:px-10 lg:px-12">
          <Link href="/" className="flex items-center gap-4">
            <DharmaChakra size={58} />
            <div>
              <p className="text-xl font-extrabold tracking-[0.08em] text-white sm:text-2xl">LEGAL CONNECT</p>
              <p className="mt-1 text-sm font-semibold text-[#cda45e]">Serve Dharma. Deliver Justice.</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-9 text-sm font-semibold text-white lg:flex">
            <button onClick={() => enterPortal("advocate", navigate)} className="flex items-center gap-1 hover:text-[#e2c27b]">
              For Professionals <ChevronDown className="h-4 w-4" />
            </button>
            <button onClick={() => enterPortal("client", navigate)} className="hover:text-[#e2c27b]">For People</button>
            <a href="#features" className="hover:text-[#e2c27b]">Features</a>
            <a href="#security" className="hover:text-[#e2c27b]">Security</a>
            <a href="#pricing" className="hover:text-[#e2c27b]">Pricing</a>
            <a href="#about" className="hover:text-[#e2c27b]">About Us</a>
          </nav>

          <button
            onClick={() => enterPortal("client", navigate)}
            className="inline-flex items-center gap-3 rounded-md border border-[#cda45e80] bg-[#07101d80] px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-[#cda45e] hover:text-[#08111f]"
          >
            <LogIn className="h-4 w-4" /> Login
          </button>
        </header>

        <div className="relative z-10 mx-auto grid max-w-[1500px] grid-cols-1 items-center gap-10 px-6 pb-10 pt-14 sm:px-10 lg:grid-cols-[1fr_0.92fr] lg:px-12 lg:pt-20">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }}>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#cda45e]">India's Litigation Operating System</p>
            <h1 className="mt-7 max-w-3xl font-serif text-5xl font-bold leading-[1.04] text-white sm:text-7xl lg:text-[5.7rem]">
              Law. Simplified.
              <span className="block">Justice. <span className="text-[#cda45e]">Empowered.</span></span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[#f2e9d5] sm:text-xl">
              An all-in-one platform for legal professionals and individuals. Manage cases, connect with counsel,
              and navigate the legal system with clarity, confidence, and control.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-5">
              <button
                onClick={() => enterPortal("client", navigate)}
                className="inline-flex items-center gap-4 rounded-md bg-[#cda45e] px-7 py-4 text-base font-bold text-[#08111f] shadow-[0_18px_50px_rgba(205,164,94,0.24)] transition hover:bg-[#e2c27b]"
              >
                Explore Platform <ArrowRight className="h-5 w-5" />
              </button>
              <button className="inline-flex items-center gap-3 text-base font-semibold text-white transition hover:text-[#e2c27b]">
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/70">
                  <Play className="h-4 w-4 fill-white" />
                </span>
                See How It Works
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.65 }}
            className="grid gap-5 lg:justify-items-start"
          >
            <QuoteCard />
            <div className="hidden rounded-lg border border-[#cda45e30] bg-[#07101d75] px-5 py-4 text-sm leading-6 text-[#d9cfba] backdrop-blur-md lg:block">
              <span className="font-bold text-[#e2c27b]">Live workspace preview:</span> role-aware dashboards,
              court missions, secure matter rooms, and clear next actions.
            </div>
          </motion.div>
        </div>
      </section>

      <section className="relative border-y border-[#cda45e24] bg-[#07101d] px-6 py-6 sm:px-10">
        <p className="text-center text-xs font-bold uppercase tracking-[0.28em] text-[#cda45e]">Trusted by legal professionals across India</p>
        <div className="mx-auto mt-5 grid max-w-6xl grid-cols-2 gap-5 text-center text-xs font-bold uppercase tracking-[0.08em] text-[#d9cfba] opacity-80 sm:grid-cols-5">
          {trustLogos.map((name) => (
            <div key={name} className="rounded-md border border-white/8 bg-white/[0.03] px-3 py-4">{name}</div>
          ))}
        </div>
      </section>

      <section className="bg-[#050b14] px-6 py-10 sm:px-10">
        <div className="mx-auto grid max-w-[1500px] gap-5 lg:grid-cols-2">
          <PortalPanel
            portal="client"
            eyebrow="For People"
            title="Your Legal Journey, Simplified."
            text="Track your matters, get updates, connect with trusted advocates, and access legal help without losing the plot."
            action="Continue as Client"
            icon={Users}
            image="/news/news-3.png"
          />
          <PortalPanel
            portal="advocate"
            eyebrow="For Legal Professionals"
            title="Power Your Practice. Elevate Justice."
            text="Manage cases, teams, court missions, documents, clients, and follow-ups from one serious workspace."
            action="Professional Login"
            icon={BriefcaseBusiness}
            image="/images/law-library-bg.png"
          />
        </div>
      </section>

      <section id="features" className="bg-[#050b14] px-6 pb-12 sm:px-10">
        <div className="mx-auto grid max-w-[1500px] gap-4 border-t border-[#cda45e24] pt-8 sm:grid-cols-2 lg:grid-cols-5">
          {features.map((feature) => (
            <article key={feature.title} className="min-h-[150px] border-r border-[#cda45e24] pr-5 last:border-r-0">
              <feature.icon className="h-7 w-7 text-[#cda45e]" />
              <h3 className="mt-4 text-base font-bold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#c9bea8]">{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="security" className="border-t border-[#cda45e24] bg-[#07101d] px-6 py-10 sm:px-10">
        <div className="mx-auto grid max-w-[1500px] gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#cda45e]">Security & Roles</p>
            <h2 className="mt-4 font-serif text-4xl font-bold text-white">Every portal knows who belongs where.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["Client", "Private matters, bookings, documents"],
              ["Advocate", "Cases, diary, proxy hub, revenue"],
              ["Intern", "Missions, XP, learning, review gates"],
            ].map(([title, text]) => (
              <div key={title} className="rounded-lg border border-[#cda45e30] bg-white/[0.035] p-5">
                <LockKeyhole className="h-5 w-5 text-[#e2c27b]" />
                <h3 className="mt-4 font-bold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#c9bea8]">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-[#050b14] px-6 py-8 text-center text-xs font-semibold uppercase tracking-[0.22em] text-[#c9bea8] sm:px-10">
        <MessageCircle className="mx-auto mb-3 h-5 w-5 text-[#cda45e]" />
        Legal Connect - Serve Dharma. Deliver Justice.
      </footer>
    </main>
  );
}
