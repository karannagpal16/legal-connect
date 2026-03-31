import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, X, Send, Sparkles, Phone, MapPin, ChevronRight } from "lucide-react";
import { Link } from "wouter";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

const quickOptions = [
  { label: "I'm at a police station", emoji: "🚔", hint: "Arrested or summoned" },
  { label: "Landlord is harassing me", emoji: "🏠", hint: "Illegal eviction / services cut" },
  { label: "I received a legal notice", emoji: "📄", hint: "Need to respond within deadline" },
  { label: "Domestic dispute — need help", emoji: "🆘", hint: "Urgent family / safety matter" },
  { label: "Traffic fine / accident", emoji: "🚗", hint: "On the spot legal guidance" },
];

export function SOSButton() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"menu" | "chat">("menu");
  const [situation, setSituation] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function startChat(label: string) {
    setSituation(label);
    setPhase("chat");
    const intro = `I need help: ${label}`;
    setMessages([{ role: "user", text: intro }]);
    await fetchAI(intro, []);
  }

  async function sendMsg() {
    if (!input.trim() || streaming) return;
    const text = input.trim();
    setInput("");
    const newMsgs = [...messages, { role: "user" as const, text }];
    setMessages(newMsgs);
    await fetchAI(text, newMsgs);
  }

  async function fetchAI(userText: string, history: { role: "user" | "assistant"; text: string }[]) {
    setStreaming(true);
    const aiIdx = history.length;
    setMessages(prev => [...prev, { role: "assistant", text: "" }]);

    const apiMessages = history.map(m => ({ role: m.role, content: m.text }));
    apiMessages.push({ role: "user", content: userText });

    try {
      const res = await fetch(`${BASE_URL}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, context: "gateway" }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (!line.startsWith("data:")) continue;
          try {
            const parsed = JSON.parse(line.slice(5).trim());
            if (parsed.content) {
              full += parsed.content;
              full = full.replace("[SUGGEST_ADVOCATE]", "").trimEnd();
              setMessages(prev => prev.map((m, i) => i === aiIdx + 1 ? { ...m, text: full } : m));
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      setMessages(prev => prev.map((m, i) => i === messages.length ? { ...m, text: "Connection issue. Please call us directly: 011-XXXX-XXXX" } : m));
    } finally {
      setStreaming(false);
    }
  }

  return (
    <>
      {/* SOS Trigger Button */}
      <motion.button
        onClick={() => { setOpen(true); setPhase("menu"); }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-rose-600 hover:bg-rose-700 text-white px-5 py-3.5 rounded-2xl font-bold text-sm shadow-2xl shadow-rose-500/40 transition-colors"
      >
        <div className="relative">
          <AlertCircle className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white rounded-full animate-ping opacity-75" />
        </div>
        Legal SOS
      </motion.button>

      {/* SOS Modal */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, y: 60, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 60, scale: 0.95 }}
              className="fixed bottom-20 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[400px] max-h-[580px] bg-[#0f1117] border border-rose-500/30 rounded-2xl shadow-2xl shadow-rose-500/20 flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-white/8 bg-rose-500/10">
                <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-white font-bold text-sm">Legal SOS — Emergency Help</p>
                  <p className="text-white/40 text-xs">Rishika Nagpal & Associates · Available 24/7</p>
                </div>
                <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Phase: Menu */}
              {phase === "menu" && (
                <div className="p-5 space-y-4 overflow-y-auto flex-1">
                  <p className="text-white/60 text-sm">What's your emergency? Select a situation and LexBot will guide you instantly.</p>

                  <div className="space-y-2">
                    {quickOptions.map(opt => (
                      <button
                        key={opt.label}
                        onClick={() => startChat(opt.label)}
                        className="w-full text-left flex items-center gap-3 bg-white/5 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/25 rounded-xl px-4 py-3 transition-all group"
                      >
                        <span className="text-xl">{opt.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold">{opt.label}</p>
                          <p className="text-white/35 text-xs">{opt.hint}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-rose-400 transition-colors flex-shrink-0" />
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-white/8 pt-4 grid grid-cols-2 gap-2">
                    <Link href="/client/connect">
                      <button className="w-full flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/90 text-background text-xs font-bold py-2.5 rounded-xl transition-all" onClick={() => setOpen(false)}>
                        <Sparkles className="w-3.5 h-3.5" /> Talk to AI
                      </button>
                    </Link>
                    <button className="flex items-center justify-center gap-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/25 text-xs font-bold py-2.5 rounded-xl transition-all">
                      <Phone className="w-3.5 h-3.5" /> Call Now
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-white/25 text-[10px]">
                    <MapPin className="w-3 h-3" /> Subhash Nagar, New Delhi · 011-XXXX-XXXX
                  </div>
                </div>
              )}

              {/* Phase: Chat */}
              {phase === "chat" && (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    <div className="text-center">
                      <span className="text-[10px] text-white/25 bg-white/5 px-3 py-1 rounded-full">Situation: {situation}</span>
                    </div>
                    {messages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
                        {m.role === "assistant" && (
                          <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Sparkles className="w-3 h-3 text-primary" />
                          </div>
                        )}
                        <div className={`max-w-[85%] rounded-xl px-3 py-2.5 text-xs ${m.role === "user" ? "bg-rose-500/15 border border-rose-500/20 text-white" : "bg-white/8 border border-white/10 text-white/80"}`}>
                          {m.text}
                          {streaming && m.role === "assistant" && i === messages.length - 1 && !m.text && (
                            <span className="inline-flex gap-0.5 ml-1">
                              <span className="w-1 h-1 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                              <span className="w-1 h-1 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                              <span className="w-1 h-1 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={bottomRef} />
                  </div>

                  <div className="px-4 py-3 border-t border-white/8 space-y-2">
                    <div className="flex gap-2">
                      <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && sendMsg()}
                        placeholder="Describe your situation..."
                        disabled={streaming}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs placeholder:text-white/25 focus:outline-none focus:border-rose-500/30"
                      />
                      <button onClick={sendMsg} disabled={!input.trim() || streaming} className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${input.trim() && !streaming ? "bg-rose-500 text-white" : "bg-white/8 text-white/20"}`}>
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setPhase("menu")} className="text-[10px] text-white/30 hover:text-white/60 transition-colors">← Back</button>
                      <Link href="/client/connect">
                        <button onClick={() => setOpen(false)} className="text-[10px] text-primary hover:underline">Connect to real advocate →</button>
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
