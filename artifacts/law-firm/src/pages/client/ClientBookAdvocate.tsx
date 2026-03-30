import { useState, useEffect } from "react";
import {
  Phone, Video, Mic, MicOff, VideoOff, PhoneOff,
  MapPin, Star, Gavel, ChevronRight, Wifi, WifiOff,
  Search, Shield
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const advocates = [
  {
    id: 1,
    name: "Rishika Nagpal",
    title: "Senior Advocate",
    speciality: "Criminal & Constitutional Law",
    rating: 4.9,
    cases: 340,
    distance: "0.2 km",
    available: true,
    avatar: "RN",
    color: "bg-amber-500",
    courts: ["Supreme Court", "Delhi HC"],
  },
  {
    id: 2,
    name: "Arjun Mehta",
    title: "Advocate",
    speciality: "Civil & Corporate Law",
    rating: 4.7,
    cases: 210,
    distance: "1.1 km",
    available: true,
    avatar: "AM",
    color: "bg-blue-500",
    courts: ["Delhi HC", "District Court"],
  },
  {
    id: 3,
    name: "Priya Sharma",
    title: "Senior Advocate",
    speciality: "Family & Matrimonial Law",
    rating: 4.8,
    cases: 185,
    distance: "2.3 km",
    available: false,
    avatar: "PS",
    color: "bg-rose-500",
    courts: ["Delhi HC", "Family Court"],
  },
  {
    id: 4,
    name: "Vikram Bose",
    title: "Advocate",
    speciality: "Tax & Regulatory Law",
    rating: 4.6,
    cases: 150,
    distance: "3.0 km",
    available: true,
    avatar: "VB",
    color: "bg-emerald-500",
    courts: ["Supreme Court", "ITAT"],
  },
];

type Stage = "browse" | "matching" | "connected" | "call";
type CallMode = "audio" | "video";

export function ClientBookAdvocate() {
  const [stage, setStage] = useState<Stage>("browse");
  const [selectedAdvocate, setSelectedAdvocate] = useState<typeof advocates[0] | null>(null);
  const [callMode, setCallMode] = useState<CallMode>("video");
  const [matchStep, setMatchStep] = useState(0);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [search, setSearch] = useState("");

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

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const handleBook = (advocate: typeof advocates[0], mode: CallMode) => {
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

  return (
    <div className="min-h-full">
      <AnimatePresence mode="wait">

        {/* BROWSE — Uber-like advocate list */}
        {stage === "browse" && (
          <motion.div
            key="browse"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <div className="mb-8">
              <h1 className="text-3xl font-serif font-bold text-white mb-1">Book an Advocate</h1>
              <p className="text-white/50">Available advocates near you — connect in seconds.</p>
            </div>

            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or speciality..."
                className="w-full bg-card/50 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 text-sm"
              />
            </div>

            {/* Advocate Cards — Uber style */}
            <div className="space-y-4">
              {filtered.map((advocate, i) => (
                <motion.div
                  key={advocate.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 * i }}
                  className={`bg-card/40 border rounded-3xl overflow-hidden transition-all duration-300 ${advocate.available ? "border-white/10 hover:border-blue-500/30" : "border-white/5 opacity-60"}`}
                >
                  <div className="p-5 flex items-start gap-4">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className={`w-14 h-14 rounded-2xl ${advocate.color} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                        {advocate.avatar}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${advocate.available ? "bg-emerald-400" : "bg-white/20"}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h3 className="font-bold text-white text-base">{advocate.name}</h3>
                        <div className="flex items-center gap-1 text-amber-400 text-sm font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          {advocate.rating}
                        </div>
                      </div>
                      <p className="text-white/50 text-xs mb-1">{advocate.title} · {advocate.speciality}</p>
                      <div className="flex items-center gap-3 text-xs text-white/40 mb-3">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{advocate.distance}</span>
                        <span className="flex items-center gap-1"><Gavel className="w-3 h-3" />{advocate.cases} cases</span>
                      </div>
                      <div className="flex gap-1 flex-wrap mb-4">
                        {advocate.courts.map(c => (
                          <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/50 border border-white/10">{c}</span>
                        ))}
                      </div>

                      {advocate.available ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleBook(advocate, "video")}
                            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:shadow-lg hover:shadow-blue-500/30 flex-1 justify-center"
                          >
                            <Video className="w-4 h-4" />
                            Video Call
                          </button>
                          <button
                            onClick={() => handleBook(advocate, "audio")}
                            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex-1 justify-center border border-white/10"
                          >
                            <Phone className="w-4 h-4" />
                            Audio Call
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-white/30 text-xs">
                          <WifiOff className="w-4 h-4" />
                          Currently unavailable
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* MATCHING — Uber-like "finding your advocate" */}
        {stage === "matching" && selectedAdvocate && (
          <motion.div
            key="matching"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4"
          >
            {/* Pulsing ring animation */}
            <div className="relative mb-10">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="absolute rounded-full border border-blue-500/30"
                  style={{ inset: `-${(i + 1) * 30}px` }}
                  animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.1, 0.4] }}
                  transition={{ duration: 2, delay: i * 0.4, repeat: Infinity }}
                />
              ))}
              <div className={`w-24 h-24 rounded-3xl ${selectedAdvocate.color} flex items-center justify-center text-white font-bold text-3xl shadow-2xl relative z-10`}>
                {selectedAdvocate.avatar}
              </div>
            </div>

            <h2 className="text-2xl font-serif font-bold text-white mb-2">
              Connecting you to {selectedAdvocate.name}
            </h2>
            <p className="text-white/40 mb-10 text-sm">{selectedAdvocate.title} · {selectedAdvocate.speciality}</p>

            {/* Steps */}
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
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${matchStep > i ? "bg-blue-500 text-white" : "bg-white/10 text-white/20"}`}>
                    {matchStep > i ? (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-2.5 h-2.5 rounded-full bg-white" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-white/20" />
                    )}
                  </div>
                  <span className={matchStep > i ? "text-white" : "text-white/30"}>{label}</span>
                </motion.div>
              ))}
            </div>

            <div className="mt-10 flex items-center gap-2 text-blue-400 text-xs">
              <Shield className="w-4 h-4" />
              End-to-end encrypted · Bar Council verified
            </div>
          </motion.div>
        )}

        {/* CONNECTED — boom moment */}
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
              className={`w-28 h-28 rounded-3xl ${selectedAdvocate.color} flex items-center justify-center text-white font-bold text-4xl shadow-2xl mb-6`}
            >
              {selectedAdvocate.avatar}
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-3xl font-serif font-bold text-white mb-2">Connected!</h2>
              <p className="text-white/50">Joining your {callMode} call with {selectedAdvocate.name}...</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-6 flex items-center gap-2 text-emerald-400"
            >
              <Wifi className="w-5 h-5" />
              <span className="text-sm font-semibold">Secure connection established</span>
            </motion.div>
          </motion.div>
        )}

        {/* CALL — In-app audio/video call UI */}
        {stage === "call" && selectedAdvocate && (
          <motion.div
            key="call"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-gray-950 flex flex-col"
          >
            {/* Main video area */}
            <div className="flex-1 relative overflow-hidden">
              {callMode === "video" && !videoOff ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* Advocate video placeholder */}
                  <div className={`w-full h-full ${selectedAdvocate.color} opacity-10 absolute inset-0`} />
                  <div className="flex flex-col items-center">
                    <div className={`w-32 h-32 rounded-3xl ${selectedAdvocate.color} flex items-center justify-center text-white font-bold text-5xl shadow-2xl mb-4`}>
                      {selectedAdvocate.avatar}
                    </div>
                    <div className="flex items-center gap-2 text-white/50 text-sm">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Video · HD
                    </div>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  <div className="flex flex-col items-center">
                    <div className={`w-32 h-32 rounded-3xl ${selectedAdvocate.color} flex items-center justify-center text-white font-bold text-5xl shadow-2xl mb-4`}>
                      {selectedAdvocate.avatar}
                    </div>
                    <p className="text-white/50 text-sm">Audio Only</p>
                  </div>
                </div>
              )}

              {/* Top bar */}
              <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-bold text-lg">{selectedAdvocate.name}</h3>
                  <p className="text-white/50 text-xs">{selectedAdvocate.title}</p>
                </div>
                <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full text-white font-mono text-sm border border-white/10">
                  {formatDuration(callDuration)}
                </div>
              </div>

              {/* Self-view (corner) */}
              {callMode === "video" && (
                <div className="absolute bottom-28 right-4 w-28 h-36 bg-gray-800 rounded-2xl border border-white/20 overflow-hidden shadow-2xl flex items-center justify-center">
                  {videoOff ? (
                    <div className="text-white/30 text-xs text-center px-2">Camera off</div>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-b from-gray-700 to-gray-900 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                        Me
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Call info badge */}
              <div className="absolute bottom-28 left-4 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-white/60 text-xs">End-to-end encrypted</span>
              </div>
            </div>

            {/* Call controls */}
            <div className="bg-gray-900/90 backdrop-blur-md border-t border-white/10 px-6 py-6">
              <div className="flex items-center justify-center gap-6 max-w-sm mx-auto">
                <button
                  onClick={() => setMuted(m => !m)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${muted ? "bg-rose-500/20 border border-rose-500/40 text-rose-400" : "bg-white/10 border border-white/10 text-white hover:bg-white/20"}`}
                >
                  {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>

                {/* End call */}
                <button
                  onClick={endCall}
                  className="w-16 h-16 rounded-full bg-rose-500 hover:bg-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/40 transition-all hover:scale-105"
                >
                  <PhoneOff className="w-7 h-7 text-white" />
                </button>

                {callMode === "video" && (
                  <button
                    onClick={() => setVideoOff(v => !v)}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${videoOff ? "bg-rose-500/20 border border-rose-500/40 text-rose-400" : "bg-white/10 border border-white/10 text-white hover:bg-white/20"}`}
                  >
                    {videoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                  </button>
                )}
              </div>

              <p className="text-center text-white/30 text-xs mt-4">
                {muted && "Microphone muted · "}{videoOff && "Camera off · "}
                Rishika Nagpal & Associates · Legal Call
              </p>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
