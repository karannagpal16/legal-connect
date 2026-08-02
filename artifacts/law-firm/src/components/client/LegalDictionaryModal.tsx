import { useEffect, useMemo, useState } from "react";
import { BookOpenText, Copy, Search, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import {
  LEGAL_DICTIONARY_CATEGORIES,
  searchLegalDictionary,
  type LegalDictionaryCategory,
  type LegalDictionaryTerm,
} from "@/data/legalDictionaryData";

type Props = {
  open: boolean;
  onClose: () => void;
  initialQuery?: string;
};

export function LegalDictionaryModal({ open, onClose, initialQuery = "" }: Props) {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<LegalDictionaryCategory | "all">("all");
  const [copiedId, setCopiedId] = useState("");
  const [active, setActive] = useState<LegalDictionaryTerm | null>(null);

  useEffect(() => {
    if (open) setQuery(initialQuery || "");
  }, [open, initialQuery]);

  const results = useMemo(() => searchLegalDictionary(query, category), [query, category]);

  const copyDefinition = async (item: LegalDictionaryTerm) => {
    const text = `${item.term} (${item.phonetic}): ${item.definition} Why it matters: ${item.whyItMatters}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(item.id);
      window.setTimeout(() => setCopiedId(""), 1600);
    } catch {
      // ignore clipboard failures (permissions / insecure context)
    }
  };

  const askLawBot = (item: LegalDictionaryTerm) => {
    onClose();
    setLocation(`/client/lawbot?q=${encodeURIComponent(`Explain ${item.term} in simple words for a client.`)}`);
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="lc-dict-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="lc-dict-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Legal terms dictionary"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2 }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="lc-dict-head">
              <div>
                <span className="lc-kicker">PLAIN-ENGLISH LEGAL GUIDE</span>
                <h2><BookOpenText /> Legal Terms Dictionary</h2>
                <p>Search court words and see what they mean for your case — without legalese.</p>
              </div>
              <button type="button" className="lc-button" onClick={onClose} aria-label="Close dictionary"><X /></button>
            </header>

            <label className="lc-dict-search">
              <Search />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search Bail, Caveat, Vakalatnama…"
                aria-label="Search legal terms"
              />
            </label>

            <div className="lc-dict-filters" role="list">
              {LEGAL_DICTIONARY_CATEGORIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="listitem"
                  className={category === item.id ? "is-active" : undefined}
                  onClick={() => setCategory(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="lc-dict-body">
              <ul className="lc-dict-results">
                {results.map((item) => (
                  <li key={item.id}>
                    <button type="button" className={active?.id === item.id ? "is-active" : undefined} onClick={() => setActive(item)}>
                      <strong>{item.term}</strong>
                      <small>{item.phonetic}</small>
                    </button>
                  </li>
                ))}
                {!results.length ? <li className="lc-dict-empty">No terms match that search.</li> : null}
              </ul>

              <article className="lc-dict-detail">
                {(active || results[0]) ? (
                  <>
                    <h3>{(active || results[0]).term}</h3>
                    <p className="lc-dict-phonetic">{(active || results[0]).phonetic}</p>
                    <p>{(active || results[0]).definition}</p>
                    <p className="lc-legal-why">
                      <span>Why it matters to you</span>
                      {(active || results[0]).whyItMatters}
                    </p>
                    <div className="lc-dict-actions">
                      <button type="button" className="lc-button" onClick={() => copyDefinition(active || results[0])}>
                        <Copy /> {copiedId === (active || results[0]).id ? "Copied" : "Copy definition"}
                      </button>
                      <button type="button" className="lc-button lc-button-primary" onClick={() => askLawBot(active || results[0])}>
                        <Sparkles /> Explain with LawBot
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="lc-dict-empty">Pick a term to see the plain-English meaning.</p>
                )}
              </article>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
