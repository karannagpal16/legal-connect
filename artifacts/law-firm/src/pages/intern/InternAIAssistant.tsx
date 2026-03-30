import { Sparkles, FileText, BookOpen, HelpCircle, Gavel } from "lucide-react";
import { motion } from "framer-motion";
import { AIChat } from "@/components/AIChat";

const quickPrompts = [
  "Draft a simple bail application under BNSS",
  "Explain the difference between FIR and complaint",
  "Draft a legal notice for non-payment of dues",
  "What are the essentials of a valid contract?",
  "Explain res judicata in simple terms",
  "Draft a summary of BNS Section 103",
  "What documents are needed for a consumer complaint?",
];

const templates = [
  { icon: FileText, title: "Bail Application", desc: "Under BNSS Section 479", prompt: "Draft a comprehensive bail application under BNSS Section 479 for a case of cheating under BNS Section 318." },
  { icon: Gavel, title: "Legal Notice", desc: "Demand / Cease & Desist", prompt: "Draft a legal notice for recovery of money loan of Rs. 2,00,000 not repaid despite repeated requests." },
  { icon: BookOpen, title: "Case Brief", desc: "Supreme Court format", prompt: "Draft a case brief template in standard Supreme Court of India format including facts, issues, arguments, and judgment sections." },
  { icon: HelpCircle, title: "Affidavit", desc: "General purpose format", prompt: "Draft a general purpose affidavit template in proper Indian legal format with all necessary components." },
];

export function InternAIAssistant() {
  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <Sparkles className="w-7 h-7 text-emerald-400" />
          <h1 className="text-3xl font-serif font-bold text-white">AI Legal Assistant</h1>
        </div>
        <p className="text-white/40 ml-10">Ask legal doubts, draft templates, and get instant answers. Powered by AI.</p>
      </motion.div>

      {/* Template quick starters */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3">Quick Templates</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {templates.map((t, i) => (
            <motion.div
              key={t.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i }}
            >
              <div className="bg-card/40 border border-emerald-500/15 rounded-2xl p-4 cursor-pointer hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all group">
                <t.icon className="w-6 h-6 text-emerald-400 mb-2" />
                <p className="text-white text-sm font-semibold">{t.title}</p>
                <p className="text-white/30 text-xs">{t.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* AI Chat */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card/40 border border-emerald-500/20 rounded-3xl p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-white font-bold">LexBot — Your Legal AI</h3>
            <p className="text-emerald-400 text-xs">Intern Edition · Drafting & Procedure Expert</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400">Online</span>
          </div>
        </div>

        <AIChat
          context="intern"
          placeholder="Ask a legal doubt or request a template draft..."
          systemGreeting="Hello! I'm LexBot, your AI legal assistant. I can help you with:

• Explaining legal concepts and sections (IPC/BNS, CrPC/BNSS, CPC, etc.)
• Drafting bail applications, legal notices, affidavits, petitions
• Answering procedural doubts about Indian courts
• Reviewing and improving your legal drafts

What would you like help with today?"
          accentColor="text-emerald-400"
          borderColor="border-emerald-500/20"
          bgColor="bg-emerald-500/10"
          iconColor="text-emerald-400"
          quickPrompts={quickPrompts}
        />
      </motion.div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-amber-400 text-sm font-semibold mb-1">Important Disclaimer</p>
          <p className="text-white/50 text-xs leading-relaxed">
            All templates and explanations provided by LexBot are for learning purposes only.
            Always review AI-generated drafts with a senior advocate before filing or sending them.
            The law is dynamic — verify all citations against current statutes.
          </p>
        </div>
      </div>
    </div>
  );
}
