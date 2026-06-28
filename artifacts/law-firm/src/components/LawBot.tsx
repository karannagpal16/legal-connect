import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bot, BookOpen, FileSearch, Gavel, Lock, Send, ShieldCheck, Sparkles } from "lucide-react";
import {
  answerFromApprovedSources,
  LAW_BOT_DISCLAIMER,
  LAW_BOT_SOURCE_MODES,
  LawBotSource,
  LawBotSourceMode,
} from "@/data/lawbotSources";

type ChatTurn = {
  id: number;
  question: string;
  answer: string;
  citations: LawBotSource[];
};

const sampleQuestions = [
  "What happens in cheque bounce under Section 138?",
  "Explain rent agreement basics",
  "What is BNS Section 103?",
  "How does consumer complaint work?",
  "Summarise privacy under Article 21",
];

export function LawBot({ audience }: { audience: "client" | "advocate" }) {
  const [mode, setMode] = useState<LawBotSourceMode>(
    audience === "client" ? "Client Simple Explanation" : "Advocate Research",
  );
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      id: 1,
      question: "System greeting",
      answer:
        "Namaste. I am Legal Connect LawBot. I answer only from approved Indian legal source snippets loaded in this demo. Ask about Bare Acts, case laws, amendments, tenancy, consumer issues, cheque bounce, or criminal law transitions.",
      citations: [],
    },
  ]);

  const latestCitations = useMemo(() => turns[turns.length - 1]?.citations ?? [], [turns]);

  const ask = (question = input) => {
    const cleanQuestion = question.trim();
    if (!cleanQuestion) return;
    const result = answerFromApprovedSources(cleanQuestion, mode);
    setTurns((current) => [
      ...current,
      {
        id: Date.now(),
        question: cleanQuestion,
        answer: result.answer,
        citations: result.citations,
      },
    ]);
    setInput("");
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-3xl border border-[#D4A050]/30 bg-[#101820] text-white shadow-2xl shadow-[#1A2332]/20">
        <div className="relative p-6 md:p-8">
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top_right,_rgba(212,160,80,0.32),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(41,84,116,0.45),_transparent_40%)]" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#D4A050]/40 bg-[#D4A050]/15">
                <Bot className="h-7 w-7 text-[#F5C76A]" />
              </div>
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                  <Lock className="h-3.5 w-3.5" /> Source-restricted MVP
                </div>
                <h1 className="font-serif text-3xl font-bold tracking-tight md:text-4xl">Legal Connect LawBot</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
                  Indian legal research assistant that answers only from approved snippets. No general AI knowledge, no live SCC or Bar & Bench integration in this demo.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                ["9", "Mock sources"],
                ["6", "Modes"],
                ["0", "Live scrapes"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-2xl font-bold text-[#F5C76A]">{value}</div>
                  <div className="text-[10px] uppercase tracking-widest text-white/45">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-[#1A2332]/10 bg-white/80 p-4 shadow-xl shadow-[#1A2332]/5">
          <div className="mb-4 grid gap-3 md:grid-cols-[220px_1fr]">
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-widest text-[#D4A050]">Source mode</span>
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value as LawBotSourceMode)}
                className="h-12 w-full rounded-2xl border border-[#1A2332]/15 bg-[#F8F6F3] px-4 text-sm font-semibold text-[#1A2332] outline-none focus:border-[#D4A050]"
              >
                {LAW_BOT_SOURCE_MODES.map((sourceMode) => (
                  <option key={sourceMode} value={sourceMode}>
                    {sourceMode}
                  </option>
                ))}
              </select>
            </label>
            <div className="rounded-2xl border border-[#1A2332]/10 bg-[#F8F6F3] p-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#1A2332]">
                <ShieldCheck className="h-4 w-4 text-emerald-600" /> Guardrail active
              </div>
              <p className="mt-1 text-xs leading-5 text-[#1A2332]/55">
                If the local approved source database has no match, LawBot must respond: "I could not find this in the approved legal sources."
              </p>
            </div>
          </div>

          <div className="h-[460px] space-y-4 overflow-y-auto rounded-2xl border border-[#1A2332]/10 bg-[#F7F2EC] p-4">
            {turns.map((turn) => (
              <div key={turn.id} className="space-y-3">
                {turn.question !== "System greeting" && (
                  <div className="ml-auto max-w-[86%] rounded-2xl bg-[#1A2332] px-4 py-3 text-sm text-white">
                    {turn.question}
                  </div>
                )}
                <div className="max-w-[92%] rounded-2xl border border-[#D4A050]/25 bg-white px-4 py-3 text-sm leading-6 text-[#1A2332] shadow-sm">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D4A050]">
                    <Sparkles className="h-3.5 w-3.5" /> Approved-source answer
                  </div>
                  {turn.answer}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {sampleQuestions.map((question) => (
              <button
                key={question}
                onClick={() => ask(question)}
                className="rounded-full border border-[#1A2332]/10 bg-[#1A2332]/5 px-3 py-2 text-xs font-semibold text-[#1A2332]/70 transition hover:border-[#D4A050]/40 hover:bg-[#D4A050]/10"
              >
                {question}
              </button>
            ))}
          </div>

          <div className="mt-4 flex gap-3">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") ask();
              }}
              placeholder="Ask only from approved Indian legal sources..."
              className="h-13 min-h-13 flex-1 rounded-2xl border border-[#1A2332]/15 bg-white px-4 text-sm text-[#1A2332] outline-none focus:border-[#D4A050]"
            />
            <button
              onClick={() => ask()}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#D4A050] px-5 py-3 text-sm font-bold text-[#1A2332] shadow-lg shadow-[#D4A050]/20 transition hover:bg-[#F5C76A]"
            >
              <Send className="h-4 w-4" /> Ask
            </button>
          </div>
        </motion.section>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-[#1A2332]/10 bg-white/80 p-5 shadow-xl shadow-[#1A2332]/5">
            <div className="mb-4 flex items-center gap-2">
              <FileSearch className="h-5 w-5 text-[#D4A050]" />
              <h2 className="font-serif text-xl font-bold text-[#1A2332]">Citations</h2>
            </div>
            {latestCitations.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[#1A2332]/15 bg-[#F8F6F3] p-4 text-sm leading-6 text-[#1A2332]/55">
                Citations will appear here when LawBot finds an approved source.
              </p>
            ) : (
              <div className="space-y-3">
                {latestCitations.map((source) => (
                  <div key={source.id} className="rounded-2xl border border-[#1A2332]/10 bg-[#F8F6F3] p-4">
                    <div className="mb-2 inline-flex rounded-full bg-[#D4A050]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[#8A5A13]">
                      {source.sourceType}
                    </div>
                    <h3 className="text-sm font-bold leading-5 text-[#1A2332]">{source.title}</h3>
                    <p className="mt-1 text-xs text-[#1A2332]/50">{source.courtOrAuthority} | {source.date}</p>
                    <p className="mt-2 text-xs font-semibold leading-5 text-[#1A2332]/65">{source.citation}</p>
                    {source.url && (
                      <a className="mt-2 inline-block text-xs font-bold text-[#B97818] underline" href={source.url} target="_blank" rel="noreferrer">
                        Open source portal
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-amber-500/25 bg-amber-50 p-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[#1A2332]">
              <Gavel className="h-4 w-4 text-[#D4A050]" /> Legal information disclaimer
            </div>
            <p className="text-xs leading-5 text-[#1A2332]/60">{LAW_BOT_DISCLAIMER}</p>
          </div>

          <div className="rounded-3xl border border-[#1A2332]/10 bg-[#101820] p-5 text-white">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold">
              <BookOpen className="h-4 w-4 text-[#F5C76A]" /> Future live connectors
            </div>
            <p className="text-xs leading-5 text-white/55">
              SCC_ONLINE_API_KEY, BAR_AND_BENCH_API_KEY, and INDIAN_KANOON_API_KEY are placeholders only. They are not connected in this MVP.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
