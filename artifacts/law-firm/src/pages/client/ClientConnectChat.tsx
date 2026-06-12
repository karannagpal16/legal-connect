import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Send, User, Shield, Lock, Phone, Video,
  ArrowRight, ChevronRight, Star, Clock, CheckCircle,
  MessageSquare, Zap, RotateCcw, Circle, Check, X
} from "lucide-react";

/* ─────────────────────── types ─────────────────────── */
type Phase = "chat" | "select" | "connected";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
  suggestAdvocate?: boolean;
}

interface Advocate {
  id: string;
  name: string;
  title: string;
  specialisations: string[];
  experience: string;
  fee: number;
  rating: number;
  reviews: number;
  available: boolean;
  responseTime: string;
  color: string;
  initials: string;
}

/* ─────────────────────── data ─────────────────────── */
const ADVOCATES: Advocate[] = [
  {
    id: "adv-1", name: "Adv. Arjun Mehra", title: "Senior Advocate", initials: "LC",
    specialisations: ["Criminal Law", "Property Disputes", "FIR & Bail"],
    experience: "12 years", fee: 3000, rating: 5, reviews: 148, available: true,
    responseTime: "Responds in ~5 min", color: "from-amber-500 to-orange-500",
  },
  {
    id: "adv-2", name: "Adv. Sunita Joshi", title: "Senior Advocate", initials: "SJ",
    specialisations: ["Civil Disputes", "Property Law", "Landlord-Tenant"],
    experience: "14 years", fee: 2800, rating: 4.9, reviews: 183, available: true,
    responseTime: "Responds in ~8 min", color: "from-cyan-500 to-blue-500",
  },
  {
    id: "adv-3", name: "Adv. Priya Mehrotra", title: "Senior Advocate", initials: "PM",
    specialisations: ["Consumer Protection", "Corporate Law", "Contracts"],
    experience: "11 years", fee: 2500, rating: 4.9, reviews: 121, available: false,
    responseTime: "Available from 3 PM", color: "from-emerald-500 to-teal-500",
  },
  {
    id: "adv-4", name: "Adv. Arjun Mehta", title: "Advocate", initials: "AM",
    specialisations: ["Family & Matrimonial", "Divorce", "Child Custody"],
    experience: "8 years", fee: 2000, rating: 4.7, reviews: 94, available: true,
    responseTime: "Responds in ~10 min", color: "from-blue-500 to-violet-500",
  },
  {
    id: "adv-5", name: "Adv. Vikram Bose", title: "Advocate", initials: "VB",
    specialisations: ["Tax Law", "Regulatory", "ITAT Matters"],
    experience: "7 years", fee: 1500, rating: 4.6, reviews: 67, available: true,
    responseTime: "Responds in ~15 min", color: "from-violet-500 to-purple-500",
  },
  {
    id: "adv-6", name: "Adv. Neha Kapoor", title: "Associate Advocate", initials: "NK",
    specialisations: ["Cyber Crime", "IT Law", "Online Fraud"],
    experience: "4 years", fee: 1000, rating: 4.5, reviews: 45, available: true,
    responseTime: "Responds in ~5 min", color: "from-rose-500 to-pink-500",
  },
  {
    id: "adv-7", name: "Adv. Rahul Verma", title: "Junior Advocate", initials: "RV",
    specialisations: ["Labour Law", "Employment Disputes", "PF/ESI"],
    experience: "2 years", fee: 700, rating: 4.4, reviews: 28, available: true,
    responseTime: "Responds in ~3 min", color: "from-teal-500 to-green-500",
  },
  {
    id: "adv-8", name: "Adv. Ananya Singh", title: "Junior Advocate", initials: "AS",
    specialisations: ["Consumer Disputes", "RTI", "Legal Research"],
    experience: "1 year", fee: 500, rating: 4.3, reviews: 15, available: true,
    responseTime: "Responds in ~2 min", color: "from-pink-500 to-fuchsia-500",
  },
];

const QUICK_SUGGESTIONS = [
  "What practice areas do you cover?",
  "How does a consultation work?",
  "I received a legal notice — what should I do?",
  "What documents do I need for a property case?",
  "How much does a consultation cost?",
  "I need help with a consumer complaint",
];

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

/* ─────────────────────── helpers ─────────────────────── */
function timeStr(ts: number) {
  return new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-400 text-xs">
      {"★".repeat(Math.floor(rating))}
      {rating % 1 >= 0.5 ? "½" : ""}
    </span>
  );
}

/* ─────────────────────── encrypted mock chat ─────────────────────── */
interface ConnectedMsg { id: string; from: "client" | "advocate"; text: string; ts: number }

function xorEncrypt(text: string, key = 42) {
  return btoa(text.split("").map(c => String.fromCharCode(c.charCodeAt(0) ^ key)).join(""));
}
function xorDecrypt(encoded: string, key = 42) {
  try { return atob(encoded).split("").map(c => String.fromCharCode(c.charCodeAt(0) ^ key)).join(""); }
  catch { return encoded; }
}

/* ─────────────────────── main component ─────────────────────── */
export function ClientConnectChat() {
  const [phase, setPhase] = useState<Phase>("chat");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Namaste! 🙏 I'm LexBot, your AI assistant at Legal Connect.\n\nI can help you understand general legal processes, figure out what type of issue you have, and prepare you for a consultation. For specific legal advice about your situation, I'll connect you with one of our experienced advocates.\n\nHow can I help you today?",
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [selectedAdvocate, setSelectedAdvocate] = useState<Advocate | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [connectedMessages, setConnectedMessages] = useState<ConnectedMsg[]>([]);
  const [connectedInput, setConnectedInput] = useState("");
  const [callType, setCallType] = useState<"audio" | "video" | null>(null);
  const [showAdvocateSuggestion, setShowAdvocateSuggestion] = useState(false);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const connBottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { connBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [connectedMessages]);

  // Seed a greeting from the advocate when connected
  useEffect(() => {
    if (phase === "connected" && selectedAdvocate && connectedMessages.length === 0) {
      const greeting = `Hello! I'm ${selectedAdvocate.name}. LexBot has given me a summary of your inquiry. I've reviewed it — please tell me more about your specific situation so I can advise you properly. Everything you share here is end-to-end encrypted and completely confidential.`;
      setConnectedMessages([{
        id: "adv-greeting",
        from: "advocate",
        text: xorEncrypt(greeting),
        ts: Date.now(),
      }]);
    }
  }, [phase, selectedAdvocate]);

  async function sendToAI(userText: string) {
    if (streaming) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: userText, ts: Date.now() };
    const aiId = `a-${Date.now() + 1}`;
    const aiMsg: Message = { id: aiId, role: "assistant", content: "", ts: Date.now() + 1 };

    setMessages(prev => [...prev, userMsg, aiMsg]);
    setShowSuggestions(false);
    setStreaming(true);
    setShowAdvocateSuggestion(false);

    abortRef.current = new AbortController();
    const allMsgs = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch(`${BASE_URL}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: allMsgs, context: "gateway" }),
        signal: abortRef.current.signal,
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";
      let suggestFlag = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          try {
            const parsed = JSON.parse(line.slice(5).trim());
            if (parsed.content) {
              full += parsed.content;
              // detect suggest flag
              if (full.includes("[SUGGEST_ADVOCATE]")) {
                suggestFlag = true;
                full = full.replace("[SUGGEST_ADVOCATE]", "").trimEnd();
              }
              setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: full, suggestAdvocate: suggestFlag } : m));
            }
          } catch { /* ignore */ }
        }
      }
      if (suggestFlag) {
        setTimeout(() => setShowAdvocateSuggestion(true), 400);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages(prev => prev.map(m => m.id === aiId
          ? { ...m, content: "Sorry, I'm having trouble connecting right now. Please try again in a moment." }
          : m
        ));
      }
    } finally {
      setStreaming(false);
    }
  }

  function handleSend() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    sendToAI(text);
  }

  function handleConnectedSend() {
    const text = connectedInput.trim();
    if (!text) return;
    setConnectedMessages(prev => [...prev, { id: `c-${Date.now()}`, from: "client", text: xorEncrypt(text), ts: Date.now() }]);
    setConnectedInput("");

    // Simulate advocate reply after delay
    setTimeout(() => {
      const replies = [
        "Thank you for sharing that. Can you also tell me when this incident first occurred?",
        "I understand. This is a fairly common situation and we have handled similar cases successfully.",
        "Please share any written communication you have received — that will help me advise you better.",
        "Based on what you've told me, there are a few legal options available. Let me explain each one.",
        "I would recommend we schedule a formal consultation so I can review all the documents thoroughly.",
      ];
      const reply = replies[Math.floor(Math.random() * replies.length)];
      setConnectedMessages(prev => [...prev, { id: `a-${Date.now()}`, from: "advocate", text: xorEncrypt(reply), ts: Date.now() }]);
    }, 1500 + Math.random() * 1000);
  }

  function reset() {
    setPhase("chat");
    setSelectedAdvocate(null);
    setConnectedMessages([]);
    setShowAdvocateSuggestion(false);
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: "Namaste! 🙏 I'm LexBot, your AI assistant at Legal Connect.\n\nI can help you understand general legal processes, figure out what type of issue you have, and prepare you for a consultation. For specific legal advice about your situation, I'll connect you with one of our experienced advocates.\n\nHow can I help you today?",
      ts: Date.now(),
    }]);
    setShowSuggestions(true);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#1A2E2A]">Connect with an Advocate</h1>
            <p className="text-[#1A2E2A]/40 text-xs mt-0.5">Start with AI · Get matched · Chat securely</p>
          </div>
        </div>

        {/* Phase stepper */}
        <div className="flex items-center gap-2">
          {(["chat", "select", "connected"] as Phase[]).map((p, i) => {
            const labels = ["Talk to AI", "Pick Advocate", "Secure Chat"];
            const icons = [Sparkles, User, Lock];
            const Icon = icons[i];
            const active = phase === p;
            const done = (phase === "select" && i === 0) || (phase === "connected" && i <= 1);
            return (
              <div key={p} className="flex items-center gap-1.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center border text-[10px] font-bold transition-all ${done ? "bg-emerald-500 border-emerald-500 text-[#1A2E2A]" : active ? "bg-primary border-primary text-background" : "bg-[#1A2E2A]/5 border-white/15 text-[#1A2E2A]/30"}`}>
                  {done ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
                <span className={`text-xs font-semibold hidden sm:block ${active ? "text-primary" : done ? "text-emerald-400" : "text-[#1A2E2A]/25"}`}>{labels[i]}</span>
                {i < 2 && <ChevronRight className="w-3 h-3 text-[#1A2E2A]/15 hidden sm:block" />}
              </div>
            );
          })}
          {phase !== "chat" && (
            <button onClick={reset} className="ml-2 flex items-center gap-1 text-[#1A2E2A]/30 hover:text-[#1A2E2A]/60 text-xs transition-colors">
              <RotateCcw className="w-3 h-3" /> Start over
            </button>
          )}
        </div>
      </div>

      {/* ═══════════════ PHASE 1: AI CHAT ═══════════════ */}
      <AnimatePresence mode="wait">
        {phase === "chat" && (
          <motion.div key="chat-phase" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="grid grid-cols-1 lg:grid-cols-4 gap-5">
            {/* Main chat window */}
            <div className="lg:col-span-3 bg-card/40 border border-[#1A2E2A]/10 rounded-2xl flex flex-col" style={{ height: "580px" }}>
              {/* Chat header */}
              <div className="px-5 py-4 border-b border-[#1A2E2A]/8 flex items-center gap-3">
                <div className="relative">
                  <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <Circle className="w-3 h-3 text-emerald-400 fill-emerald-400 absolute -bottom-0.5 -right-0.5" />
                </div>
                <div className="flex-1">
                  <p className="text-[#1A2E2A] font-bold text-sm">LexBot — AI Assistant</p>
                  <p className="text-[#1A2E2A]/35 text-xs">Legal Connect · Not a substitute for legal advice</p>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400 text-[10px] font-bold">ONLINE</span>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {messages.map((msg) => (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.role === "user" ? "flex-row-reverse" : "flex-row"} gap-3`}>
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center border ${msg.role === "assistant" ? "bg-primary/20 border-primary/30" : "bg-blue-500/20 border-blue-500/30"}`}>
                      {msg.role === "assistant"
                        ? <Sparkles className="w-4 h-4 text-primary" />
                        : <User className="w-4 h-4 text-blue-400" />}
                    </div>
                    <div className={`max-w-[80%] flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                      <div className={`rounded-2xl px-4 py-3 ${msg.role === "assistant" ? "bg-[#1A2E2A]/8 border border-[#1A2E2A]/10 rounded-tl-sm" : "bg-blue-500/15 border border-blue-500/20 rounded-tr-sm"}`}>
                        <p className="text-[#1A2E2A] text-sm leading-relaxed whitespace-pre-line">
                          {msg.content}
                          {streaming && msg.role === "assistant" && msg.id === messages[messages.length - 1]?.id && (
                            <span className="inline-block ml-1 w-2 h-4 bg-primary/60 animate-pulse rounded-sm" />
                          )}
                        </p>
                      </div>
                      <span className="text-[#1A2E2A]/20 text-[10px] px-1">{timeStr(msg.ts)}</span>

                      {/* Advocate suggestion card inline */}
                      {msg.suggestAdvocate && msg.id === messages[messages.length - 1]?.id && !streaming && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-2 bg-primary/10 border border-primary/25 rounded-xl p-3 w-full max-w-xs">
                          <p className="text-primary text-xs font-bold mb-2 flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5" /> Ready to speak to an advocate?
                          </p>
                          <p className="text-[#1A2E2A]/50 text-xs mb-3">Choose from our available advocates for a private, encrypted consultation.</p>
                          <button onClick={() => setPhase("select")} className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-background text-xs font-bold px-4 py-2.5 rounded-xl transition-all">
                            Choose an Advocate <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                ))}

                {/* Floating advocate suggestion banner */}
                <AnimatePresence>
                  {showAdvocateSuggestion && !messages[messages.length - 1]?.suggestAdvocate && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-primary/10 border border-primary/25 rounded-2xl p-4 flex items-center gap-3">
                      <Shield className="w-5 h-5 text-primary flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-primary text-xs font-bold">Connect with an Advocate</p>
                        <p className="text-[#1A2E2A]/40 text-xs">For advice on your specific situation, speak to one of our advocates.</p>
                      </div>
                      <button onClick={() => setPhase("select")} className="flex items-center gap-1.5 bg-primary text-background text-xs font-bold px-3 py-2 rounded-xl flex-shrink-0 hover:bg-primary/90 transition-all">
                        Choose <ArrowRight className="w-3 h-3" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Quick suggestions */}
                {showSuggestions && messages.length <= 1 && (
                  <div className="space-y-2">
                    <p className="text-[#1A2E2A]/25 text-xs font-semibold uppercase tracking-wider">Suggested questions</p>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_SUGGESTIONS.map(q => (
                        <button key={q} onClick={() => { setInput(q); setShowSuggestions(false); sendToAI(q); }} className="text-xs bg-[#1A2E2A]/5 hover:bg-[#1A2E2A]/10 border border-[#1A2E2A]/10 hover:border-white/25 text-[#1A2E2A]/50 hover:text-[#1A2E2A] px-3 py-2 rounded-xl transition-all text-left">
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-4 border-t border-[#1A2E2A]/8">
                <div className="flex gap-3">
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
                    disabled={streaming}
                    placeholder="Ask anything about legal processes, the firm, or your situation..."
                    className="flex-1 bg-[#1A2E2A]/5 border border-[#1A2E2A]/10 focus:border-primary/30 rounded-xl px-4 py-3 text-[#1A2E2A] text-sm placeholder:text-[#1A2E2A]/25 focus:outline-none transition-all"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || streaming}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${input.trim() && !streaming ? "bg-primary hover:bg-primary/90 text-background" : "bg-[#1A2E2A]/8 text-[#1A2E2A]/20"}`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-center text-[#1A2E2A]/15 text-[10px] mt-2">LexBot provides general information only · Not legal advice</p>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              {/* Connect CTA */}
              <div className="bg-primary/10 border border-primary/25 rounded-2xl p-5">
                <Shield className="w-7 h-7 text-primary mb-3" />
                <h3 className="text-[#1A2E2A] font-bold mb-1">Need real legal advice?</h3>
                <p className="text-[#1A2E2A]/40 text-xs leading-relaxed mb-4">LexBot handles general queries. For your specific situation, speak to one of our advocates.</p>
                <button onClick={() => setPhase("select")} className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-background text-sm font-bold py-3 rounded-xl transition-all">
                  Pick an Advocate <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* AI limitations */}
              <div className="bg-card/30 border border-[#1A2E2A]/8 rounded-2xl p-4 space-y-3">
                <p className="text-[#1A2E2A]/50 text-xs font-bold uppercase tracking-wider">What I can help with</p>
                {[
                  ["✓", "General legal concepts", "text-emerald-400"],
                  ["✓", "How consultations work", "text-emerald-400"],
                  ["✓", "Document requirements", "text-emerald-400"],
                  ["✓", "Court procedures", "text-emerald-400"],
                  ["✗", "Specific case advice", "text-rose-400"],
                  ["✗", "Legal strategy", "text-rose-400"],
                ].map(([sym, label, cls]) => (
                  <div key={label} className="flex items-center gap-2 text-xs">
                    <span className={`font-bold ${cls}`}>{sym}</span>
                    <span className="text-[#1A2E2A]/40">{label}</span>
                  </div>
                ))}
              </div>

              {/* Available advocates teaser */}
              <div className="bg-card/30 border border-[#1A2E2A]/8 rounded-2xl p-4">
                <p className="text-[#1A2E2A]/50 text-xs font-bold uppercase tracking-wider mb-3">Available Now</p>
                {ADVOCATES.filter(a => a.available).slice(0, 3).map(a => (
                  <div key={a.id} className="flex items-center gap-2 mb-2.5">
                    <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${a.color} flex items-center justify-center text-[#1A2E2A] text-[10px] font-bold flex-shrink-0`}>{a.initials}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#1A2E2A]/70 text-xs font-semibold truncate">{a.name}</p>
                      <p className="text-[#1A2E2A]/30 text-[10px] truncate">{a.specialisations[0]}</p>
                    </div>
                    <Circle className="w-2 h-2 text-emerald-400 fill-emerald-400 flex-shrink-0" />
                  </div>
                ))}
                <button onClick={() => setPhase("select")} className="w-full text-center text-xs text-primary hover:underline mt-1 font-semibold">View all advocates →</button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══════════════ PHASE 2: ADVOCATE SELECTION ═══════════════ */}
        {phase === "select" && (
          <motion.div key="select-phase" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-5">
            <div className="bg-primary/8 border border-primary/20 rounded-2xl px-5 py-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-[#1A2E2A] text-sm font-bold">LexBot has summarised your inquiry</p>
                <p className="text-[#1A2E2A]/45 text-xs mt-0.5">Choose an advocate below — they'll receive a brief from LexBot so you don't have to repeat yourself.</p>
              </div>
            </div>

            <div>
              <h2 className="text-[#1A2E2A] font-bold text-lg mb-1">Choose Your Advocate</h2>
              <p className="text-[#1A2E2A]/40 text-sm">All consultations are private and end-to-end encrypted.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {ADVOCATES.map((adv, i) => (
                <motion.div
                  key={adv.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.07 * i }}
                  className={`bg-card/40 border rounded-2xl p-5 flex flex-col gap-4 transition-all ${adv.available ? "border-[#1A2E2A]/10 hover:border-white/25" : "border-white/5 opacity-60"}`}
                >
                  {/* Advocate header */}
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${adv.color} flex items-center justify-center text-[#1A2E2A] font-bold text-sm flex-shrink-0 shadow-lg`}>
                      {adv.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-[#1A2E2A] font-bold text-sm truncate">{adv.name}</p>
                        {adv.available && <Circle className="w-2.5 h-2.5 text-emerald-400 fill-emerald-400 flex-shrink-0" />}
                      </div>
                      <p className="text-[#1A2E2A]/40 text-xs">{adv.title}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Stars rating={adv.rating} />
                        <span className="text-[#1A2E2A]/30 text-[10px]">{adv.rating} ({adv.reviews})</span>
                      </div>
                    </div>
                  </div>

                  {/* Specialisations */}
                  <div className="flex flex-wrap gap-1.5">
                    {adv.specialisations.map(s => (
                      <span key={s} className="text-[10px] px-2 py-1 rounded-full bg-[#1A2E2A]/5 border border-[#1A2E2A]/10 text-[#1A2E2A]/50">{s}</span>
                    ))}
                  </div>

                  {/* Meta */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#1A2E2A]/35">Experience</span>
                      <span className="text-[#1A2E2A]/65 font-semibold">{adv.experience}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#1A2E2A]/35">Consultation</span>
                      <span className="text-amber-400 font-bold">₹{adv.fee.toLocaleString()}/hr</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#1A2E2A]/35">Availability</span>
                      <span className={`font-semibold ${adv.available ? "text-emerald-400" : "text-[#1A2E2A]/40"}`}>{adv.responseTime}</span>
                    </div>
                  </div>

                  {/* Call type + Connect */}
                  {adv.available ? (
                    <div className="space-y-2 mt-auto">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          className={`flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-xl border transition-all ${selectedAdvocate?.id === adv.id && callType === "audio" ? "bg-blue-500 border-blue-500 text-[#1A2E2A]" : "bg-blue-500/10 border-blue-500/25 text-blue-400 hover:bg-blue-500/20"}`}
                          onClick={() => { setSelectedAdvocate(adv); setCallType("audio"); }}
                        >
                          <Phone className="w-3.5 h-3.5" /> Audio
                        </button>
                        <button
                          className={`flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-xl border transition-all ${selectedAdvocate?.id === adv.id && callType === "video" ? "bg-violet-500 border-violet-500 text-[#1A2E2A]" : "bg-violet-500/10 border-violet-500/25 text-violet-400 hover:bg-violet-500/20"}`}
                          onClick={() => { setSelectedAdvocate(adv); setCallType("video"); }}
                        >
                          <Video className="w-3.5 h-3.5" /> Video
                        </button>
                      </div>
                      <button
                        onClick={() => { setSelectedAdvocate(adv); setPhase("connected"); }}
                        className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-background text-sm font-bold py-2.5 rounded-xl transition-all"
                      >
                        <MessageSquare className="w-4 h-4" /> Connect via Chat
                      </button>
                    </div>
                  ) : (
                    <div className="mt-auto">
                      <button className="w-full text-xs font-bold text-[#1A2E2A]/30 bg-[#1A2E2A]/5 border border-[#1A2E2A]/10 py-2.5 rounded-xl cursor-not-allowed">
                        Not available right now
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══════════════ PHASE 3: CONNECTED CHAT ═══════════════ */}
        {phase === "connected" && selectedAdvocate && (
          <motion.div key="connected-phase" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="grid grid-cols-1 lg:grid-cols-4 gap-5">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-4 order-2 lg:order-1">
              <div className="bg-card/40 border border-[#1A2E2A]/10 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${selectedAdvocate.color} flex items-center justify-center text-[#1A2E2A] font-bold shadow-lg flex-shrink-0`}>
                    {selectedAdvocate.initials}
                  </div>
                  <div>
                    <p className="text-[#1A2E2A] font-bold text-sm">{selectedAdvocate.name}</p>
                    <p className="text-[#1A2E2A]/40 text-xs">{selectedAdvocate.title}</p>
                    <p className="text-emerald-400 text-xs flex items-center gap-1 mt-0.5">
                      <Circle className="w-2 h-2 fill-emerald-400" /> Connected
                    </p>
                  </div>
                </div>
                <div className="space-y-2 text-xs border-t border-[#1A2E2A]/8 pt-3">
                  <div className="flex justify-between">
                    <span className="text-[#1A2E2A]/35">Experience</span>
                    <span className="text-[#1A2E2A]/65">{selectedAdvocate.experience}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#1A2E2A]/35">Fee</span>
                    <span className="text-amber-400 font-bold">₹{selectedAdvocate.fee.toLocaleString()}/hr</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#1A2E2A]/35">Rating</span>
                    <span><Stars rating={selectedAdvocate.rating} /> {selectedAdvocate.rating}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button className="flex items-center justify-center gap-1.5 text-xs font-bold bg-blue-500/15 border border-blue-500/25 text-blue-400 hover:bg-blue-500/25 py-2 rounded-xl transition-all">
                    <Phone className="w-3.5 h-3.5" /> Audio
                  </button>
                  <button className="flex items-center justify-center gap-1.5 text-xs font-bold bg-violet-500/15 border border-violet-500/25 text-violet-400 hover:bg-violet-500/25 py-2 rounded-xl transition-all">
                    <Video className="w-3.5 h-3.5" /> Video
                  </button>
                </div>
              </div>

              <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-2xl p-4">
                <p className="text-emerald-400 text-xs font-bold flex items-center gap-1.5 mb-1.5">
                  <Lock className="w-3.5 h-3.5" /> End-to-End Encrypted
                </p>
                <p className="text-[#1A2E2A]/40 text-xs leading-relaxed">Only you and {selectedAdvocate.name} can read these messages. Encrypted with AES-256.</p>
              </div>

              <button onClick={() => setPhase("select")} className="w-full text-xs font-bold text-[#1A2E2A]/30 hover:text-[#1A2E2A]/60 bg-[#1A2E2A]/5 hover:bg-[#1A2E2A]/10 border border-[#1A2E2A]/10 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5">
                <X className="w-3.5 h-3.5" /> Change Advocate
              </button>
            </div>

            {/* Chat window */}
            <div className="lg:col-span-3 bg-card/40 border border-[#1A2E2A]/10 rounded-2xl flex flex-col order-1 lg:order-2" style={{ height: "580px" }}>
              {/* Header */}
              <div className="px-5 py-4 border-b border-[#1A2E2A]/8 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${selectedAdvocate.color} flex items-center justify-center text-[#1A2E2A] font-bold text-sm flex-shrink-0`}>
                  {selectedAdvocate.initials}
                </div>
                <div className="flex-1">
                  <p className="text-[#1A2E2A] font-bold text-sm">{selectedAdvocate.name}</p>
                  <p className="text-[#1A2E2A]/35 text-xs">{selectedAdvocate.specialisations.join(" · ")}</p>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 text-[10px] font-bold">E2E ENCRYPTED</span>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="text-center">
                  <span className="text-[10px] text-[#1A2E2A]/20 bg-[#1A2E2A]/5 px-3 py-1 rounded-full">
                    🔒 Connected with {selectedAdvocate.name} · LexBot briefed them on your inquiry
                  </span>
                </div>
                {connectedMessages.map(msg => {
                  const isClient = msg.from === "client";
                  return (
                    <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isClient ? "flex-row-reverse" : "flex-row"} gap-2.5`}>
                      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center border text-[10px] font-bold ${isClient ? "bg-blue-500/20 border-blue-500/30 text-blue-400" : `bg-gradient-to-br ${selectedAdvocate.color}`}`}>
                        {isClient ? <User className="w-4 h-4 text-blue-400" /> : <span className="text-[#1A2E2A]">{selectedAdvocate.initials[0]}</span>}
                      </div>
                      <div className={`max-w-[78%] rounded-2xl px-4 py-3 ${isClient ? "bg-blue-500/15 border border-blue-500/20 rounded-tr-sm" : "bg-[#1A2E2A]/8 border border-[#1A2E2A]/10 rounded-tl-sm"}`}>
                        {!isClient && <p className="text-amber-400 text-[10px] font-bold mb-1">{selectedAdvocate.name}</p>}
                        <p className="text-[#1A2E2A] text-sm leading-relaxed">{xorDecrypt(msg.text)}</p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <Lock className="w-2.5 h-2.5 text-[#1A2E2A]/20" />
                          <span className="text-[#1A2E2A]/20 text-[10px]">{timeStr(msg.ts)}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={connBottomRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-4 border-t border-[#1A2E2A]/8">
                <div className="flex gap-3">
                  <input
                    value={connectedInput}
                    onChange={e => setConnectedInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleConnectedSend())}
                    placeholder={`Message ${selectedAdvocate.name}... (encrypted)`}
                    className="flex-1 bg-[#1A2E2A]/5 border border-[#1A2E2A]/10 focus:border-primary/30 rounded-xl px-4 py-3 text-[#1A2E2A] text-sm placeholder:text-[#1A2E2A]/25 focus:outline-none transition-all"
                  />
                  <button
                    onClick={handleConnectedSend}
                    disabled={!connectedInput.trim()}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${connectedInput.trim() ? "bg-primary hover:bg-primary/90 text-background" : "bg-[#1A2E2A]/8 text-[#1A2E2A]/20"}`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-center text-[#1A2E2A]/15 text-[10px] mt-2 flex items-center justify-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> End-to-end encrypted · Legal Connect
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
