import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  IndianRupee,
  Loader2,
  LockKeyhole,
  MessageSquareText,
  Phone,
  ShieldCheck,
  Upload,
  Video,
  X,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { workspaceRequest } from "@/lib/workspace";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export type ConsultationChannel = "chat" | "call" | "video";

interface CounselIntakeProps {
  initialChannel?: ConsultationChannel;
  allowedChannels?: ConsultationChannel[];
  initialCaseId?: string;
  initialCaseTitle?: string;
  initialParticulars?: string;
  source?: "dashboard" | "booking" | "sos" | "matter";
  onClose?: () => void;
  onComplete?: () => void;
  embedded?: boolean;
}

const channelOptions: Record<ConsultationChannel, { title: string; detail: string; amount: number; icon: typeof Phone }> = {
  chat: { title: "Secure chat", detail: "Written consultation in your matter room", amount: 499, icon: MessageSquareText },
  call: { title: "Counsel call", detail: "Scheduled private audio consultation", amount: 999, icon: Phone },
  video: { title: "Video consultation", detail: "Scheduled private video consultation", amount: 1499, icon: Video },
};

const caseTypes = [
  "Criminal",
  "Civil",
  "Family / Matrimonial",
  "Property",
  "Consumer",
  "Employment",
  "Corporate / Commercial",
  "Other",
];

const acceptedExtensions = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"];
const maxFileBytes = 5 * 1024 * 1024;
const maxTotalBytes = 12 * 1024 * 1024;

type IntakeStage = "intake" | "payment" | "assignment";

async function loadRazorpay() {
  if (window.Razorpay) return true;
  return new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

async function uploadBookingFiles(bookingId: string, files: File[], token?: string | null) {
  for (const file of files) {
    const response = await fetch(`/api/bookings/${bookingId}/attachments`, {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-File-Name": encodeURIComponent(file.name),
        "X-File-Size": String(file.size),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: file,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `${file.name} could not be uploaded.`);
  }
}

export function CounselIntake({
  initialChannel = "call",
  allowedChannels = ["chat", "call", "video"],
  initialCaseId = "",
  initialCaseTitle = "",
  initialParticulars = "",
  source = "booking",
  onClose,
  onComplete,
  embedded = false,
}: CounselIntakeProps) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const availableChannels: ConsultationChannel[] = allowedChannels.length ? allowedChannels : ["call", "video"];
  const [stage, setStage] = useState<IntakeStage>("intake");
  const [channel, setChannel] = useState<ConsultationChannel>(
    availableChannels.includes(initialChannel) ? initialChannel : availableChannels[0],
  );
  const [clientName, setClientName] = useState(session?.user.name || "");
  const [partyName, setPartyName] = useState(session?.user.name || "");
  const [oppositeParty, setOppositeParty] = useState("");
  const [caseTitle, setCaseTitle] = useState(initialCaseTitle);
  const [caseType, setCaseType] = useState("Civil");
  const [particulars, setParticulars] = useState(initialParticulars);
  const [court, setCourt] = useState("");
  const [urgency, setUrgency] = useState(source === "sos" ? "urgent" : "standard");
  const [files, setFiles] = useState<File[]>([]);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<{ id: string; receiptNo?: string; amount: number; caseId?: string } | null>(null);
  const selectedChannel = channelOptions[channel];
  const heading = source === "sos" ? "Request urgent counsel" : "Book a counsel";
  const submitLabel = source === "sos" ? "Review urgent request" : "Review and pay";

  const totalSize = useMemo(() => files.reduce((total, file) => total + file.size, 0), [files]);

  const selectFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files || []);
    event.target.value = "";
    const invalid = nextFiles.find((file) => {
      const lowerName = file.name.toLowerCase();
      return file.size > maxFileBytes || !acceptedExtensions.some((extension) => lowerName.endsWith(extension));
    });
    if (invalid) {
      setError("Upload PDF, Word, JPG or PNG files up to 5 MB each.");
      return;
    }
    const merged = [...files, ...nextFiles].slice(0, 6);
    if (merged.reduce((total, file) => total + file.size, 0) > maxTotalBytes) {
      setError("The total attachment size cannot exceed 12 MB.");
      return;
    }
    setFiles(merged);
    setError("");
  };

  const reviewIntake = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (particulars.trim().length < 30) {
      setError("Add at least 30 characters describing the facts, dates and help required.");
      return;
    }
    if (!consent) {
      setError("Confirm the conflict-check, document and privacy notice before continuing.");
      return;
    }
    setStage("payment");
  };

  const completePayment = async (booking: any, response: any) => {
    const verification = await workspaceRequest<any>("/api/payments/verify", session?.token, {
      method: "POST",
      body: JSON.stringify({
        bookingId: booking.id,
        order_id: response.razorpay_order_id,
        payment_id: response.razorpay_payment_id,
        signature: response.razorpay_signature,
      }),
    });
    setReceipt({ id: booking.id, receiptNo: booking.receiptNo, amount: selectedChannel.amount, caseId: verification.caseId });
    setStage("assignment");
    await queryClient.invalidateQueries({ queryKey: ["client-workspace"] });
    onComplete?.();
  };

  const beginPayment = async () => {
    setBusy(true);
    setError("");
    try {
      const attachedFiles = files.map((file) => ({ name: file.name, type: file.type, size: file.size }));
      const booking = await workspaceRequest<any>("/api/bookings", session?.token, {
        method: "POST",
        body: JSON.stringify({
          serviceType: `${selectedChannel.title}${source === "sos" ? " - Legal SOS" : ""}`,
          legalIssueType: caseType,
          amount: selectedChannel.amount,
          paymentStatus: "payment_pending",
          workHoldStatus: "pending",
          nextDestination: "Legal Connect assignment desk",
          source,
          consultationChannel: channel,
          urgency,
          clientName,
          partyName,
          oppositeParty,
          caseTitle,
          caseType,
          problemSummary: particulars,
          particulars,
          court,
          existingCaseId: initialCaseId || null,
          attachedFiles,
          assignmentPolicy: "legal-connect-managed",
        }),
      });

      if (files.length && !session?.demo) await uploadBookingFiles(booking.id, files, session?.token);

      const order = await workspaceRequest<any>("/api/payments/create-order", session?.token, {
        method: "POST",
        body: JSON.stringify({
          bookingId: booking.id,
          amount: selectedChannel.amount,
          serviceType: selectedChannel.title,
          receiptNo: booking.receiptNo,
        }),
      });

      if (order.mode === "google-play-review" || (order.mode === "demo" && order.status === "review_only")) {
        setReceipt({ id: booking.id, receiptNo: order.receipt, amount: selectedChannel.amount, caseId: initialCaseId || undefined });
        setStage("assignment");
        await queryClient.invalidateQueries({ queryKey: ["client-workspace"] });
        onComplete?.();
        return;
      }
      if (!order.order_id || !order.key_id) throw new Error("Secure payment order could not be created.");
      const loaded = await loadRazorpay();
      if (!loaded || !window.Razorpay) throw new Error("Secure checkout could not be loaded. Please retry.");

      const checkout = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency || "INR",
        order_id: order.order_id,
        name: "Legal Connect",
        description: `${selectedChannel.title} - ${caseTitle}`,
        prefill: { name: clientName, email: session?.user.email || "" },
        theme: { color: "#a87928" },
        handler: async (response: any) => {
          try {
            await completePayment(booking, response);
          } catch (paymentError) {
            setError(paymentError instanceof Error ? paymentError.message : "Payment verification failed.");
          } finally {
            setBusy(false);
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      checkout.open();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Payment could not be started.");
      setBusy(false);
    }
  };

  return (
    <div className={`lc-counsel-intake ${embedded ? "embedded" : ""}`}>
      <header className="lc-counsel-intake-head">
        <div>
          <span className="lc-kicker">LEGAL CONNECT MANAGED ASSIGNMENT</span>
          <h2>{heading}</h2>
          <p>Share one clear brief, pay securely, and Legal Connect will assign verified counsel.</p>
        </div>
        {onClose && <button className="lc-icon-command" onClick={onClose} aria-label="Close counsel booking"><X /></button>}
      </header>

      <div className="lc-intake-steps" aria-label="Intake progress">
        <span className="active">1 Matter</span><i />
        <span className={stage !== "intake" ? "active" : ""}>2 Payment</span><i />
        <span className={stage === "assignment" ? "active" : ""}>3 Assignment</span>
      </div>

      <AnimatePresence mode="wait">
        {stage === "intake" && (
          <motion.form key="intake" className="lc-counsel-form" onSubmit={reviewIntake} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <fieldset className="lc-channel-selector">
              <legend>How would you like to consult?</legend>
              <div>
                {availableChannels.map((value) => {
                  const option = channelOptions[value];
                  return (
                    <button key={value} type="button" className={channel === value ? "active" : ""} onClick={() => setChannel(value)}>
                      <option.icon /><span><strong>{option.title}</strong><small>{option.detail}</small></span><em>₹{option.amount.toLocaleString("en-IN")}</em>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="lc-counsel-fields">
              <label><span>Client name</span><input value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="Full legal name" required /></label>
              <label><span>Your party / organisation</span><input value={partyName} onChange={(event) => setPartyName(event.target.value)} placeholder="Name appearing in the matter" required /></label>
              <label><span>Opposite party</span><input value={oppositeParty} onChange={(event) => setOppositeParty(event.target.value)} placeholder="Name required for conflict check" required /></label>
              <label className="wide"><span>Case title</span><input value={caseTitle} onChange={(event) => setCaseTitle(event.target.value)} placeholder="Example: State v. Karan Nagpal" required /></label>
              <label><span>Case type</span><select value={caseType} onChange={(event) => setCaseType(event.target.value)}>{caseTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label><span>Court / city, if any</span><input value={court} onChange={(event) => setCourt(event.target.value)} placeholder="Tis Hazari Courts, Delhi" /></label>
              <label><span>Urgency</span><select value={urgency} onChange={(event) => setUrgency(event.target.value)}><option value="standard">Standard - within 1 business day</option><option value="urgent">Urgent - within 2 hours</option></select></label>
              <label className="wide"><span>Case particulars</span><textarea value={particulars} onChange={(event) => setParticulars(event.target.value)} placeholder="What happened, important dates, notices received and the outcome you need" rows={5} minLength={30} required /></label>
            </div>

            <div className="lc-file-intake">
              <label>
                <Upload />
                <span><strong>Upload case files</strong><small>PDF, Word, JPG or PNG. Up to 6 files, 5 MB each.</small></span>
                <input type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={selectFiles} />
              </label>
              {files.length > 0 && (
                <div className="lc-file-queue">
                  {files.map((file, index) => (
                    <div key={`${file.name}-${file.lastModified}`}><FileText /><span><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(2)} MB</small></span><button type="button" onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${file.name}`}><X /></button></div>
                  ))}
                  <small>{(totalSize / 1024 / 1024).toFixed(2)} MB total</small>
                </div>
              )}
            </div>

            <label className="lc-consent-field"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>I authorise a confidential conflict check and secure storage of these case records. Counsel is assigned only after verified payment.</span></label>
            {error && <div className="lc-form-error"><AlertTriangle /> {error}</div>}
            <button className="lc-button lc-button-primary" type="submit">{submitLabel} <ArrowRight /></button>
          </motion.form>
        )}

        {stage === "payment" && (
          <motion.section key="payment" className="lc-payment-review" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <button className="lc-back-command" onClick={() => setStage("intake")}><ArrowLeft /> Edit details</button>
            <div className="lc-operational-panel lc-payment-summary">
              <header><div><span>Step 2</span><h2>Review and pay</h2></div><LockKeyhole /></header>
              <dl>
                <div><dt>Matter</dt><dd>{caseTitle}</dd></div>
                <div><dt>Parties</dt><dd>{partyName} / {oppositeParty}</dd></div>
                <div><dt>Consultation</dt><dd>{selectedChannel.title}</dd></div>
                <div><dt>Files</dt><dd>{files.length ? `${files.length} secure attachment${files.length > 1 ? "s" : ""}` : "No files attached"}</dd></div>
                <div><dt>Assignment</dt><dd>Verified counsel selected by Legal Connect</dd></div>
              </dl>
              <div className="lc-payment-total"><span>Total payable</span><strong>₹{selectedChannel.amount.toLocaleString("en-IN")}</strong></div>
              <p><ShieldCheck /> Payment is verified by the backend. Your request then appears as a separate matter in your workspace.</p>
              {error && <div className="lc-form-error"><AlertTriangle /> {error}</div>}
              <button className="lc-button lc-button-primary lc-button-full" onClick={beginPayment} disabled={busy}>{busy ? <Loader2 className="lc-spin" /> : <IndianRupee />} Pay securely</button>
            </div>
          </motion.section>
        )}

        {stage === "assignment" && (
          <motion.section key="assignment" className="lc-assignment-confirmed" initial={{ opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }}>
            <span><CheckCircle2 /></span>
            <p className="lc-kicker">PAYMENT VERIFIED</p>
            <h2>Your request is now a separate matter.</h2>
            <p>Legal Connect is completing the conflict check and assigning verified counsel. Its timeline, documents, payments and communications will remain inside this matter.</p>
            <dl><div><dt>Intake reference</dt><dd>{receipt?.id}</dd></div><div><dt>Amount</dt><dd>₹{receipt?.amount.toLocaleString("en-IN")}</dd></div><div><dt>Status</dt><dd>Assignment pending</dd></div></dl>
            {onClose ? <button className="lc-button lc-button-primary" onClick={onClose}>View dashboard <ArrowRight /></button> : <Link className="lc-button lc-button-primary" href="/client">View dashboard <ArrowRight /></Link>}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
