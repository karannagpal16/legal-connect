import { useState } from "react";
import { CalendarCheck, Check, X, Clock, User, IndianRupee, Video, Phone, MessageSquare, Star, ChevronRight, Plus, Edit3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BookingRequest {
  id: string;
  clientName: string;
  type: "video" | "audio" | "in-person";
  date: string;
  time: string;
  duration: number;
  matter: string;
  status: "pending" | "confirmed" | "declined" | "completed";
  rating?: number;
  amount: number;
}

const initialBookings: BookingRequest[] = [
  { id: "b1", clientName: "Ananya Singh", type: "video", date: "Apr 4, 2026", time: "10:30 AM", duration: 60, matter: "Property dispute consultation", status: "pending", amount: 3000 },
  { id: "b2", clientName: "Ravi Kumar", type: "audio", date: "Apr 4, 2026", time: "2:00 PM", duration: 30, matter: "FIR — section clarification", status: "pending", amount: 1500 },
  { id: "b3", clientName: "Sunita Joshi", type: "in-person", date: "Apr 5, 2026", time: "11:00 AM", duration: 60, matter: "Divorce proceedings guidance", status: "confirmed", amount: 3000 },
  { id: "b4", clientName: "Amit Verma", type: "video", date: "Apr 2, 2026", time: "3:30 PM", duration: 90, matter: "Business contract review", status: "completed", rating: 5, amount: 4500 },
  { id: "b5", clientName: "Neha Gupta", type: "audio", date: "Mar 30, 2026", time: "12:00 PM", duration: 30, matter: "Consumer complaint advice", status: "completed", rating: 4, amount: 1500 },
];

const rateCards = [
  { type: "Quick Query", duration: "30 min", price: 1500, icon: MessageSquare, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/25", desc: "Phone / audio call" },
  { type: "Standard", duration: "60 min", price: 3000, icon: Video, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/25", desc: "Video consultation" },
  { type: "Extended", duration: "90 min", price: 4500, icon: CalendarCheck, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/25", desc: "In-depth video session" },
  { type: "In-Person", duration: "60 min", price: 5000, icon: User, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/25", desc: "Chamber visit" },
];

const typeConfig = {
  video: { icon: Video, label: "Video", color: "text-violet-400" },
  audio: { icon: Phone, label: "Audio", color: "text-blue-400" },
  "in-person": { icon: User, label: "In-Person", color: "text-emerald-400" },
};

const statusConfig = {
  pending: { label: "Awaiting", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/25" },
  confirmed: { label: "Confirmed", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/25" },
  declined: { label: "Declined", color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/25" },
  completed: { label: "Completed", color: "text-white/40", bg: "bg-white/5 border-white/10" },
};

export function AdvocateBookings() {
  const [bookings, setBookings] = useState<BookingRequest[]>(initialBookings);
  const [activeTab, setActiveTab] = useState<"requests" | "rates" | "history">("requests");
  const [editingRates, setEditingRates] = useState(false);
  const [rates, setRates] = useState({ quick: 1500, standard: 3000, extended: 4500, inperson: 5000 });

  const pending = bookings.filter(b => b.status === "pending");
  const confirmed = bookings.filter(b => b.status === "confirmed");
  const completed = bookings.filter(b => b.status === "completed");
  const totalEarned = completed.reduce((sum, b) => sum + b.amount, 0);

  const accept = (id: string) => setBookings(bs => bs.map(b => b.id === id ? { ...b, status: "confirmed" } : b));
  const decline = (id: string) => setBookings(bs => bs.map(b => b.id === id ? { ...b, status: "declined" } : b));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <CalendarCheck className="w-7 h-7 text-amber-400" />
            <h1 className="text-3xl font-serif font-bold text-white">Consultation Bookings</h1>
          </div>
          <p className="text-white/40 ml-10">Manage incoming requests and set your rates.</p>
        </div>
        {pending.length > 0 && (
          <div className="flex items-center gap-2 bg-rose-500/15 border border-rose-500/30 px-4 py-2 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
            <span className="text-rose-400 text-sm font-bold">{pending.length} new request{pending.length > 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Pending", value: pending.length, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
          { label: "Confirmed", value: confirmed.length, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
          { label: "Completed", value: completed.length, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
          { label: "Earned (Total)", value: `₹${totalEarned.toLocaleString()}`, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
        ].map((s) => (
          <div key={s.label} className={`border rounded-2xl p-4 text-center ${s.bg}`}>
            <div className={`text-2xl font-bold ${s.color} mb-1`}>{s.value}</div>
            <div className="text-xs text-white/35 uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([["requests", "Requests"], ["rates", "My Rates"], ["history", "History"]] as const).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab
                ? "bg-amber-500/20 border border-amber-500/30 text-amber-400"
                : "bg-white/5 border border-white/10 text-white/40 hover:text-white/60"
            }`}
          >
            {label}
            {tab === "requests" && pending.length > 0 && (
              <span className="ml-2 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold inline-flex items-center justify-center">{pending.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Requests Tab */}
      {activeTab === "requests" && (
        <div className="space-y-6">
          {pending.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" /> New Requests
              </h3>
              <div className="space-y-3">
                {pending.map((b, i) => {
                  const T = typeConfig[b.type];
                  return (
                    <motion.div
                      key={b.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.06 * i }}
                      className="bg-amber-500/8 border border-amber-500/30 rounded-2xl p-5"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-white/60" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div>
                              <p className="text-white font-bold">{b.clientName}</p>
                              <p className="text-white/45 text-xs mt-0.5">{b.matter}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-amber-400 font-bold text-lg">₹{b.amount.toLocaleString()}</p>
                              <p className="text-white/35 text-xs">{b.duration} min</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-3 flex-wrap">
                            <span className={`flex items-center gap-1.5 text-xs font-semibold ${T.color}`}>
                              <T.icon className="w-3.5 h-3.5" /> {T.label}
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-white/40">
                              <Clock className="w-3.5 h-3.5" /> {b.date} · {b.time}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-4">
                        <button
                          onClick={() => accept(b.id)}
                          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex-1 justify-center"
                        >
                          <Check className="w-4 h-4" /> Accept
                        </button>
                        <button
                          onClick={() => decline(b.id)}
                          className="flex items-center gap-2 bg-white/10 hover:bg-rose-500/20 text-white/60 hover:text-rose-400 border border-white/10 hover:border-rose-500/30 px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex-1 justify-center"
                        >
                          <X className="w-4 h-4" /> Decline
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {confirmed.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-3">Confirmed Sessions</h3>
              <div className="space-y-3">
                {confirmed.map((b) => {
                  const T = typeConfig[b.type];
                  return (
                    <div key={b.id} className="bg-emerald-500/8 border border-emerald-500/20 rounded-2xl p-5 flex items-center gap-4">
                      <div className="flex-1">
                        <p className="text-white font-bold">{b.clientName}</p>
                        <p className="text-white/45 text-xs mt-0.5">{b.matter}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className={`flex items-center gap-1.5 text-xs ${T.color}`}><T.icon className="w-3.5 h-3.5" /> {T.label}</span>
                          <span className="text-xs text-white/35"><Clock className="w-3 h-3 inline mr-1" />{b.date} · {b.time}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-emerald-400 font-bold">₹{b.amount.toLocaleString()}</p>
                        <span className="text-[10px] text-emerald-400/60 uppercase font-bold">Confirmed</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {pending.length === 0 && confirmed.length === 0 && (
            <div className="text-center py-16 text-white/30">
              <CalendarCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No pending requests right now.</p>
            </div>
          )}
        </div>
      )}

      {/* Rates Tab */}
      {activeTab === "rates" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold">My Consultation Rates</h3>
            <button
              onClick={() => setEditingRates(e => !e)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white/60 hover:text-white border border-white/10 px-4 py-2 rounded-xl text-sm font-bold transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" /> {editingRates ? "Save Rates" : "Edit Rates"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {rateCards.map((r, i) => {
              const rateKey = i === 0 ? "quick" : i === 1 ? "standard" : i === 2 ? "extended" : "inperson";
              const currentRate = rates[rateKey as keyof typeof rates];
              return (
                <motion.div
                  key={r.type}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * i }}
                  className={`border rounded-2xl p-6 ${r.bg}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                      <r.icon className={`w-5 h-5 ${r.color}`} />
                    </div>
                    {i === 1 && (
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/20">POPULAR</span>
                    )}
                  </div>
                  <h4 className="text-white font-bold mb-0.5">{r.type} Consultation</h4>
                  <p className="text-white/40 text-xs mb-4">{r.desc} · {r.duration}</p>

                  {editingRates ? (
                    <div className="flex items-center gap-2">
                      <span className="text-white/60 text-sm">₹</span>
                      <input
                        type="number"
                        value={currentRate}
                        onChange={e => setRates(prev => ({ ...prev, [rateKey]: Number(e.target.value) }))}
                        className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white font-bold text-lg focus:outline-none focus:border-amber-500/40 w-full"
                      />
                      <span className="text-white/40 text-xs">per session</span>
                    </div>
                  ) : (
                    <div className={`text-2xl font-bold ${r.color}`}>
                      ₹{currentRate.toLocaleString()}
                      <span className="text-sm font-normal text-white/30 ml-1">/ session</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          <div className="bg-card/30 border border-white/8 rounded-2xl p-5">
            <h4 className="text-white font-bold mb-3 flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-amber-400" /> Rate Summary
            </h4>
            <div className="space-y-2">
              {[
                { label: "Hourly effective rate (30 min call)", value: `₹${(rates.quick * 2).toLocaleString()}/hr` },
                { label: "Hourly effective rate (60 min video)", value: `₹${rates.standard.toLocaleString()}/hr` },
                { label: "Hourly effective rate (90 min session)", value: `₹${Math.round(rates.extended / 1.5).toLocaleString()}/hr` },
              ].map(r => (
                <div key={r.label} className="flex justify-between text-sm">
                  <span className="text-white/45">{r.label}</span>
                  <span className="text-amber-400 font-bold">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <div className="space-y-3">
          {[...completed, ...bookings.filter(b => b.status === "declined")].map((b, i) => {
            const T = typeConfig[b.type];
            const S = statusConfig[b.status];
            return (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 * i }}
                className="bg-card/30 border border-white/8 rounded-2xl p-5 flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-white font-bold">{b.clientName}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${S.bg} ${S.color}`}>{S.label}</span>
                  </div>
                  <p className="text-white/40 text-xs">{b.matter}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className={`text-xs flex items-center gap-1 ${T.color}`}><T.icon className="w-3 h-3" />{T.label}</span>
                    <span className="text-xs text-white/30">{b.date}</span>
                    {b.rating && (
                      <span className="text-xs text-amber-400 flex items-center gap-0.5">
                        {"★".repeat(b.rating)}{"☆".repeat(5 - b.rating)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`font-bold ${b.status === "completed" ? "text-emerald-400" : "text-white/30 line-through"}`}>
                    ₹{b.amount.toLocaleString()}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
