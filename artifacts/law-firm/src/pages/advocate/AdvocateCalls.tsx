import { useState } from "react";
import { Video, Phone, User, Clock, Check, X, Mic, MicOff, VideoOff, PhoneOff, Shield, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface IncomingCall {
  id: number;
  clientName: string;
  clientInitials: string;
  issue: string;
  mode: "video" | "audio";
  waitingTime: string;
  rating: number;
}

const incomingCalls: IncomingCall[] = [
  {
    id: 1,
    clientName: "Rahul Verma",
    clientInitials: "RV",
    issue: "Employment dispute — wrongful termination",
    mode: "video",
    waitingTime: "0:32",
    rating: 4.8,
  },
  {
    id: 2,
    clientName: "Sunita Joshi",
    clientInitials: "SJ",
    issue: "Property documentation query",
    mode: "audio",
    waitingTime: "1:15",
    rating: 4.5,
  },
];

const recentCalls = [
  { name: "Ajay Mehta", issue: "Bail application advice", mode: "video", duration: "18 min", when: "Today, 9:45 AM", resolved: true },
  { name: "Meena Kapoor", issue: "Divorce proceedings", mode: "audio", duration: "34 min", when: "Yesterday, 3:10 PM", resolved: true },
  { name: "Pradeep Nair", issue: "FIR quashing query", mode: "video", duration: "12 min", when: "Mar 28", resolved: true },
];

type Stage = "list" | "call";

export function AdvocateCalls() {
  const [acceptedCall, setAcceptedCall] = useState<IncomingCall | null>(null);
  const [stage, setStage] = useState<Stage>("list");
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [dismissed, setDismissed] = useState<number[]>([]);

  const handleAccept = (call: IncomingCall) => {
    setAcceptedCall(call);
    setStage("call");
    const timer = setInterval(() => setCallDuration(d => d + 1), 1000);
    (window as any)._callTimer = timer;
  };

  const handleDecline = (id: number) => setDismissed(d => [...d, id]);

  const endCall = () => {
    setStage("list");
    clearInterval((window as any)._callTimer);
    setCallDuration(0);
    setMuted(false);
    setVideoOff(false);
    setAcceptedCall(null);
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const visibleCalls = incomingCalls.filter(c => !dismissed.includes(c.id));

  if (stage === "call" && acceptedCall) {
    return (
      <motion.div
        key="call"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 bg-gray-950 flex flex-col"
      >
        <div className="flex-1 relative flex items-center justify-center bg-gray-900">
          <div className="flex flex-col items-center">
            <div className="w-28 h-28 rounded-3xl bg-blue-500 flex items-center justify-center text-white font-bold text-4xl shadow-2xl mb-4">
              {acceptedCall.clientInitials}
            </div>
            <h3 className="text-white text-xl font-bold">{acceptedCall.clientName}</h3>
            <p className="text-white/40 text-sm mt-1">{acceptedCall.issue}</p>
          </div>

          <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
            <div>
              <span className="text-white/50 text-xs">Incoming from client</span>
            </div>
            <div className="bg-black/40 backdrop-blur px-4 py-1.5 rounded-full text-white font-mono text-sm border border-white/10">
              {formatDuration(callDuration)}
            </div>
          </div>

          {acceptedCall.mode === "video" && (
            <div className="absolute bottom-28 right-4 w-28 h-36 bg-gray-800 rounded-2xl border border-white/20 flex items-center justify-center">
              {videoOff ? (
                <span className="text-white/30 text-xs">Camera off</span>
              ) : (
                <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold">RN</div>
              )}
            </div>
          )}

          <div className="absolute bottom-28 left-4 flex items-center gap-2 bg-black/40 backdrop-blur px-3 py-1.5 rounded-full border border-white/10">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-white/50 text-xs">Secure · Encrypted</span>
          </div>
        </div>

        <div className="bg-gray-900/90 backdrop-blur border-t border-white/10 px-6 py-6">
          <div className="flex items-center justify-center gap-6 max-w-sm mx-auto">
            <button
              onClick={() => setMuted(m => !m)}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${muted ? "bg-rose-500/20 border border-rose-500/40 text-rose-400" : "bg-white/10 border border-white/10 text-white"}`}
            >
              {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>
            <button onClick={endCall} className="w-16 h-16 rounded-full bg-rose-500 hover:bg-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/40">
              <PhoneOff className="w-7 h-7 text-white" />
            </button>
            {acceptedCall.mode === "video" && (
              <button
                onClick={() => setVideoOff(v => !v)}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${videoOff ? "bg-rose-500/20 border border-rose-500/40 text-rose-400" : "bg-white/10 border border-white/10 text-white"}`}
              >
                {videoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Video className="w-7 h-7 text-amber-400" />
          <h1 className="text-3xl font-serif font-bold text-white">Client Calls</h1>
        </div>
        <p className="text-white/40 ml-10">Manage incoming and recent client audio/video calls.</p>
      </div>

      {/* Incoming calls */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
          Incoming Requests
        </h2>

        {visibleCalls.length === 0 ? (
          <div className="bg-card/30 border border-white/10 rounded-2xl p-10 text-center">
            <Phone className="w-8 h-8 text-white/20 mx-auto mb-3" />
            <p className="text-white/30 text-sm">No incoming calls right now.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleCalls.map((call, i) => (
              <motion.div
                key={call.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i }}
                className="bg-card/40 border border-rose-500/20 rounded-2xl p-5 flex items-center gap-4"
              >
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center text-white font-bold text-lg">
                    {call.clientInitials}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-rose-400 border-2 border-background animate-pulse" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-bold text-white">{call.clientName}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${call.mode === "video" ? "text-blue-400 bg-blue-500/10 border-blue-500/20" : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"}`}>
                      {call.mode}
                    </span>
                  </div>
                  <p className="text-white/50 text-xs mb-1">{call.issue}</p>
                  <div className="flex items-center gap-3 text-xs text-white/30">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Waiting {call.waitingTime}</span>
                    <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400 fill-amber-400" />{call.rating}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleAccept(call)}
                    className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all"
                  >
                    <Check className="w-4 h-4" /> Accept
                  </button>
                  <button
                    onClick={() => handleDecline(call.id)}
                    className="flex items-center gap-1.5 bg-white/10 hover:bg-rose-500/20 text-white/60 hover:text-rose-400 px-4 py-2 rounded-xl text-sm font-bold transition-all border border-white/10"
                  >
                    <X className="w-4 h-4" /> Decline
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Recent calls */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">Recent Calls</h2>
        <div className="space-y-3">
          {recentCalls.map((call, i) => (
            <div key={i} className="bg-card/30 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                {call.mode === "video" ? <Video className="w-5 h-5 text-white/40" /> : <Phone className="w-5 h-5 text-white/40" />}
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-semibold">{call.name}</p>
                <p className="text-white/40 text-xs">{call.issue}</p>
              </div>
              <div className="text-right">
                <p className="text-white/30 text-xs">{call.when}</p>
                <p className="text-white/20 text-xs">{call.duration}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
