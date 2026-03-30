import { useState } from "react";
import { Bell, Calendar, Clock, Scale, Plus, Trash2, AlertCircle, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useListCases } from "@workspace/api-client-react";
import { format, parseISO, isAfter, isToday } from "date-fns";

interface ManualReminder {
  id: number;
  title: string;
  note: string;
  date: string;
  time: string;
  type: "Hearing" | "Filing" | "Meeting" | "Deadline";
}

const typeColors: Record<string, string> = {
  Hearing: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  Filing: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  Meeting: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  Deadline: "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

export function AdvocateReminders() {
  const { data: cases = [] } = useListCases();
  const [reminders, setReminders] = useState<ManualReminder[]>([
    { id: 1, title: "File Written Submissions", note: "CS-2024-0991 — Delhi HC", date: "2026-04-05", time: "10:00 AM", type: "Filing" },
    { id: 2, title: "Client Meeting — Mehta", note: "Prepare bail application docs", date: "2026-04-03", time: "03:00 PM", type: "Meeting" },
  ]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", note: "", date: "", time: "", type: "Hearing" as ManualReminder["type"] });

  const upcomingCases = cases.filter(c => {
    if (!c.nextHearingDate) return false;
    try {
      return isAfter(parseISO(c.nextHearingDate), new Date()) || isToday(parseISO(c.nextHearingDate));
    } catch { return false; }
  }).sort((a, b) => {
    if (!a.nextHearingDate || !b.nextHearingDate) return 0;
    return a.nextHearingDate.localeCompare(b.nextHearingDate);
  });

  const addReminder = () => {
    if (!form.title || !form.date) return;
    setReminders(r => [...r, { ...form, id: Date.now() }]);
    setForm({ title: "", note: "", date: "", time: "", type: "Hearing" });
    setShowAdd(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Bell className="w-7 h-7 text-amber-400" />
            <h1 className="text-3xl font-serif font-bold text-white">Case Reminders</h1>
          </div>
          <p className="text-white/40 ml-10">Upcoming hearings and deadlines for your practice.</p>
        </div>
        <button
          onClick={() => setShowAdd(s => !s)}
          className="flex items-center gap-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Reminder
        </button>
      </div>

      {showAdd && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card/40 border border-amber-500/20 rounded-2xl p-6 space-y-4"
        >
          <h3 className="font-semibold text-white">New Reminder</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-amber-500/40" />
            <input placeholder="Note or case number" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-amber-500/40" />
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500/40" />
            <input placeholder="Time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-amber-500/40" />
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as ManualReminder["type"] }))} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500/40">
              <option value="Hearing">Hearing</option>
              <option value="Filing">Filing</option>
              <option value="Meeting">Meeting</option>
              <option value="Deadline">Deadline</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={addReminder} className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all">Save</button>
            <button onClick={() => setShowAdd(false)} className="text-white/40 hover:text-white text-sm px-4 py-2.5 transition-all">Cancel</button>
          </div>
        </motion.div>
      )}

      {/* From Diary — upcoming hearings */}
      {upcomingCases.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            From Your Diary — Upcoming Hearings
          </h2>
          <div className="space-y-3">
            {upcomingCases.slice(0, 5).map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.06 * i }}
                className="bg-card/40 border border-amber-500/15 rounded-2xl p-4 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Scale className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{c.caseTitle}</p>
                  <p className="text-white/40 text-xs">{c.caseNumber} · {c.courtName}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-amber-400 text-sm font-bold">
                    {c.nextHearingDate ? format(parseISO(c.nextHearingDate), "MMM d") : "—"}
                  </p>
                  <p className="text-white/30 text-xs">
                    {c.nextHearingDate && isToday(parseISO(c.nextHearingDate)) ? "TODAY" : "Upcoming"}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Manual reminders */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4 flex items-center gap-2">
          <Bell className="w-4 h-4 text-white/40" />
          Manual Reminders
        </h2>
        <div className="space-y-3">
          {reminders.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.06 * i }}
              className="bg-card/40 border border-white/10 rounded-2xl p-4 flex items-center gap-4 group hover:border-amber-500/20 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-white/40" />
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-semibold">{r.title}</p>
                <p className="text-white/40 text-xs">{r.note}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${typeColors[r.type]}`}>{r.type}</span>
                  <span className="flex items-center gap-1 text-xs text-white/30"><Calendar className="w-3 h-3" />{r.date}</span>
                  {r.time && <span className="flex items-center gap-1 text-xs text-white/30"><Clock className="w-3 h-3" />{r.time}</span>}
                </div>
              </div>
              <button onClick={() => setReminders(rs => rs.filter(x => x.id !== r.id))} className="opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-rose-400 p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
          {reminders.length === 0 && (
            <div className="text-center py-8 text-white/30 text-sm">No manual reminders added yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
