import { FileUp, Gavel, IndianRupee, MessageSquareText, X } from "lucide-react";
import { Link } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import type { ResolvedNotificationAction } from "@/lib/notificationActions";

export type NotificationOverlayState = {
  title: string;
  message: string;
  resolved: ResolvedNotificationAction;
} | null;

type Props = {
  state: NotificationOverlayState;
  onClose: () => void;
};

const overlayMeta = {
  payment: {
    icon: IndianRupee,
    heading: "Payment action",
    body: "Continue to the secure payment flow for this matter. No card details are stored by Legal Connect.",
  },
  documents: {
    icon: FileUp,
    heading: "Document action",
    body: "Open your matter desk and upload the requested file from the Documents tab.",
  },
  chat: {
    icon: MessageSquareText,
    heading: "Counsel / case desk",
    body: "Open your supervised case workspace to review the assignment and message through Legal Connect.",
  },
  hearing: {
    icon: Gavel,
    heading: "Hearing reminder",
    body: "Review the next date, appearance requirement, and coordinate with counsel before court.",
  },
  none: {
    icon: Gavel,
    heading: "Open linked workspace",
    body: "Continue to the related Legal Connect screen.",
  },
} as const;

export function ActionableNotificationOverlay({ state, onClose }: Props) {
  return (
    <AnimatePresence>
      {state ? (
        <motion.div
          className="lc-notify-action-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="lc-notify-action-card"
            role="dialog"
            aria-modal="true"
            aria-label="Notification quick action"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            onClick={(event) => event.stopPropagation()}
          >
            {(() => {
              const meta = overlayMeta[state.resolved.overlay] || overlayMeta.none;
              const Icon = meta.icon;
              const amount = state.resolved.actionPayload.amount;
              return (
                <>
                  <header>
                    <div>
                      <span className="lc-kicker">{meta.heading}</span>
                      <h3>{state.title}</h3>
                    </div>
                    <button type="button" aria-label="Close" onClick={onClose}><X /></button>
                  </header>
                  <p>{state.message}</p>
                  <p className="lc-notify-action-help">{meta.body}</p>
                  {amount != null ? (
                    <p className="lc-notify-action-amount">Amount due · ₹{Number(amount).toLocaleString("en-IN")}</p>
                  ) : null}
                  {state.resolved.actionPayload.lawyerName ? (
                    <p className="lc-notify-action-amount">Counsel · {state.resolved.actionPayload.lawyerName}</p>
                  ) : null}
                  <div className="lc-notify-action-row">
                    <button type="button" className="lc-button" onClick={onClose}>Not now</button>
                    <Link
                      href={state.resolved.targetUrl}
                      className="lc-button lc-button-primary"
                      onClick={onClose}
                    >
                      <Icon /> {state.resolved.ctaLabel}
                    </Link>
                  </div>
                </>
              );
            })()}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
