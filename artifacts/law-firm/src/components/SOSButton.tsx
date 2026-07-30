import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Car,
  FileWarning,
  HeartHandshake,
  Home,
  Landmark,
  ShieldAlert,
  X,
  type LucideIcon,
} from "lucide-react";
import { CounselIntake } from "@/components/client/CounselIntake";

interface SosOption {
  label: string;
  hint: string;
  particulars: string;
  icon: LucideIcon;
}

const quickOptions: SosOption[] = [
  { label: "At a police station", hint: "Arrest, detention or summons", particulars: "I am currently at a police station and need urgent counsel assistance. ", icon: Landmark },
  { label: "Housing emergency", hint: "Eviction, lockout or essential services", particulars: "I have an urgent landlord or housing dispute and need counsel assistance. ", icon: Home },
  { label: "Legal notice deadline", hint: "A notice requires an urgent response", particulars: "I received a legal notice with a short response deadline and need urgent advice. ", icon: FileWarning },
  { label: "Domestic safety issue", hint: "Urgent family or protection concern", particulars: "I have an urgent domestic or family safety concern and need counsel assistance. ", icon: HeartHandshake },
  { label: "Road incident", hint: "Accident, seizure or traffic proceeding", particulars: "I am dealing with an urgent road accident or traffic proceeding and need counsel assistance. ", icon: Car },
];

export function SOSButton() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<SosOption | null>(null);

  const close = () => {
    setOpen(false);
    setSelected(null);
  };

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="lc-sos-trigger"
        aria-label="Open Legal SOS"
        title="Legal SOS"
      >
        <ShieldAlert />
        <span className="lc-sos-label">Legal SOS</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <div className="lc-sos-modal" role="dialog" aria-modal="true" aria-label="Legal SOS counsel booking">
            <motion.button className="lc-sos-backdrop" onClick={close} aria-label="Close Legal SOS" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.section className={`lc-sos-panel ${selected ? "intake" : ""}`} initial={{ opacity: 0, y: 24, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: .98 }}>
              {!selected ? (
                <>
                  <header>
                    <span><AlertCircle /></span>
                    <div><strong>Legal SOS</strong><small>Choose the situation. Then book a paid call or video consultation.</small></div>
                    <button onClick={close} aria-label="Close Legal SOS"><X /></button>
                  </header>
                  <div className="lc-sos-options">
                    {quickOptions.map((option) => (
                      <button key={option.label} onClick={() => setSelected(option)}>
                        <option.icon />
                        <span><strong>{option.label}</strong><small>{option.hint}</small></span>
                      </button>
                    ))}
                  </div>
                  <p className="lc-sos-disclaimer">Legal SOS is a priority counsel-booking service, not a substitute for police, ambulance or emergency services.</p>
                </>
              ) : (
                <>
                  <button className="lc-sos-back" onClick={() => setSelected(null)}><ArrowLeft /> Change situation</button>
                  <CounselIntake
                    initialChannel="call"
                    allowedChannels={["call", "video"]}
                    initialCaseTitle={selected.label}
                    initialParticulars={selected.particulars}
                    source="sos"
                    onClose={close}
                  />
                </>
              )}
            </motion.section>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
