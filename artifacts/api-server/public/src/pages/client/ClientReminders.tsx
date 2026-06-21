import { useState } from "react";
import { Bell, Calendar, Clock, Scale, Plus, Trash2, CheckCircle, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

interface Reminder {
  id: number;
  caseTitle: string;
  caseNumber: string;
  court: string;
  hearingDate: string;
  hearingTime: string;
  type: "Hearing" | "Submission" | "Order";
  status: "upcoming" | "today" | "past";
}

const initialReminders: Reminder[] = [
  {
    id: 1,
    caseTitle: "Employment Dispute vs ABC Corp",
    caseNumber: "CS-2024-1142",
    court: "Delhi High Court",
    hearingDate: "2026-04-04",
    hearingTime: "11:00 AM",
    type: "Hearing",
    status: "upcoming",
  },
  {
    id: 2,
    caseTitle: "Property Dispute — Sector 62",
    caseNumber: "CS-2024-0887",
    court: "District Court",
    hearingDate: "2026-04-10",
    hearingTime: "02:30 PM",
    type: "Submission",
    status: "upcoming",
  },
  {
    id: 3,
    caseTitle: "Defamation Case — Senior Advocate v Singh",
    caseNumber: "CS-2023-0341",
    court: "Delhi High Court",
    hearingDate: "2026-03-28",
    hearingTime: "10:00 AM",
    type: "Order",
    status: "past",
  },
];

const typeColors: Record<string, string> = {
  Hearing: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  Submission: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  Order: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
};

const statusBadge: Record<string, string> = {
  today: "text-rose-400 bg-rose-500/10 border border-rose-500/20",
  upcoming: "text-blue-400 bg-blue-500/10 border border-blue-500/20",
  past: "text-[#1A2332]/30 bg-[#1A2332]/5 border border-[#1A2332]/10",
};

export function ClientReminders() {
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ caseTitle: "", caseNumber: "", court: "", hearingDate: "", hearingTime: "", type: "Hearing" as Reminder["type"] });

  const deleteReminder = (id: number) => setReminders(r => r.filter(x => x.id !== id));

  const addReminder = () => {
    if (!form.caseTitle || !form.hearingDate) return;
    const now = new Date().toISOString().split("T")[0];
    const status: Reminder["status"] = form.hearingDate === now ? "today" : form.hearingDate > now ? "upcoming" : "past";
    setReminders(r => [...r, { ...form, id: Date.now(), status }]);
    setForm({ caseTitle: "", caseNumber: "", court: "", hearingDate: "", hearingTime: "", type: "Hearing" });
    setShowAdd(false);
  };

  const upcoming = reminders.filter(r => r.status !== "past");
  const past = reminders.filter(r => r.status === "past");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Bell className="w-7 h-7 text-amber-400" />
            <h1 className="text-3xl font-serif font-bold text-[#1A2332]">Case Reminders</h1>
          </div>
          <p className="text-[#1A2332]/40 ml-10">Stay ahead of every hearing and deadline.</p>
        </div>
        <button
          onClick={() => setShowAdd(s => !s)}
          className="flex items-center gap-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Reminder
        </button>
      </div>

      {/* Add Reminder Form */}
      {showAdd && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card/40 border border-amber-500/20 rounded-2xl p-6 space-y-4"
        >
          <h3 className="font-semibold text-[#1A2332] mb-2">New Reminder</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              placeholder="Case Title"
              value={form.caseTitle}
              onChange={e => setForm(f => ({ ...f, caseTitle: e.target.value }))}
              className="bg-[#1A2332]/5 border border-[#1A2332]/10 rounded-xl px-4 py-3 text-[#1A2332] text-sm placeholder:text-[#1A2332]/30 focus:outline-none focus:border-amber-500/40"
            />
            <input
              placeholder="Case Number"
              value={form.caseNumber}
              onChange={e => setForm(f => ({ ...f, caseNumber: e.target.value }))}
              className="bg-[#1A2332]/5 border border-[#1A2332]/10 rounded-xl px-4 py-3 text-[#1A2332] text-sm placeholder:text-[#1A2332]/30 focus:outline-none focus:border-amber-500/40"
            />
            <input
              placeholder="Court Name"
              value={form.court}
              onChange={e => setForm(f => ({ ...f, court: e.target.value }))}
              className="bg-[#1A2332]/5 border border-[#1A2332]/10 rounded-xl px-4 py-3 text-[#1A2332] text-sm placeholder:text-[#1A2332]/30 focus:outline-none focus:border-amber-500/40"
            />
            <select
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value as Reminder["type"] }))}
              className="bg-[#1A2332]/5 border border-[#1A2332]/10 rounded-xl px-4 py-3 text-[#1A2332] text-sm focus:outline-none focus:border-amber-500/40"
            >
              <option value="Hearing">Hearing</option>
              <option value="Submission">Submission</option>
              <option value="Order">Order</option>
            </select>
            <input
              type="date"
              value={form.hearingDate}
              onChange={e => setForm(f => ({ ...f, hearingDate: e.target.value }))}
              className="bg-[#1A2332]/5 border border-[#1A2332]/10 rounded-xl px-4 py-3 text-[#1A2332] text-sm focus:outline-none focus:border-amber-500/40"
            />
            <input
              placeholder="Time (e.g. 10:30 AM)"
              value={form.hearingTime}
              onChange={e => setForm(f => ({ ...f, hearingTime: e.target.value }))}
              className="bg-[#1A2332]/5 border border-[#1A2332]/10 rounded-xl px-4 py-3 text-[#1A2332] text-sm placeholder:text-[#1A2332]/30 focus:outline-none focus:border-amber-500/40"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={addReminder} className="bg-amber-500 hover:bg-amber-600 text-[#1A2332] px-5 py-2.5 rounded-xl text-sm font-bold transition-all">Save Reminder</button>
            <button onClick={() => setShowAdd(false)} className="text-[#1A2332]/40 hover:text-[#1A2332] text-sm px-4 py-2.5 transition-all">Cancel</button>
          </div>
        </motion.div>
      )}

      {/* Upcoming */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#1A2332]/40 mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          Upcoming & Active
        </h2>
        <div className="space-y-3">
          {upcoming.length === 0 && (
            <div className="text-center py-10 text-[#1A2332]/30 text-sm">No upcoming reminders</div>
          )}
          {upcoming.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i }}
              className="bg-card/40 border border-[#1A2332]/10 rounded-2xl p-5 flex items-start gap-4 group hover:border-amber-500/20 transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col items-center justify-center text-amber-400 flex-shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-[#1A2332] text-sm leading-tight">{r.caseTitle}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider flex-shrink-0 ${statusBadge[r.status]}`}>
                    {r.status === "today" ? "TODAY" : "Upcoming"}
                  </span>
                </div>
                <p className="text-[#1A2332]/40 text-xs mb-2">{r.caseNumber} · {r.court}</p>
                <div className="flex items-center gap-4 text-xs">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] font-semibold ${typeColors[r.type]}`}>
                    <Scale className="w-3 h-3" />
                    {r.type}
                  </span>
                  <span className="flex items-center gap-1 text-[#1A2332]/40">
                    <Calendar className="w-3.5 h-3.5" />
                    {r.hearingDate}
                  </span>
                  {r.hearingTime && (
                    <span className="flex items-center gap-1 text-[#1A2332]/40">
                      <Clock className="w-3.5 h-3.5" />
                      {r.hearingTime}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => deleteReminder(r.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-[#1A2332]/20 hover:text-rose-400 p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Past */}
      {past.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#1A2332]/30 mb-4 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-[#1A2332]/30" />
            Past Hearings
          </h2>
          <div className="space-y-3">
            {past.map((r, i) => (
              <div key={r.id} className="bg-card/20 border border-white/5 rounded-2xl p-5 flex items-start gap-4 opacity-60 group">
                <div className="w-12 h-12 rounded-2xl bg-[#1A2332]/5 border border-[#1A2332]/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-[#1A2332]/30" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[#1A2332]/60 text-sm">{r.caseTitle}</h3>
                  <p className="text-[#1A2332]/30 text-xs">{r.caseNumber} · {r.court}</p>
                  <p className="text-[#1A2332]/20 text-xs mt-1">{r.hearingDate} · {r.type}</p>
                </div>
                <button onClick={() => deleteReminder(r.id)} className="opacity-0 group-hover:opacity-100 text-[#1A2332]/20 hover:text-rose-400 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
