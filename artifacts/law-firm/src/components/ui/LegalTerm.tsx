import { useEffect, useState, type ReactNode } from "react";
import { BookOpenText } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { findLegalTerm } from "@/data/legalDictionaryData";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type Props = {
  term: string;
  children?: ReactNode;
  onOpenDictionary?: (term: string) => void;
};

function useIsCoarsePointer() {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(hover: none), (pointer: coarse)");
    const sync = () => setCoarse(media.matches);
    sync();
    media.addEventListener?.("change", sync);
    return () => media.removeEventListener?.("change", sync);
  }, []);
  return coarse;
}

function TermBody({
  term,
  phonetic,
  definition,
  whyItMatters,
  onOpenDictionary,
  onClose,
}: {
  term: string;
  phonetic: string;
  definition: string;
  whyItMatters: string;
  onOpenDictionary?: (term: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      <p>{definition}</p>
      <p className="lc-legal-why"><span>Why it matters</span>{whyItMatters}</p>
      {onOpenDictionary ? (
        <button
          type="button"
          className="lc-legal-dict-link"
          onClick={() => {
            onClose();
            onOpenDictionary(term);
          }}
        >
          <BookOpenText /> View in dictionary
        </button>
      ) : null}
    </>
  );
}

export function LegalTerm({ term, children, onOpenDictionary }: Props) {
  const entry = findLegalTerm(term);
  const [open, setOpen] = useState(false);
  const coarse = useIsCoarsePointer();
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
          if (!coarse && window.matchMedia("(hover: hover)").matches) setOpen(true);
        }}
        onMouseLeave={() => {
          if (!coarse && window.matchMedia("(hover: hover)").matches) setOpen(false);
        }}
      >
        {label}
      </button>

      {!coarse ? (
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
              </header>
              <TermBody
                term={entry.term}
                phonetic={entry.phonetic}
                definition={entry.definition}
                whyItMatters={entry.whyItMatters}
                onOpenDictionary={onOpenDictionary}
                onClose={() => setOpen(false)}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      ) : (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="lc-legal-sheet">
            <SheetHeader>
              <SheetTitle>{entry.term}</SheetTitle>
              <SheetDescription>{entry.phonetic}</SheetDescription>
            </SheetHeader>
            <div className="lc-legal-sheet-body">
              <TermBody
                term={entry.term}
                phonetic={entry.phonetic}
                definition={entry.definition}
                whyItMatters={entry.whyItMatters}
                onOpenDictionary={onOpenDictionary}
                onClose={() => setOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </span>
  );
}
