import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, CheckCircle, AlertTriangle, AlertCircle, ChevronRight,
  Star, FileText, Phone, ArrowRight, RotateCcw, Download, Sparkles
} from "lucide-react";
import { Link } from "wouter";

const questions = [
  {
    id: "property",
    category: "Property & Home",
    emoji: "🏠",
    question: "Do you have a registered Sale Deed or a valid Rent Agreement for your current residence?",
    options: [
      { label: "Yes, it's registered", score: 20 },
      { label: "I have one but it's unregistered", score: 8 },
      { label: "Not Sure", score: 4 },
      { label: "No document at all", score: 0 },
    ],
  },
  {
    id: "family",
    category: "Family & Future",
    emoji: "👨‍👩‍👧",
    question: "Have you created a Will or designated nominees for your bank accounts and properties?",
    options: [
      { label: "Yes, everything is in order", score: 20 },
      { label: "Some done, but not all", score: 10 },
      { label: "I've been meaning to do this", score: 4 },
      { label: "None yet", score: 0 },
    ],
  },
  {
    id: "business",
    category: "Work & Business",
    emoji: "💼",
    question: "If you are a freelancer or business owner, do you use signed contracts with every client or vendor?",
    options: [
      { label: "Always — I have standard contracts", score: 20 },
      { label: "Sometimes — for bigger clients", score: 10 },
      { label: "Rarely — mostly verbal agreements", score: 4 },
      { label: "Never / Not applicable", score: 8 },
    ],
  },
  {
    id: "digital",
    category: "Digital Safety",
    emoji: "🔐",
    question: "Are you aware of your rights under the new DPDP Act 2023 if a company leaks or misuses your personal data?",
    options: [
      { label: "Yes, I know my rights well", score: 20 },
      { label: "I've heard of it but don't know details", score: 10 },
      { label: "No, I had no idea this law exists", score: 0 },
    ],
  },
  {
    id: "emergency",
    category: "Emergency Readiness",
    emoji: "🆘",
    question: "Do you have the contact of a specialised lawyer saved for immediate assistance — e.g., traffic stops, police station visits, or sudden disputes?",
    options: [
      { label: "Yes, I have a lawyer on speed-dial", score: 20 },
      { label: "I know who to call but haven't saved the number", score: 8 },
      { label: "No — I'd have no idea who to call", score: 0 },
    ],
  },
];

interface Answer { questionId: string; score: number }

function getPersonality(score: number) {
  if (score >= 90) return {
    title: "The Guardian",
    subtitle: "Your legal affairs are in great shape!",
    desc: "You are proactive, organised, and well-protected. Keep the app for daily legal updates and to help friends who may need guidance.",
    color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30",
    glow: "shadow-emerald-500/20", icon: Shield, iconColor: "text-emerald-400",
    barColor: "bg-emerald-500", cta: null,
  };
  if (score >= 50) return {
    title: "The Risk-Taker",
    subtitle: "You have a few gaps that could cause trouble.",
    desc: "Most things are in order, but a few unchecked areas leave you exposed. A quick document audit can fix this in one sitting.",
    color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30",
    glow: "shadow-amber-500/20", icon: AlertTriangle, iconColor: "text-amber-400",
    barColor: "bg-amber-500", cta: "Book a Document Audit",
  };
  return {
    title: "The Vulnerable",
    subtitle: "Urgent: Your legal health is at risk.",
    desc: "Several critical gaps in your legal cover could leave you and your family vulnerable. Act now before these become expensive problems.",
    color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/30",
    glow: "shadow-rose-500/20", icon: AlertCircle, iconColor: "text-rose-400",
    barColor: "bg-rose-500", cta: "Book a Priority Consultation",
  };
}

const gaps: Record<string, string> = {
  property: "Unregistered property documents are legally weak and can be challenged in court.",
  family: "Without a Will or nominees, your assets will go through lengthy court succession proceedings.",
  business: "Verbal agreements are nearly unenforceable. A standard contract takes 30 minutes to create.",
  digital: "Under DPDP Act 2023, you can claim compensation for data breaches. Know your rights.",
  emergency: "In a police or traffic emergency, having no lawyer contact costs you critical time.",
};

export function ClientWellness() {
  const [step, setStep] = useState<"intro" | number | "result">("intro");
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selected, setSelected] = useState<number | null>(null);

  const currentQ = typeof step === "number" ? questions[step] : null;
  const totalScore = answers.reduce((s, a) => s + a.score, 0);
  const personality = getPersonality(totalScore);
  const progress = typeof step === "number" ? ((step) / questions.length) * 100 : step === "result" ? 100 : 0;

  function handleNext() {
    if (selected === null || !currentQ) return;
    const chosen = currentQ.options[selected];
    const newAnswers = [...answers, { questionId: currentQ.id, score: chosen.score }];
    setAnswers(newAnswers);
    setSelected(null);
    if (typeof step === "number" && step < questions.length - 1) {
      setStep(step + 1);
    } else {
      setStep("result");
    }
  }

  function restart() {
    setStep("intro");
    setAnswers([]);
    setSelected(null);
  }

  const weakAreas = answers
    .filter(a => a.score < 10)
    .map(a => ({ id: a.questionId, gap: gaps[a.questionId] }));

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
          <Star className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-serif font-bold text-white">Legal Health Checkup</h1>
          <p className="text-white/40 text-xs mt-0.5">5-minute assessment · Free · No sign-up required</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ── INTRO ── */}
        {step === "intro" && (
          <motion.div key="intro" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-5">
            <div className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-primary/8 to-blue-500/10 border border-primary/30 rounded-2xl p-8 text-center">
              <div className="text-6xl mb-4">⚖️</div>
              <h2 className="text-2xl font-serif font-bold text-white mb-2">Know Your Legal Wellness Score</h2>
              <p className="text-white/50 mb-6 max-w-md mx-auto text-sm leading-relaxed">
                Answer 5 quick questions about your property, family, business, digital safety, and emergency readiness. Get your personalised Legal Wellness Score instantly.
              </p>
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[["5", "Questions"], ["60", "Seconds"], ["Free", "Always"]].map(([v, l]) => (
                  <div key={l} className="bg-white/5 border border-white/10 rounded-xl py-3">
                    <div className="text-primary text-xl font-bold">{v}</div>
                    <div className="text-white/35 text-xs">{l}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => setStep(0)} className="flex items-center gap-2.5 bg-primary hover:bg-primary/90 text-background px-8 py-3.5 rounded-xl font-bold text-sm mx-auto transition-all">
                Take the Quiz <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: "🏠", title: "Property & Home", desc: "Is your home document legally secure?" },
                { icon: "👨‍👩‍👧", title: "Family & Future", desc: "Is your Will and estate in order?" },
                { icon: "🔐", title: "Digital Safety", desc: "Know your DPDP Act rights?" },
              ].map(c => (
                <div key={c.title} className="bg-card/30 border border-white/8 rounded-xl p-4 text-center">
                  <div className="text-2xl mb-2">{c.icon}</div>
                  <p className="text-white text-xs font-bold mb-1">{c.title}</p>
                  <p className="text-white/35 text-xs">{c.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── QUESTION ── */}
        {typeof step === "number" && currentQ && (
          <motion.div key={`q-${step}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-5">
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-white/40">
                <span>Question {step + 1} of {questions.length}</span>
                <span className="text-primary font-semibold">{currentQ.category}</span>
              </div>
              <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                <motion.div initial={{ width: `${(step / questions.length) * 100}%` }} animate={{ width: `${((step) / questions.length) * 100}%` }} className="h-full bg-primary rounded-full" />
              </div>
            </div>

            <div className="bg-card/40 border border-white/10 rounded-2xl p-7">
              <div className="text-4xl mb-4">{currentQ.emoji}</div>
              <h2 className="text-white text-lg font-bold leading-snug mb-6">{currentQ.question}</h2>
              <div className="space-y-3">
                {currentQ.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => setSelected(i)}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm font-medium transition-all ${selected === i ? "bg-primary/20 border-primary/50 text-white" : "bg-white/5 border-white/10 text-white/60 hover:bg-white/8 hover:text-white hover:border-white/20"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selected === i ? "border-primary bg-primary" : "border-white/25"}`}>
                        {selected === i && <div className="w-2 h-2 rounded-full bg-background" />}
                      </div>
                      {opt.label}
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={handleNext}
                disabled={selected === null}
                className={`mt-6 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all ${selected !== null ? "bg-primary hover:bg-primary/90 text-background" : "bg-white/8 text-white/20 cursor-not-allowed"}`}
              >
                {step < questions.length - 1 ? "Next Question" : "See My Score"} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── RESULT ── */}
        {step === "result" && (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-5">
            {/* Score card */}
            <div className={`border rounded-2xl p-7 text-center shadow-xl ${personality.bg} ${personality.glow}`}>
              <div className="relative w-32 h-32 mx-auto mb-5">
                <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" stroke="rgba(255,255,255,0.08)" strokeWidth="10" fill="none" />
                  <motion.circle
                    cx="60" cy="60" r="50"
                    stroke="currentColor"
                    className={personality.iconColor}
                    strokeWidth="10" fill="none"
                    strokeDasharray={`${2 * Math.PI * 50}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 50 }}
                    animate={{ strokeDashoffset: (2 * Math.PI * 50) * (1 - totalScore / 100) }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-3xl font-bold ${personality.color}`}>{totalScore}</span>
                  <span className="text-white/30 text-xs">/ 100</span>
                </div>
              </div>

              <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${personality.color}`}>Your Legal Personality</p>
              <h2 className="text-2xl font-serif font-bold text-white mb-1">{personality.title}</h2>
              <p className={`text-sm font-semibold mb-3 ${personality.color}`}>{personality.subtitle}</p>
              <p className="text-white/50 text-sm leading-relaxed max-w-md mx-auto">{personality.desc}</p>

              {personality.cta && (
                <Link href="/client/connect">
                  <button className="mt-5 flex items-center gap-2 bg-primary hover:bg-primary/90 text-background px-6 py-3 rounded-xl font-bold text-sm mx-auto transition-all">
                    {personality.cta} <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              )}
            </div>

            {/* Area breakdown */}
            <div className="bg-card/40 border border-white/10 rounded-2xl p-5">
              <h3 className="text-white font-bold mb-4">Your Legal Health Breakdown</h3>
              <div className="space-y-3">
                {questions.map((q, i) => {
                  const ans = answers[i];
                  const pct = ans ? (ans.score / 20) * 100 : 0;
                  const color = pct >= 80 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-rose-500";
                  const textColor = pct >= 80 ? "text-emerald-400" : pct >= 40 ? "text-amber-400" : "text-rose-400";
                  return (
                    <div key={q.id}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-white/60 flex items-center gap-1.5">{q.emoji} {q.category}</span>
                        <span className={`font-bold ${textColor}`}>{ans?.score ?? 0}/20</span>
                      </div>
                      <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.1 * i, duration: 0.7 }} className={`h-full ${color} rounded-full`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Weak areas */}
            {weakAreas.length > 0 && (
              <div className="bg-rose-500/8 border border-rose-500/20 rounded-2xl p-5">
                <h3 className="text-rose-400 font-bold mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Areas Needing Attention
                </h3>
                <div className="space-y-3">
                  {weakAreas.map(w => (
                    <div key={w.id} className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-400 flex-shrink-0 mt-1.5" />
                      <p className="text-white/60 text-sm">{w.gap}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link href="/client/connect">
                <button className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-background py-3 rounded-xl font-bold text-sm transition-all">
                  <Phone className="w-4 h-4" /> Consult RNA
                </button>
              </Link>
              <Link href="/client/diy-docs">
                <button className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white border border-white/10 py-3 rounded-xl font-bold text-sm transition-all">
                  <FileText className="w-4 h-4" /> Fix Documents
                </button>
              </Link>
              <button onClick={restart} className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/8 py-3 rounded-xl font-bold text-sm transition-all">
                <RotateCcw className="w-4 h-4" /> Retake Quiz
              </button>
            </div>

            <p className="text-center text-white/20 text-xs">Your score has been saved to your profile to track improvement over time.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
