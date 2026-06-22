import { useState, useEffect, useRef } from "react";
import {
  Phone, Video, Mic, MicOff, VideoOff, PhoneOff,
  MapPin, Star, Gavel, Wifi, WifiOff,
  Search, Shield, Send, MessageSquare, IndianRupee, Clock, X, ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Advocate {
  id: number;
  name: string;
  title: string;
  speciality: string;
  rating: number;
  cases: number;
  distance: string;
  available: boolean;
  avatar: string;
  color: string;
  courts: string[];
  experience: number;
  fee: number;
}

const advocates: Advocate[] = [
  {
    id: 1, name: "Senior Advocate", title: "Senior Advocate",
    speciality: "Criminal & Constitutional Law", rating: 4.9, cases: 340,
    distance: "0.2 km", available: true, avatar: "LC", color: "bg-amber-500",
    courts: ["Supreme Court", "Delhi HC"], experience: 12, fee: 3000,
  },
  {
    id: 2, name: "Sunita Joshi", title: "Senior Advocate",
    speciality: "Civil & Property Law", rating: 4.9, cases: 285,
    distance: "0.8 km", available: true, avatar: "SJ", color: "bg-cyan-500",
    courts: ["Delhi HC", "District Court"], experience: 14, fee: 2800,
  },
  {
    id: 3, name: "Priya Mehrotra", title: "Senior Advocate",
    speciality: "Corporate & Consumer Law", rating: 4.8, cases: 210,
    distance: "1.5 km", available: false, avatar: "PM", color: "bg-emerald-500",
    courts: ["Supreme Court", "NCDRC"], experience: 11, fee: 2500,
  },
  {
    id: 4, name: "Arjun Mehta", title: "Advocate",
    speciality: "Family & Matrimonial Law", rating: 4.7, cases: 175,
    distance: "1.1 km", available: true, avatar: "AM", color: "bg-blue-500",
    courts: ["Delhi HC", "Family Court"], experience: 8, fee: 2000,
  },
  {
    id: 5, name: "Vikram Bose", title: "Advocate",
    speciality: "Tax & Regulatory Law", rating: 4.6, cases: 150,
    distance: "3.0 km", available: true, avatar: "VB", color: "bg-violet-500",
    courts: ["Supreme Court", "ITAT"], experience: 7, fee: 1500,
  },
  {
    id: 6, name: "Neha Kapoor", title: "Associate Advocate",
    speciality: "Cyber Crime & IT Law", rating: 4.5, cases: 85,
    distance: "2.1 km", available: true, avatar: "NK", color: "bg-rose-500",
    courts: ["Delhi HC", "District Court"], experience: 4, fee: 1000,
  },
  {
    id: 7, name: "Rahul Verma", title: "Junior Advocate",
    speciality: "Labour & Employment Law", rating: 4.4, cases: 48,
    distance: "1.8 km", available: true, avatar: "RV", color: "bg-teal-500",
    courts: ["District Court", "Labour Court"], experience: 2, fee: 700,
  },
  {
    id: 8, name: "Ananya Singh", title: "Junior Advocate",
    speciality: "Consumer Disputes & RTI", rating: 4.3, cases: 32,
    distance: "2.5 km", available: true, avatar: "AS", color: "bg-pink-500",
    courts: ["District Court", "Consumer Forum"], experience: 1, fee: 500,
  },
];

interface ChatMsg {
  id: string;
  from: "client" | "advocate";
  text: string;
  ts: number;
}

const autoReplies = [
  "Thank you for reaching out. How can I help you today?",
  "I'd be happy to discuss your case. Could you share more details?",
  "That's a common issue — I've handled many similar cases successfully.",
  "Please share any documents or notices you've received and I can advise further.",
  "I recommend we schedule a formal consultation. Would you like to book a call?",
  "Yes, I'm available this week. You can book a video or audio call directly.",
  "Let me review the specifics. Could you tell me when this first occurred?",
  "Based on what you've described, there are a few legal options we can explore.",
];

type Stage = "browse" | "matching" | "connected" | "call";
type CallMode = "audio" | "video";

export function ClientBookAdvocate() {
  const [stage, setStage] = useState<Stage>("browse");
  const [selectedAdvocate, setSelectedAdvocate] = useState<Advocate | null>(null);
  const [callMode, setCallMode] = useState<CallMode>("video");
  const [matchStep, setMatchStep] = useState(0);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [search, setSearch] = useState("");
  const [openChat, setOpenChat] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<Record<number, ChatMsg[]>>({});
  const [chatInput, setChatInput] = useState("");
  const [usedFreeChat, setUsedFreeChat] = useState<Set<number>>(new Set());
  const chatEndRef = useRef<HTMLDivElement>(null);

  const filtered = advocates.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.speciality.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (stage === "matching") {
      const steps = [
        { delay: 800, step: 1 },
        { delay: 1800, step: 2 },
        { delay: 2800, step: 3 },
        { delay: 3600, step: 4 },
      ];
      const timers = steps.map(({ delay, step }) =>
        setTimeout(() => setMatchStep(step), delay)
      );
      const connected = setTimeout(() => setStage("connected"), 4400);
      return () => { timers.forEach(clearTimeout); clearTimeout(connected); };
    }
  }, [stage]);

  useEffect(() => {
    if (stage === "call") {
      const timer = setInterval(() => setCallDuration(d => d + 1), 1000);
      return () => clearInterval(timer);
    }
  }, [stage]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, openChat]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const handleBook = (advocate: Advocate, mode: CallMode) => {
    setSelectedAdvocate(advocate);
    setCallMode(mode);
    setMatchStep(0);
    setStage("matching");
  };

  const endCall = () => {
    setStage("browse");
    setCallDuration(0);
    setMuted(false);
    setVideoOff(false);
  };

  const toggleChat = (advocateId: number) => {
    if (openChat === advocateId) {
      setOpenChat(null);
    } else {
      setOpenChat(advocateId);
      setChatInput("");
      if (!chatMessages[advocateId]) {
        const adv = advocates.find(a => a.id === advocateId)!;
        setChatMessages(prev => ({
          ...prev,
          [advocateId]: [{
            id: `greeting-${advocateId}`,
            from: "advocate",
            text: `Hello! I'm ${adv.name}. Feel free to ask me anything about your legal matter — I'm here to help.`,
            ts: Date.now(),
          }],
        }));
      }
    }
  };

  const sendChat = (advocateId: number) => {
    const text = chatInput.trim();
    if (!text) return;
    const newMsg: ChatMsg = { id: `c-${Date.now()}`, from: "client", text, ts: Date.now() };
    setChatMessages(prev => ({
      ...prev,
      [advocateId]: [...(prev[advocateId] || []), newMsg],
    }));
    setChatInput("");

    if (!usedFreeChat.has(advocateId)) {
      setUsedFreeChat(prev => new Set(prev).add(advocateId));
    }

    setTimeout(() => {
      const reply = autoReplies[Math.floor(Math.random() * autoReplies.length)];
      setChatMessages(prev => ({
        ...prev,
        [advocateId]: [...(prev[advocateId] || []), { id: `a-${Date.now()}`, from: "advocate", text: reply, ts: Date.now() }],
      }));
    }, 1200 + Math.random() * 800);
  };

  const isFreeChat = (advocateId: number) => !usedFreeChat.has(advocateId);

  const timeStr = (ts: number) => new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-full">
      <AnimatePresence mode="wait">

        {stage === "browse" && (
          <motion.div key="browse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
            <div className="mb-8">
              <h1 className="text-3xl font-serif font-bold text-[#1A2332] mb-1">Book an Advocate</h1>
              <p className="text-[#1A2332]/50">Available advocates near you — chat, consult, or call in seconds.</p>
            </div>

            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#1A2332]/30" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or speciality..."
                className="w-full bg-card/50 border border-[#1A2332]/10 rounded-2xl pl-12 pr-4 py-4 text-[#1A2332] placeholder:text-[#1A2332]/30 focus:outline-none focus:border-primary/50 text-sm"
              />
            </div>

            <div className="space-y-4">
              {filtered.map((advocate, i) => (
                <motion.div
                  key={advocate.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.06 * i }}
                  className={`bg-card/40 border rounded-3xl overflow-hidden transition-all duration-300 ${advocate.available ? "border-[#1A2332]/10 hover:border-primary/30" : "border-white/5 opacity-60"}`}
                >
                  <div className="p-5 flex items-start gap-4">
                    <div className="relative flex-shrink-0">
                      <div className={`w-14 h-14 rounded-2xl ${advocate.color} flex items-center justify-center text-[#1A2332] font-bold text-lg shadow-lg`}>
                        {advocate.avatar}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${advocate.available ? "bg-emerald-400" : "bg-[#1A2332]/20"}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h3 className="font-bold text-[#1A2332] text-base">{advocate.name}</h3>
                        <div className="flex items-center gap-1 text-amber-400 text-sm font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          {advocate.rating}
                        </div>
                      </div>
                      <p className="text-[#1A2332]/50 text-xs mb-1.5">{advocate.title} · {advocate.speciality}</p>

                      <div className="flex items-center gap-3 text-xs text-[#1A2332]/40 mb-2">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{advocate.distance}</span>
                        <span className="flex items-center gap-1"><Gavel className="w-3 h-3" />{advocate.cases} cases</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{advocate.experience} yrs exp</span>
                      </div>

                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <div className="flex items-center gap-1 bg-primary/10 border border-primary/20 rounded-lg px-2.5 py-1">
                          <IndianRupee className="w-3 h-3 text-primary" />
                          <span className="text-primary text-xs font-bold">{advocate.fee.toLocaleString("en-IN")}</span>
                          <span className="text-primary/60 text-[10px]">/ hr</span>
                        </div>
                        <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1">
                          <MessageSquare className="w-3 h-3 text-emerald-400" />
                          {isFreeChat(advocate.id) ? (
                            <span className="text-emerald-400 text-[10px] font-bold">1st Chat FREE</span>
                          ) : (
                            <>
                              <span className="text-emerald-400 text-xs font-bold">₹50</span>
                              <span className="text-emerald-400/60 text-[10px]">/ 5 min</span>
                            </>
                          )}
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {advocate.courts.map(c => (
                            <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-[#1A2332]/10 text-[#1A2332]/50 border border-[#1A2332]/10">{c}</span>
                          ))}
                        </div>
                      </div>

                      {advocate.available ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleBook(advocate, "video")}
                            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-[#1A2332] px-3 py-2.5 rounded-xl text-sm font-bold transition-all hover:shadow-lg hover:shadow-blue-500/30 flex-1 justify-center"
                          >
                            <Video className="w-4 h-4" />
                            <span>Video</span>
                            <span className="text-[#1A2332]/60 text-[10px] font-semibold">₹{advocate.fee.toLocaleString("en-IN")}/hr</span>
                          </button>
                          <button
                            onClick={() => handleBook(advocate, "audio")}
                            className="flex items-center gap-2 bg-[#1A2332]/10 hover:bg-[#1A2332]/20 text-[#1A2332] px-3 py-2.5 rounded-xl text-sm font-bold transition-all flex-1 justify-center border border-[#1A2332]/10"
                          >
                            <Phone className="w-4 h-4" />
                            <span>Audio</span>
                            <span className="text-[#1A2332]/40 text-[10px] font-semibold">₹{advocate.fee.toLocaleString("en-IN")}/hr</span>
                          </button>
                          <button
                            onClick={() => toggleChat(advocate.id)}
                            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-all border ${openChat === advocate.id ? "bg-primary/20 border-primary/40 text-primary" : "bg-[#1A2332]/5 hover:bg-[#1A2332]/10 border-[#1A2332]/10 text-[#1A2332]/60 hover:text-[#1A2332]"}`}
                          >
                            <MessageSquare className="w-4 h-4" />
                            <span className="hidden sm:inline">Chat</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-[#1A2332]/30 text-xs">
                          <WifiOff className="w-4 h-4" /> Currently unavailable
                        </div>
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {openChat === advocate.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-[#1A2332]/8">
                          <div className="px-4 py-2.5 flex items-center justify-between bg-[#1A2332]/5">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="w-3.5 h-3.5 text-primary" />
                              <span className="text-[#1A2332]/60 text-xs font-semibold">Chat with {advocate.name.split(" ")[0]}</span>
                              <span className="flex items-center gap-1 text-emerald-400 text-[10px]">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {isFreeChat(advocate.id) ? (
                                <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full">FREE</span>
                              ) : (
                                <span className="text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-full">₹50 / 5 min</span>
                              )}
                              <button onClick={() => setOpenChat(null)} className="text-[#1A2332]/30 hover:text-[#1A2332]/60 transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {isFreeChat(advocate.id) && (
                            <div className="px-4 py-2 bg-emerald-500/8 border-b border-emerald-500/15 flex items-center gap-2">
                              <span className="text-emerald-400 text-[10px]">🎉</span>
                              <span className="text-emerald-400 text-[10px] font-semibold">Your first chat with {advocate.name.split(" ")[0]} is FREE! After this, chats are ₹50 per 5 minutes.</span>
                            </div>
                          )}

                          <div className="h-52 overflow-y-auto px-4 py-3 space-y-3 scrollbar-hide" style={{ background: "rgba(0,0,0,0.15)" }}>
                            {(chatMessages[advocate.id] || []).map(msg => (
                              <div key={msg.id} className={`flex ${msg.from === "client" ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[80%] ${msg.from === "client" ? "order-1" : ""}`}>
                                  <div className={`rounded-2xl px-3.5 py-2.5 ${msg.from === "advocate" ? "bg-[#1A2332]/8 border border-[#1A2332]/10 rounded-tl-sm" : "bg-primary/15 border border-primary/20 rounded-tr-sm"}`}>
                                    <p className="text-[#1A2332] text-xs leading-relaxed">{msg.text}</p>
                                  </div>
                                  <p className={`text-[#1A2332]/15 text-[9px] mt-0.5 px-1 ${msg.from === "client" ? "text-right" : ""}`}>{timeStr(msg.ts)}</p>
                                </div>
                              </div>
                            ))}
                            <div ref={chatEndRef} />
                          </div>

                          <div className="px-3 py-2.5 border-t border-[#1A2332]/8 flex gap-2">
                            <input
                              value={chatInput}
                              onChange={e => setChatInput(e.target.value)}
                              onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendChat(advocate.id))}
                              placeholder="Type your message..."
                              className="flex-1 bg-[#1A2332]/5 border border-[#1A2332]/10 focus:border-primary/30 rounded-xl px-3 py-2 text-[#1A2332] text-xs placeholder:text-[#1A2332]/25 focus:outline-none transition-all"
                            />
                            <button
                              onClick={() => sendChat(advocate.id)}
                              disabled={!chatInput.trim()}
                              className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${chatInput.trim() ? "bg-primary hover:bg-primary/90 text-background" : "bg-[#1A2332]/8 text-[#1A2332]/20"}`}
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {stage === "matching" && selectedAdvocate && (
          <motion.div
            key="matching"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4"
          >
            <div className="relative mb-10">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="absolute rounded-full border border-primary/30"
                  style={{ inset: `-${(i + 1) * 30}px` }}
                  animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.1, 0.4] }}
                  transition={{ duration: 2, delay: i * 0.4, repeat: Infinity }}
                />
              ))}
              <div className={`w-24 h-24 rounded-3xl ${selectedAdvocate.color} flex items-center justify-center text-[#1A2332] font-bold text-3xl shadow-2xl relative z-10`}>
                {selectedAdvocate.avatar}
              </div>
            </div>

            <h2 className="text-2xl font-serif font-bold text-[#1A2332] mb-2">
              Connecting you to {selectedAdvocate.name}
            </h2>
            <p className="text-[#1A2332]/40 mb-2 text-sm">{selectedAdvocate.title} · {selectedAdvocate.speciality}</p>
            <div className="flex items-center gap-1 text-primary text-sm font-bold mb-10">
              <IndianRupee className="w-3.5 h-3.5" />
              {selectedAdvocate.fee.toLocaleString("en-IN")} / hr
            </div>

            <div className="space-y-3 w-full max-w-xs">
              {[
                "Finding your advocate...",
                "Verifying credentials...",
                "Establishing secure connection...",
                "Ready to connect!",
              ].map((label, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={matchStep > i ? { opacity: 1, x: 0 } : { opacity: 0.2, x: 0 }}
                  className="flex items-center gap-3 text-sm"
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${matchStep > i ? "bg-primary text-background" : "bg-[#1A2332]/10 text-[#1A2332]/20"}`}>
                    {matchStep > i ? (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-2.5 h-2.5 rounded-full bg-background" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-[#1A2332]/20" />
                    )}
                  </div>
                  <span className={matchStep > i ? "text-[#1A2332]" : "text-[#1A2332]/30"}>{label}</span>
                </motion.div>
              ))}
            </div>

            <div className="mt-10 flex items-center gap-2 text-primary text-xs">
              <Shield className="w-4 h-4" />
              End-to-end encrypted · Bar Council verified
            </div>
          </motion.div>
        )}

        {stage === "connected" && selectedAdvocate && (
          <motion.div
            key="connected"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            onAnimationComplete={() => setTimeout(() => setStage("call"), 1500)}
            className="flex flex-col items-center justify-center min-h-[70vh] text-center"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 0.6 }}
              className={`w-28 h-28 rounded-3xl ${selectedAdvocate.color} flex items-center justify-center text-[#1A2332] font-bold text-4xl shadow-2xl mb-6`}
            >
              {selectedAdvocate.avatar}
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <h2 className="text-3xl font-serif font-bold text-[#1A2332] mb-2">Connected!</h2>
              <p className="text-[#1A2332]/50">Joining your {callMode} call with {selectedAdvocate.name}...</p>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-6 flex items-center gap-2 text-emerald-400">
              <Wifi className="w-5 h-5" />
              <span className="text-sm font-semibold">Secure connection established</span>
            </motion.div>
          </motion.div>
        )}

        {stage === "call" && selectedAdvocate && (
          <motion.div key="call" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
            <div className="flex-1 relative overflow-hidden">
              {callMode === "video" && !videoOff ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`w-full h-full ${selectedAdvocate.color} opacity-10 absolute inset-0`} />
                  <div className="flex flex-col items-center">
                    <div className={`w-32 h-32 rounded-3xl ${selectedAdvocate.color} flex items-center justify-center text-[#1A2332] font-bold text-5xl shadow-2xl mb-4`}>
                      {selectedAdvocate.avatar}
                    </div>
                    <div className="flex items-center gap-2 text-[#1A2332]/50 text-sm">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Video · HD
                    </div>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  <div className="flex flex-col items-center">
                    <div className={`w-32 h-32 rounded-3xl ${selectedAdvocate.color} flex items-center justify-center text-[#1A2332] font-bold text-5xl shadow-2xl mb-4`}>
                      {selectedAdvocate.avatar}
                    </div>
                    <p className="text-[#1A2332]/50 text-sm">Audio Only</p>
                  </div>
                </div>
              )}

              <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-[#1A2332] font-bold text-lg">{selectedAdvocate.name}</h3>
                  <p className="text-[#1A2332]/50 text-xs">{selectedAdvocate.title} · {selectedAdvocate.fee.toLocaleString("en-IN")}/hr</p>
                </div>
                <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full text-[#1A2332] font-mono text-sm border border-[#1A2332]/10">
                  {formatDuration(callDuration)}
                </div>
              </div>

              {callMode === "video" && (
                <div className="absolute bottom-28 right-4 w-28 h-36 bg-gray-800 rounded-2xl border border-[#1A2332]/20 overflow-hidden shadow-2xl flex items-center justify-center">
                  {videoOff ? (
                    <div className="text-[#1A2332]/30 text-xs text-center px-2">Camera off</div>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-b from-gray-700 to-gray-900 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-[#1A2332] font-bold text-sm">Me</div>
                    </div>
                  )}
                </div>
              )}

              <div className="absolute bottom-28 left-4 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#1A2332]/10">
                <Shield className="w-3.5 h-3.5 text-primary" />
                <span className="text-[#1A2332]/60 text-xs">End-to-end encrypted</span>
              </div>
            </div>

            <div className="bg-gray-900/90 backdrop-blur-md border-t border-[#1A2332]/10 px-6 py-6">
              <div className="flex items-center justify-center gap-6 max-w-sm mx-auto">
                <button
                  onClick={() => setMuted(m => !m)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${muted ? "bg-rose-500/20 border border-rose-500/40 text-rose-400" : "bg-[#1A2332]/10 border border-[#1A2332]/10 text-[#1A2332] hover:bg-[#1A2332]/20"}`}
                >
                  {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
                <button onClick={endCall} className="w-16 h-16 rounded-full bg-rose-500 hover:bg-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/40 transition-all hover:scale-105">
                  <PhoneOff className="w-7 h-7 text-[#1A2332]" />
                </button>
                {callMode === "video" && (
                  <button
                    onClick={() => setVideoOff(v => !v)}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${videoOff ? "bg-rose-500/20 border border-rose-500/40 text-rose-400" : "bg-[#1A2332]/10 border border-[#1A2332]/10 text-[#1A2332] hover:bg-[#1A2332]/20"}`}
                  >
                    {videoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                  </button>
                )}
              </div>
              <p className="text-center text-[#1A2332]/30 text-xs mt-4">
                {muted && "Microphone muted · "}{videoOff && "Camera off · "}
                Legal Connect · Legal Call
              </p>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
