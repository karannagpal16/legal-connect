import { useState, type ReactNode } from "react";
import { BookOpenText, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { findLegalTerm } from "@/data/legalDictionaryData";

type Props = {
  term: string;
  children?: ReactNode;
  onOpenDictionary?: (term: string) => void;
};

export function LegalTerm({ term, children, onOpenDictionary }: Props) {
  const entry = findLegalTerm(term);
  const [open, setOpen] = useState(false);
  const label = children ?? entry?.term ?? term;

  if (!entry) {
    return <span className="lc-legal-term lc-legal-term-unknown">{label}</span>;
  }

  return (
    <span className="lc-legal-term-wrap">
      <button
        type="button"
        className="lc-legal-term"
        aria-expanded={open}
        aria-label={`Explain ${entry.term}`}
        onClick={() => setOpen((current) => !current)}
        onMouseEnter={() => {
          if (window.matchMedia("(hover: hover)").matches) setOpen(true);
        }}
        onMouseLeave={() => {
          if (window.matchMedia("(hover: hover)").matches) setOpen(false);
        }}
      >
        {label}
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            className="lc-legal-popover"
            role="dialog"
            aria-label={`${entry.term} plain-English meaning`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.16 }}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
          >
            <header>
              <div>
                <strong>{entry.term}</strong>
                <small>{entry.phonetic}</small>
              </div>
              <button type="button" aria-label="Close definition" onClick={() => setOpen(false)}>
                <X />
              </button>
            </header>
            <p>{entry.definition}</p>
            <p className="lc-legal-why"><span>Why it matters</span>{entry.whyItMatters}</p>
            {onOpenDictionary ? (
              <button
                type="button"
                className="lc-legal-dict-link"
                onClick={() => {
                  setOpen(false);
                  onOpenDictionary(entry.term);
                }}
              >
                <BookOpenText /> View in dictionary
              </button>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </span>
  );
}
