import { useState } from "react";
import { BookOpen, Shield, Home, Car, Briefcase, Heart, ChevronDown, ChevronUp, ExternalLink, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";

interface Guide {
  id: number;
  title: string;
  icon: typeof Shield;
  color: string;
  bg: string;
  intro: string;
  steps: string[];
  rights: string[];
  whenToHireAdvocate: string;
}

const guides: Guide[] = [
  {
    id: 1,
    title: "Someone Filed an FIR Against Me",
    icon: Shield,
    color: "text-rose-400",
    bg: "bg-rose-500/10 border-rose-500/20",
    intro: "Don't panic. An FIR (First Information Report) is just the beginning of an investigation — it is NOT a judgment. You have rights.",
    steps: [
      "Get a copy of the FIR from the police station (you have a right to it).",
      "Read the sections mentioned in the FIR and understand what you're accused of.",
      "Contact a lawyer immediately — even for a bail application if you're arrested.",
      "If you fear arrest, you can file for Anticipatory Bail under Section 438 CrPC (now BNSS 484).",
      "Cooperate with investigation but do NOT make any statement without your lawyer present.",
      "Collect any evidence that supports your innocence — messages, bills, witnesses.",
    ],
    rights: [
      "Right to be informed of the grounds of arrest",
      "Right to consult a lawyer of your choice",
      "Right to be produced before a magistrate within 24 hours",
      "Right to remain silent — anything you say can be used against you",
      "Right to apply for bail",
      "Right to free legal aid if you cannot afford a lawyer",
    ],
    whenToHireAdvocate: "Hire an advocate immediately if an FIR is filed against you — especially before making any statement to police.",
  },
  {
    id: 2,
    title: "My Landlord is Harassing Me",
    icon: Home,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    intro: "Tenant rights are strong in India. You cannot be forcibly evicted without a court order. Here's what to do.",
    steps: [
      "Check your rent agreement — understand the terms, notice period, and exit clauses.",
      "Document all harassment — save messages, emails, record conversations if possible.",
      "Send a formal legal notice to the landlord demanding they stop harassment.",
      "If eviction threats continue, file a complaint with the Rent Controller in your city.",
      "For illegal lock-out or forcible eviction, file an FIR for trespass and criminal intimidation.",
      "Approach the District Court for an injunction to prevent illegal eviction.",
    ],
    rights: [
      "Right to peaceful enjoyment of the rented property",
      "Cannot be evicted without a court order",
      "Right to proper notice period before eviction (usually 15-30 days as per agreement)",
      "Right to return of security deposit after vacating",
      "Right to proper receipts for all rent payments",
      "Protection from illegal lockout under Section 441 BNS (trespass)",
    ],
    whenToHireAdvocate: "If your landlord threatens eviction without cause, changes locks, or cuts utilities — contact an advocate immediately.",
  },
  {
    id: 3,
    title: "I Got Cheated by a Company / Product",
    icon: Briefcase,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    intro: "Consumer protection laws in India are strong. You can get a refund, compensation, AND penalties against the company.",
    steps: [
      "Keep all bills, receipts, emails, screenshots — this is your evidence.",
      "Send a written complaint/legal notice to the company first (required before going to forum).",
      "If unresolved in 30 days, file a complaint with the District Consumer Disputes Redressal Commission.",
      "For purchases up to Rs. 1 crore, file at District level. Up to Rs. 10 crore — State level. Above — National.",
      "You can file the complaint yourself — no advocate required! (though one helps).",
      "You can claim refund + compensation + mental harassment damages + litigation costs.",
    ],
    rights: [
      "Right to be protected from hazardous goods and services",
      "Right to be informed about quality, quantity, and price",
      "Right to seek redressal against unfair trade practices",
      "Right to consumer education",
      "Right to compensation for deficiency in service",
      "Protection from misleading advertisements",
    ],
    whenToHireAdvocate: "You can often file consumer complaints yourself, but hire an advocate for high-value claims or complex cases.",
  },
  {
    id: 4,
    title: "My Employer is Not Paying Salary",
    icon: Briefcase,
    color: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/20",
    intro: "Non-payment of salary is both illegal and actionable. You have multiple legal remedies.",
    steps: [
      "Send a written demand letter to your employer by email (creates a paper trail).",
      "Check if you're covered by the Payment of Wages Act, 1936 or the Shops & Establishments Act.",
      "File a complaint with the Labour Commissioner / Labour Court in your city.",
      "For notice pay disputes, file under Industrial Disputes Act or in Civil Court.",
      "You can also file a criminal complaint under Section 406 IPC (criminal breach of trust).",
      "File a case in the Labour Court — the process is usually quicker than civil courts.",
    ],
    rights: [
      "Right to timely payment of wages",
      "Right to payment of overtime as per labour laws",
      "Right to earned leave encashment",
      "Right to full and final settlement on resignation",
      "Protection from illegal deductions",
      "Right to provident fund contributions",
    ],
    whenToHireAdvocate: "For unpaid salaries above Rs. 1 lakh, or if your employer is retaliating — hire an advocate for the Labour Court.",
  },
  {
    id: 5,
    title: "Divorce / Marriage Issues",
    icon: Heart,
    color: "text-pink-400",
    bg: "bg-pink-500/10 border-pink-500/20",
    intro: "Family law can be complex and emotionally difficult. Here's a simple guide to understanding your options.",
    steps: [
      "For mutual divorce, both parties must agree and file a joint petition (6 months cooling period).",
      "For contested divorce, file a petition citing grounds: cruelty, desertion, adultery, or conversion.",
      "For maintenance, file under Section 125 CrPC (now BNSS) or personal law for interim relief.",
      "For domestic violence, file an application under Protection of Women from Domestic Violence Act 2005.",
      "For child custody, the court always considers the best interest of the child.",
      "Always try mediation first — it's faster, cheaper, and less traumatic.",
    ],
    rights: [
      "Right to maintenance from spouse",
      "Right to live in the matrimonial home (for women, under DV Act)",
      "Right to child custody based on best interest of child",
      "Protection under Protection of Women from Domestic Violence Act 2005",
      "Right to share of marital property in certain cases",
      "Right to alimony/permanent maintenance after divorce",
    ],
    whenToHireAdvocate: "In all family matters — especially divorce, custody, and domestic violence — hire an experienced family advocate.",
  },
];

export function ClientLegalGuide() {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"steps" | "rights">("steps");

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <BookOpen className="w-7 h-7 text-blue-400" />
          <h1 className="text-3xl font-serif font-bold text-[#1A2E2A]">Law Made Simple</h1>
        </div>
        <p className="text-[#1A2E2A]/40 ml-10">Plain language guides for common legal situations. No jargon, just clarity.</p>
      </motion.div>

      {/* Intro banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 flex items-start gap-4"
      >
        <AlertCircle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-blue-400 font-semibold mb-1">You are not alone — and the law is on your side.</p>
          <p className="text-[#1A2E2A]/50 text-sm leading-relaxed">
            These guides cover the most common legal situations faced by ordinary people in India. 
            Each guide explains your rights, what steps to take, and when to call a lawyer. 
            Remember: knowledge of your rights is your first shield.
          </p>
        </div>
      </motion.div>

      {/* Guide cards */}
      <div className="space-y-4">
        {guides.map((guide, i) => (
          <motion.div
            key={guide.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * i }}
            className={`border rounded-2xl overflow-hidden transition-all ${guide.bg} ${expandedId === guide.id ? "" : "hover:opacity-90"}`}
          >
            <button
              className="w-full p-5 flex items-center gap-4 text-left"
              onClick={() => setExpandedId(expandedId === guide.id ? null : guide.id)}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-[#1A2E2A]/10`}>
                <guide.icon className={`w-6 h-6 ${guide.color}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-[#1A2E2A] font-bold text-base">{guide.title}</h3>
                <p className="text-[#1A2E2A]/40 text-xs mt-0.5 line-clamp-1">{guide.intro}</p>
              </div>
              {expandedId === guide.id ? (
                <ChevronUp className={`w-5 h-5 ${guide.color} flex-shrink-0`} />
              ) : (
                <ChevronDown className={`w-5 h-5 ${guide.color} flex-shrink-0`} />
              )}
            </button>

            <AnimatePresence>
              {expandedId === guide.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-t border-[#1A2E2A]/10 bg-background/60"
                >
                  <div className="p-5">
                    <p className="text-[#1A2E2A]/70 text-sm mb-5 leading-relaxed">{guide.intro}</p>

                    {/* Tabs */}
                    <div className="flex gap-2 mb-5">
                      {(["steps", "rights"] as const).map(tab => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                            activeTab === tab
                              ? `${guide.bg} ${guide.color}`
                              : "bg-[#1A2E2A]/5 text-[#1A2E2A]/40 hover:text-[#1A2E2A]/60"
                          }`}
                        >
                          {tab === "steps" ? "What To Do" : "Your Rights"}
                        </button>
                      ))}
                    </div>

                    {activeTab === "steps" && (
                      <ol className="space-y-3">
                        {guide.steps.map((step, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-sm">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-[#1A2E2A]/10 ${guide.color}`}>
                              {idx + 1}
                            </span>
                            <span className="text-[#1A2E2A]/70 leading-relaxed">{step}</span>
                          </li>
                        ))}
                      </ol>
                    )}

                    {activeTab === "rights" && (
                      <ul className="space-y-3">
                        {guide.rights.map((right, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-sm">
                            <Shield className={`w-4 h-4 mt-0.5 flex-shrink-0 ${guide.color}`} />
                            <span className="text-[#1A2E2A]/70 leading-relaxed">{right}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-5 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                      <p className="text-amber-400 text-xs font-bold mb-1 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" /> When to Hire an Advocate
                      </p>
                      <p className="text-[#1A2E2A]/50 text-xs leading-relaxed">{guide.whenToHireAdvocate}</p>
                    </div>

                    <div className="flex gap-3 mt-4">
                      <Link href="/client/book">
                        <button className="flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 px-4 py-2 rounded-xl text-sm font-bold transition-all">
                          Book an Advocate
                        </button>
                      </Link>
                      <Link href="/client/ai-assistant">
                        <button className="flex items-center gap-2 bg-[#1A2E2A]/5 hover:bg-[#1A2E2A]/10 text-[#1A2E2A]/60 border border-[#1A2E2A]/10 px-4 py-2 rounded-xl text-sm font-bold transition-all">
                          Ask AI
                        </button>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
