import { Sparkles, Shield, HelpCircle, FileText, Scale } from "lucide-react";
import { motion } from "framer-motion";
import { AIChat } from "@/components/AIChat";

const quickPrompts = [
  "What are my rights if police arrest me?",
  "My landlord is not returning my deposit",
  "How do I file a consumer complaint?",
  "Draft a simple rent agreement",
  "What to do if my cheque bounced?",
  "Explain Section 498A in simple words",
  "What is anticipatory bail?",
  "How to file an FIR?",
];

const features = [
  {
    icon: Shield,
    title: "Know Your Rights",
    desc: "Understand your legal rights in everyday situations — police, property, employment.",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/10",
  },
  {
    icon: FileText,
    title: "Document Drafting",
    desc: "Get a draft for any basic document — rent agreement, affidavit, legal notice.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/10",
  },
  {
    icon: Scale,
    title: "Plain Language Law",
    desc: "Legal sections and judgments explained simply, without complex jargon.",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/10",
  },
  {
    icon: HelpCircle,
    title: "Step-by-Step Guidance",
    desc: "Stuck in a legal situation? Get step-by-step guidance on what to do next.",
    color: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/10",
  },
];

export function ClientAIAssistant() {
  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <Sparkles className="w-7 h-7 text-blue-400" />
          <h1 className="text-3xl font-serif font-bold text-white">AI Legal Assistant</h1>
        </div>
        <p className="text-white/40 ml-10">Ask any legal question in plain language — LexBot understands.</p>
      </motion.div>

      {/* Feature pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07 * i }}
            className={`border rounded-2xl p-4 ${f.bg}`}
          >
            <f.icon className={`w-6 h-6 mb-2 ${f.color}`} />
            <p className="text-white text-xs font-bold mb-1">{f.title}</p>
            <p className="text-white/30 text-xs leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Chat box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card/40 border border-blue-500/20 rounded-3xl p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-white font-bold">LexBot — AI Legal Assistant</h3>
            <p className="text-blue-400 text-xs">Client Edition · Your Friendly Legal Guide</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs text-blue-400">Online</span>
          </div>
        </div>

        <AIChat
          context="client"
          placeholder="Ask anything — in Hindi or English..."
          systemGreeting={`Namaste! 🙏 Main LexBot hoon — aapka AI legal assistant.

I can help you with:

⚖️ Understanding your legal rights (FIR, property, rent, divorce, consumer issues)
📄 Drafting basic documents (rent agreement, affidavit, legal notice)
🗣️ Explaining legal terms in simple language — Hindi or English, your choice!
👣 Step-by-step guidance for any legal situation

Koi bhi sawal poochh sakte hain — bilkul fearless hokar. What's on your mind?`}
          accentColor="text-blue-400"
          borderColor="border-blue-500/20"
          bgColor="bg-blue-500/10"
          iconColor="text-blue-400"
          quickPrompts={quickPrompts}
        />
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
          <p className="text-blue-400 text-sm font-bold mb-1 flex items-center gap-2">
            <Shield className="w-4 h-4" /> Your Conversations are Private
          </p>
          <p className="text-white/40 text-xs leading-relaxed">
            What you ask LexBot stays between you and the AI. We do not share your legal queries with anyone.
          </p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
          <p className="text-amber-400 text-sm font-bold mb-1 flex items-center gap-2">
            <HelpCircle className="w-4 h-4" /> Need a Real Advocate?
          </p>
          <p className="text-white/40 text-xs leading-relaxed">
            LexBot is great for guidance, but for serious legal matters always consult a qualified advocate.
          </p>
        </div>
      </div>
    </div>
  );
}
