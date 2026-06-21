import { useState } from "react";
import { MessageCircle, Plus, ThumbsUp, Clock, CheckCircle, Tag, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";

interface Doubt {
  id: number;
  question: string;
  askedBy: string;
  category: string;
  timeAgo: string;
  answered: boolean;
  upvotes: number;
  answer?: string;
  answeredBy?: string;
}

const initialDoubts: Doubt[] = [
  {
    id: 1,
    question: "What is the difference between IPC Section 302 and 304? When do we argue for 304 instead of 302?",
    askedBy: "Aanya S.",
    category: "Criminal Law",
    timeAgo: "2h ago",
    answered: true,
    upvotes: 8,
    answer: "Section 302 is murder (culpable homicide amounting to murder) — carries death penalty or life imprisonment. Section 304 is culpable homicide NOT amounting to murder — carries up to 10 years (Part I) or 2 years (Part II). Argue for 304 when there's no premeditation, the act was committed in sudden provocation or heat of passion, or death was likely but not the direct intention. Under the new BNS, these correspond to Sections 101 and 105.",
    answeredBy: "Adv. Arjun Mehra",
  },
  {
    id: 2,
    question: "How do I draft a bail application under CrPC Section 437? What are the key points to include?",
    askedBy: "Rohan K.",
    category: "Procedure",
    timeAgo: "5h ago",
    answered: true,
    upvotes: 12,
    answer: "Key components: 1) Heading with Court name, case number, FIR details. 2) Brief facts of the case. 3) Grounds for bail: no flight risk, roots in community, no prior convictions, investigation complete. 4) Undertakings offered. 5) Prayer clause. Under BNSS 2023 (new code), the corresponding section is 479. Always check if the offence is bailable or non-bailable first.",
    answeredBy: "Adv. Priya Sharma",
  },
  {
    id: 3,
    question: "What documents do we need for filing a consumer complaint under the Consumer Protection Act 2019?",
    askedBy: "Deepa N.",
    category: "Consumer Law",
    timeAgo: "1d ago",
    answered: false,
    upvotes: 5,
  },
  {
    id: 4,
    question: "What is the significance of the 'res judicata' principle and how does it apply in Indian courts?",
    askedBy: "Karan M.",
    category: "Civil Law",
    timeAgo: "2d ago",
    answered: true,
    upvotes: 15,
    answer: "Res judicata (Latin: 'a matter judged') means once a court delivers a final judgment on a matter between the same parties, neither party can re-litigate the same issue. In India, it's codified in Section 11 of CPC. Essential conditions: same matter in issue, same parties, decided on merits, by a competent court. The purpose is finality of litigation and judicial economy.",
    answeredBy: "Adv. Arjun Mehra",
  },
];

const categories = ["All", "Criminal Law", "Civil Law", "Procedure", "Consumer Law", "Family Law", "Corporate"];

const categoryColors: Record<string, string> = {
  "Criminal Law": "text-rose-400 bg-rose-500/10 border-rose-500/20",
  "Civil Law": "text-blue-400 bg-blue-500/10 border-blue-500/20",
  "Procedure": "text-amber-400 bg-amber-500/10 border-amber-500/20",
  "Consumer Law": "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  "Family Law": "text-violet-400 bg-violet-500/10 border-violet-500/20",
  "Corporate": "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
};

export function InternDoubtPortal() {
  const [doubts, setDoubts] = useState<Doubt[]>(initialDoubts);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [expandedId, setExpandedId] = useState<number | null>(1);
  const [showAsk, setShowAsk] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newCategory, setNewCategory] = useState("Criminal Law");
  const [upvoted, setUpvoted] = useState<number[]>([]);

  const filtered = selectedCategory === "All"
    ? doubts
    : doubts.filter(d => d.category === selectedCategory);

  const handleAsk = () => {
    if (!newQuestion.trim()) return;
    const newDoubt: Doubt = {
      id: Date.now(),
      question: newQuestion.trim(),
      askedBy: "Intern User",
      category: newCategory,
      timeAgo: "Just now",
      answered: false,
      upvotes: 0,
    };
    setDoubts(d => [newDoubt, ...d]);
    setNewQuestion("");
    setShowAsk(false);
  };

  const toggleUpvote = (id: number) => {
    if (upvoted.includes(id)) {
      setUpvoted(u => u.filter(x => x !== id));
      setDoubts(d => d.map(dd => dd.id === id ? { ...dd, upvotes: dd.upvotes - 1 } : dd));
    } else {
      setUpvoted(u => [...u, id]);
      setDoubts(d => d.map(dd => dd.id === id ? { ...dd, upvotes: dd.upvotes + 1 } : dd));
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <MessageCircle className="w-7 h-7 text-emerald-400" />
            <h1 className="text-3xl font-serif font-bold text-[#1A2332]">Doubt Portal</h1>
          </div>
          <p className="text-[#1A2332]/40 ml-10">Ask legal doubts, get answers from senior advocates.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/intern/ai-assistant">
            <button className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2.5 rounded-xl text-sm font-bold transition-all">
              <Sparkles className="w-4 h-4" />
              Ask AI
            </button>
          </Link>
          <button
            onClick={() => setShowAsk(s => !s)}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-[#1A2332] px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
          >
            <Plus className="w-4 h-4" />
            Post Doubt
          </button>
        </div>
      </div>

      {/* Post doubt form */}
      <AnimatePresence>
        {showAsk && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-card/40 border border-emerald-500/20 rounded-2xl p-6 space-y-4"
          >
            <h3 className="font-semibold text-[#1A2332]">Post a New Doubt</h3>
            <textarea
              value={newQuestion}
              onChange={e => setNewQuestion(e.target.value)}
              placeholder="Describe your legal doubt clearly..."
              rows={3}
              className="w-full bg-[#1A2332]/5 border border-[#1A2332]/10 rounded-xl px-4 py-3 text-[#1A2332] text-sm placeholder:text-[#1A2332]/30 focus:outline-none focus:border-emerald-500/40 resize-none"
            />
            <div className="flex items-center gap-4">
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                className="bg-[#1A2332]/5 border border-[#1A2332]/10 rounded-xl px-4 py-2.5 text-[#1A2332] text-sm focus:outline-none focus:border-emerald-500/40"
              >
                {categories.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="flex gap-2">
                <button onClick={handleAsk} className="bg-emerald-500 hover:bg-emerald-600 text-[#1A2332] px-5 py-2 rounded-xl text-sm font-bold transition-all">Post</button>
                <button onClick={() => setShowAsk(false)} className="text-[#1A2332]/40 hover:text-[#1A2332] text-sm px-4 py-2 transition-all">Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`text-xs px-3 py-2 rounded-full border font-semibold transition-all ${
              selectedCategory === cat
                ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                : "bg-[#1A2332]/5 border-[#1A2332]/10 text-[#1A2332]/40 hover:text-[#1A2332]/60"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Doubts", value: doubts.length, color: "text-emerald-400" },
          { label: "Answered", value: doubts.filter(d => d.answered).length, color: "text-blue-400" },
          { label: "Pending", value: doubts.filter(d => !d.answered).length, color: "text-amber-400" },
        ].map(s => (
          <div key={s.label} className="bg-card/30 border border-[#1A2332]/10 rounded-2xl p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-[#1A2332]/30 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Doubt List */}
      <div className="space-y-3">
        {filtered.map((doubt, i) => (
          <motion.div
            key={doubt.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            className={`bg-card/40 border rounded-2xl overflow-hidden transition-all ${doubt.answered ? "border-[#1A2332]/10" : "border-amber-500/20"}`}
          >
            <div className="p-5">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${categoryColors[doubt.category] || "text-[#1A2332]/40 bg-[#1A2332]/5 border-[#1A2332]/10"}`}>
                      {doubt.category}
                    </span>
                    {doubt.answered ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full border text-emerald-400 bg-emerald-500/10 border-emerald-500/20 font-bold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Answered
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full border text-amber-400 bg-amber-500/10 border-amber-500/20 font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Pending
                      </span>
                    )}
                    <span className="text-xs text-[#1A2332]/30 ml-auto">{doubt.timeAgo} · {doubt.askedBy}</span>
                  </div>
                  <p className="text-[#1A2332] font-medium text-sm leading-relaxed cursor-pointer" onClick={() => setExpandedId(expandedId === doubt.id ? null : doubt.id)}>
                    {doubt.question}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={() => toggleUpvote(doubt.id)}
                  className={`flex items-center gap-1.5 text-xs font-semibold transition-all ${upvoted.includes(doubt.id) ? "text-emerald-400" : "text-[#1A2332]/30 hover:text-[#1A2332]/60"}`}
                >
                  <ThumbsUp className={`w-3.5 h-3.5 ${upvoted.includes(doubt.id) ? "fill-emerald-400" : ""}`} />
                  {doubt.upvotes}
                </button>
                {doubt.answered && (
                  <button
                    onClick={() => setExpandedId(expandedId === doubt.id ? null : doubt.id)}
                    className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold ml-auto"
                  >
                    {expandedId === doubt.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {expandedId === doubt.id ? "Hide Answer" : "View Answer"}
                  </button>
                )}
              </div>
            </div>

            {/* Answer */}
            <AnimatePresence>
              {expandedId === doubt.id && doubt.answered && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-t border-emerald-500/15 bg-emerald-500/5 px-5 py-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-400">Answer from {doubt.answeredBy}</span>
                  </div>
                  <p className="text-[#1A2332]/80 text-sm leading-relaxed">{doubt.answer}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
