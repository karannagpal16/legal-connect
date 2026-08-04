import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  Gift,
  IndianRupee,
  Loader2,
  LockKeyhole,
  MessageSquareText,
  Phone,
  QrCode,
  ShieldCheck,
  Upload,
  Video,
  X,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { workspaceRequest } from "@/lib/workspace";
import { CLIENT_ADVISORY_PRICING } from "@/lib/clientPricing";

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

interface PaymentConfig {
  mode?: string;
  upi_vpa?: string;
  upi_payee_name?: string;
  upi_configured?: boolean;
  test_upi_id?: string;
  warning?: string;
  first_chat_free_available?: boolean;
  chat_amount?: number;
  call_amount?: number;
  video_amount?: number;
  chat_unit?: string;
  pricing?: {
    first_chat_free?: boolean;
    chat?: { amount: number; unit?: string; label?: string };
    call?: { amount: number; unit?: string; label?: string };
    video?: { amount: number; unit?: string; label?: string };
  };
  all_features_free?: boolean;
  master_test_free?: boolean;
}

function isIdentityApproved(status?: string | null) {
  const value = String(status || "").toLowerCase();
  return value === "approved" || value === "verified";
}

const PAID_CHAT_AMOUNT = CLIENT_ADVISORY_PRICING.chat.amount;
const AUDIO_CALL_AMOUNT = CLIENT_ADVISORY_PRICING.call.amount;
const VIDEO_CALL_AMOUNT = CLIENT_ADVISORY_PRICING.video.amount;

const channelOptions: Record<ConsultationChannel, { title: string; detail: string; amount: number; icon: typeof Phone }> = {
  chat: {
    title: "Secure chat",
    detail: CLIENT_ADVISORY_PRICING.chat.detail,
    amount: PAID_CHAT_AMOUNT,
    icon: MessageSquareText,
  },
  call: {
    title: "Counsel call",
    detail: CLIENT_ADVISORY_PRICING.call.detail,
    amount: AUDIO_CALL_AMOUNT,
    icon: Phone,
  },
  video: {
    title: "Video consultation",
    detail: CLIENT_ADVISORY_PRICING.video.detail,
    amount: VIDEO_CALL_AMOUNT,
    icon: Video,
  },
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

function isValidEmail(value?: string | null) {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
}

function normalizeEmail(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function isCompOrder(order: any, payableAmount: number) {
  if (!order || order.ok === false) return false;
  if (Number(payableAmount) === 0) return true;
  if (Number(order.amount || 0) === 0 && (order.payment_status === "paid" || order.status === "free")) return true;
  const mode = String(order.mode || "");
  return mode.includes("free")
    || mode === "google-play-review"
    || (mode === "demo" && order.status === "review_only");
}

function buildUpiUri(vpa: string, payeeName: string, amount: number, note: string) {
  const params = new URLSearchParams({
    pa: vpa,
    pn: payeeName,
    cu: "INR",
  });
  if (amount > 0) params.set("am", amount.toFixed(2));
  if (note) params.set("tn", note.slice(0, 80));
  return `upi://pay?${params.toString()}`;
}

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
  const failures: string[] = [];
  for (const file of files) {
    try {
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
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        failures.push(payload.error || file.name);
      }
    } catch {
      failures.push(file.name);
    }
  }
  return failures;
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
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [identityApproved, setIdentityApproved] = useState(false);
  const [checkingIdentity, setCheckingIdentity] = useState(true);

  const masterFree = Boolean(
    paymentConfig?.all_features_free
    || paymentConfig?.master_test_free
    || normalizeEmail(session?.user?.email) === "karannagpal16@gmail.com",
  );
  const kycReady = masterFree || identityApproved;
  const firstChatFree = !masterFree && channel === "chat" && Boolean(paymentConfig?.first_chat_free_available);
  const everythingFree = masterFree || firstChatFree;
  const liveChannelAmount = (() => {
    if (channel === "chat") return Number(paymentConfig?.pricing?.chat?.amount ?? paymentConfig?.chat_amount ?? channelOptions.chat.amount);
    if (channel === "call") return Number(paymentConfig?.pricing?.call?.amount ?? paymentConfig?.call_amount ?? channelOptions.call.amount);
    return Number(paymentConfig?.pricing?.video?.amount ?? paymentConfig?.video_amount ?? channelOptions.video.amount);
  })();
  const payableAmount = everythingFree ? 0 : liveChannelAmount;
  const selectedChannel = channelOptions[channel];
  const channelPriceLabel = (() => {
    if (channel === "chat") {
      return paymentConfig?.pricing?.chat?.label
        || `₹${liveChannelAmount.toLocaleString("en-IN")} / ${paymentConfig?.chat_unit || CLIENT_ADVISORY_PRICING.chat.unitLabel}`;
    }
    if (channel === "call") {
      return paymentConfig?.pricing?.call?.label || `from ₹${liveChannelAmount.toLocaleString("en-IN")}`;
    }
    return paymentConfig?.pricing?.video?.label || `from ₹${liveChannelAmount.toLocaleString("en-IN")}`;
  })();
  const heading = source === "sos" ? "Request urgent counsel" : "Book a counsel";
  const submitLabel = masterFree
    ? "Continue — owner free"
    : firstChatFree
      ? "Continue — first chat free"
      : source === "sos"
        ? "Review urgent request"
        : "Review and pay";

  const upiUri = useMemo(() => {
    if (!paymentConfig?.upi_configured || !paymentConfig.upi_vpa || payableAmount <= 0) return "";
    return buildUpiUri(
      paymentConfig.upi_vpa,
      paymentConfig.upi_payee_name || "Legal Connect",
      payableAmount,
      caseTitle || selectedChannel.title,
    );
  }, [paymentConfig, payableAmount, caseTitle, selectedChannel.title]);

  const qrImageUrl = upiUri
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiUri)}`
    : "";

  useEffect(() => {
    let active = true;
    workspaceRequest<PaymentConfig>("/api/payments/config", session?.token)
      .then((config) => {
        if (active) setPaymentConfig(config);
      })
      .catch(() => {
        if (active) setPaymentConfig({ first_chat_free_available: true, mode: "unknown" });
      });
    setCheckingIdentity(true);
    workspaceRequest<{ profile?: { verificationStatus?: string } }>("/api/workspaces/client", session?.token)
      .then((workspace) => {
        if (!active) return;
        setIdentityApproved(isIdentityApproved(workspace?.profile?.verificationStatus));
      })
      .catch(() => {
        if (active) setIdentityApproved(false);
      })
      .finally(() => {
        if (active) setCheckingIdentity(false);
      });
    return () => {
      active = false;
    };
  }, [session?.token]);

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
    if (!kycReady) {
      setError("Aadhaar verification must be approved by Legal Connect before booking counsel.");
      return;
    }
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
    setReceipt({ id: booking.id, receiptNo: booking.receiptNo, amount: payableAmount, caseId: verification.caseId });
    setStage("assignment");
    setPaymentConfig((current) => (current ? { ...current, first_chat_free_available: false } : current));
    await queryClient.invalidateQueries({ queryKey: ["client-workspace"] });
    onComplete?.();
  };

  const finishFreeAssignment = async (booking: any, extras?: { receiptNo?: string; caseId?: string }) => {
    setReceipt({
      id: booking.id,
      receiptNo: extras?.receiptNo || booking.receiptNo,
      amount: payableAmount,
      caseId: extras?.caseId || initialCaseId || undefined,
    });
    setStage("assignment");
    setPaymentConfig((current) => (
      current
        ? { ...current, first_chat_free_available: false, all_features_free: masterFree, master_test_free: masterFree }
        : current
    ));
    await queryClient.invalidateQueries({ queryKey: ["client-workspace"] });
    onComplete?.();
    setBusy(false);
  };

  const beginPayment = async () => {
    if (!kycReady) {
      setError("Aadhaar verification must be approved by Legal Connect before booking counsel.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const attachedFiles = files.map((file) => ({ name: file.name, type: file.type, size: file.size }));
      const bookingResponse = await workspaceRequest<any>("/api/consultations/book-advisory", session?.token, {
        method: "POST",
        body: JSON.stringify({
          serviceType: `${selectedChannel.title}${source === "sos" ? " - Legal SOS" : ""}${everythingFree ? " - Free" : ""}`,
          legalIssueType: caseType,
          amount: payableAmount,
          channel,
          consultationChannel: channel,
          source,
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
          firstChatFree: everythingFree || firstChatFree,
          masterTestFree: masterFree,
          productType: "advisory",
          noDirectHiringDisclaimer: true,
        }),
      });
      const booking = bookingResponse.consultation || bookingResponse;
      const freePath = bookingResponse.paymentRequired === false
        || bookingResponse.alreadyPaid === true
        || String(booking.paymentStatus || "").toLowerCase() === "paid"
        || payableAmount === 0
        || everythingFree;

      // Soft-fail attachments so free/paid booking is not killed by upload issues.
      if (files.length && !session?.demo) {
        const failures = await uploadBookingFiles(booking.id, files, session?.token);
        if (failures.length) {
          console.warn("Attachment upload soft-failed:", failures);
        }
      }

      // Free / already-paid path: skip Razorpay create-order (fixes first-chat race).
      if (freePath) {
        await finishFreeAssignment(booking);
        return;
      }

      const order = await workspaceRequest<any>("/api/payments/create-order", session?.token, {
        method: "POST",
        body: JSON.stringify({
          bookingId: booking.id,
          amount: payableAmount,
          serviceType: selectedChannel.title,
          receiptNo: booking.receiptNo,
          consultationChannel: channel,
          firstChatFree: firstChatFree || masterFree || payableAmount === 0,
          masterTestFree: masterFree,
          mode: masterFree ? "master_test_free" : (firstChatFree || payableAmount === 0) ? "first_chat_free" : undefined,
        }),
      });

      // Free path must never open Razorpay — including when order_id is absent.
      if (isCompOrder(order, payableAmount) || order.alreadyPaid || order.payment_status === "paid") {
        await finishFreeAssignment(booking, { receiptNo: order.receipt || booking.receiptNo, caseId: order.caseId });
        return;
      }
      if (!order.order_id || !order.key_id) throw new Error("Secure payment order could not be created.");
      const loaded = await loadRazorpay();
      if (!loaded || !window.Razorpay) throw new Error("Secure checkout could not be loaded. Please retry.");

      const email = session?.user.email;
      const checkout = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency || "INR",
        order_id: order.order_id,
        name: "Legal Connect",
        description: `${selectedChannel.title} - ${caseTitle}`,
        // Never prefill UPI VPA/contact — empty or invalid values make UPI apps show "Invalid UPI ID".
        prefill: {
          name: clientName || "Legal Connect Client",
          ...(isValidEmail(email) ? { email } : {}),
        },
        theme: { color: "#a87928" },
        method: {
          upi: true,
          card: true,
          netbanking: true,
          wallet: true,
        },
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
          <span className="lc-kicker">1-TIME ADVISORY · LC GATEWAY</span>
          <h2>{heading}</h2>
          <p>
            {masterFree
              ? "Owner account — every client booking is free on this login."
              : firstChatFree
                ? "Your first Secure chat is free. After that: ₹99 / 2 mins. Audio from ₹299 · Video from ₹499."
                : "Minimal prices: first chat free once, then ₹99 / 2 mins. Audio from ₹299 · Video from ₹499. Full court representation is only via LC Gateway retention."}
          </p>
          <p className="lc-ops-meta" style={{ marginTop: "0.5rem" }}>
            First chat free · then ₹99 / 2 mins · call from ₹299 · video from ₹499
          </p>
          <p className="lc-ops-meta warn" style={{ marginTop: "0.5rem" }}>
            No direct in-app hiring. After advisory, use Request LC Gateway retention for panel representation.
          </p>
          {!checkingIdentity && !kycReady ? (
            <p className="lc-ops-meta warn" style={{ marginTop: "0.5rem" }}>
              Aadhaar verification is required before booking. Complete identity verification and wait for Legal Connect approval.
            </p>
          ) : null}
        </div>
        {onClose && <button className="lc-icon-command" onClick={onClose} aria-label="Close counsel booking"><X /></button>}
      </header>

      <div className="lc-intake-steps" aria-label="Intake progress">
        <span className="active">1 Matter</span><i />
        <span className={stage !== "intake" ? "active" : ""}>2 {everythingFree ? "Confirm" : "Payment"}</span><i />
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
                  const freeBadge = masterFree || (value === "chat" && paymentConfig?.first_chat_free_available);
                  const liveAmount = value === "chat"
                    ? Number(paymentConfig?.pricing?.chat?.amount ?? paymentConfig?.chat_amount ?? option.amount)
                    : value === "call"
                      ? Number(paymentConfig?.pricing?.call?.amount ?? paymentConfig?.call_amount ?? option.amount)
                      : Number(paymentConfig?.pricing?.video?.amount ?? paymentConfig?.video_amount ?? option.amount);
                  const priceEm = value === "chat"
                    ? (paymentConfig?.pricing?.chat?.label || `₹${liveAmount.toLocaleString("en-IN")} / 2 mins`)
                    : value === "call"
                      ? (paymentConfig?.pricing?.call?.label || `from ₹${liveAmount.toLocaleString("en-IN")}`)
                      : (paymentConfig?.pricing?.video?.label || `from ₹${liveAmount.toLocaleString("en-IN")}`);
                  return (
                    <button key={value} type="button" className={channel === value ? "active" : ""} onClick={() => setChannel(value)}>
                      <option.icon />
                      <span>
                        <strong>{option.title}</strong>
                        <small>
                          {masterFree
                            ? "Free on owner login"
                            : freeBadge
                              ? "First chat free — then ₹99 / 2 mins"
                              : option.detail}
                        </small>
                      </span>
                      <em>{freeBadge ? "FREE" : priceEm}</em>
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

            <label className="lc-consent-field">
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
              <span>
                {everythingFree
                  ? "I authorise a confidential conflict check and secure storage of these case records for this free booking."
                  : "I authorise a confidential conflict check and secure storage of these case records. Counsel is assigned only after verified payment."}
              </span>
            </label>
            {error && <div className="lc-form-error"><AlertTriangle /> {error}</div>}
            <button className="lc-button lc-button-primary" type="submit" disabled={checkingIdentity || !kycReady}>
              {checkingIdentity ? <Loader2 className="lc-spin" /> : null}
              {!kycReady && !checkingIdentity ? "Complete Aadhaar verification first" : <>{submitLabel} <ArrowRight /></>}
            </button>
          </motion.form>
        )}

        {stage === "payment" && (
          <motion.section key="payment" className="lc-payment-review" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <button className="lc-back-command" onClick={() => setStage("intake")}><ArrowLeft /> Edit details</button>
            <div className="lc-operational-panel lc-payment-summary">
              <header>
                <div>
                  <span>Step 2</span>
                  <h2>{everythingFree ? "Confirm free booking" : "Review and pay"}</h2>
                </div>
                {everythingFree ? <Gift /> : <LockKeyhole />}
              </header>
              <dl>
                <div><dt>Matter</dt><dd>{caseTitle}</dd></div>
                <div><dt>Parties</dt><dd>{partyName} / {oppositeParty}</dd></div>
                <div><dt>Consultation</dt><dd>{selectedChannel.title} · {channelPriceLabel}</dd></div>
                <div><dt>Files</dt><dd>{files.length ? `${files.length} secure attachment${files.length > 1 ? "s" : ""}` : "No files attached"}</dd></div>
                <div><dt>Assignment</dt><dd>Verified counsel selected by Legal Connect</dd></div>
              </dl>
              <div className="lc-payment-total">
                <span>Total payable</span>
                <strong>{everythingFree ? "FREE" : `₹${payableAmount.toLocaleString("en-IN")}`}</strong>
              </div>
              {masterFree ? (
                <p><Gift /> Owner account — chat, call and video bookings are free on this login.</p>
              ) : firstChatFree ? (
                <p><Gift /> Your first Secure chat is on us so you can see how Legal Connect works. Later chats are ₹{PAID_CHAT_AMOUNT}.</p>
              ) : (
                <p><ShieldCheck /> Payment is verified by the backend. Your request then appears as a separate matter in your workspace.</p>
              )}

              {!everythingFree && paymentConfig?.mode === "test" && (
                <div className="lc-form-error" role="status">
                  <AlertTriangle />
                  Razorpay TEST mode: PhonePe/GPay will show “Invalid UPI ID” on the test QR. In checkout, enter UPI ID <strong>{paymentConfig.test_upi_id || "success@razorpay"}</strong> or pay by card.
                </div>
              )}

              {!everythingFree && qrImageUrl && paymentConfig?.upi_vpa && (
                <div className="lc-upi-panel" style={{ marginTop: "1rem", padding: "1rem", border: "1px solid rgba(26,35,50,0.12)", borderRadius: "1rem", textAlign: "center" }}>
                  <p style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", fontWeight: 700, marginBottom: "0.75rem" }}>
                    <QrCode className="h-4 w-4" /> Scan to pay with UPI
                  </p>
                  <img src={qrImageUrl} alt={`UPI QR for ${paymentConfig.upi_vpa}`} width={180} height={180} style={{ margin: "0 auto", borderRadius: "0.75rem" }} />
                  <p style={{ marginTop: "0.75rem", fontSize: "0.85rem" }}>
                    Payee: <strong>{paymentConfig.upi_payee_name || "Legal Connect"}</strong><br />
                    UPI ID: <strong>{paymentConfig.upi_vpa}</strong><br />
                    Amount: <strong>₹{payableAmount.toLocaleString("en-IN")}</strong>
                  </p>
                  <a className="lc-button lc-button-full" style={{ marginTop: "0.75rem" }} href={upiUri}>
                    Open UPI app
                  </a>
                </div>
              )}

              {error && <div className="lc-form-error"><AlertTriangle /> {error}</div>}
              <button className="lc-button lc-button-primary lc-button-full" onClick={beginPayment} disabled={busy || !kycReady}>
                {busy ? <Loader2 className="lc-spin" /> : everythingFree ? <Gift /> : <IndianRupee />}
                {!kycReady ? "Complete Aadhaar verification first" : everythingFree ? "Start free booking" : "Pay securely"}
              </button>
            </div>
          </motion.section>
        )}

        {stage === "assignment" && (
          <motion.section key="assignment" className="lc-assignment-confirmed" initial={{ opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }}>
            <span><CheckCircle2 /></span>
            <p className="lc-kicker">{receipt?.amount === 0 ? "FREE FIRST CHAT" : "PAYMENT VERIFIED"}</p>
            <h2>Your request is now a separate matter.</h2>
            <p>
              {receipt?.amount === 0
                ? "Your free first chat is ready. Legal Connect will complete the conflict check and open the matter workspace so you can see how it works."
                : "Legal Connect is completing the conflict check and assigning verified counsel. Its timeline, documents, payments and communications will remain inside this matter."}
            </p>
            <dl>
              <div><dt>Intake reference</dt><dd>{receipt?.id}</dd></div>
              <div><dt>Amount</dt><dd>{receipt?.amount === 0 ? "FREE" : `₹${receipt?.amount.toLocaleString("en-IN")}`}</dd></div>
              <div><dt>Status</dt><dd>Assignment pending</dd></div>
            </dl>
            {onClose ? (
              <button className="lc-button lc-button-primary" onClick={onClose}>View dashboard <ArrowRight /></button>
            ) : (
              <Link className="lc-button lc-button-primary" href={receipt?.caseId ? `/client/chat?caseId=${encodeURIComponent(receipt.caseId)}` : "/client"}>
                {receipt?.caseId ? "Open chat" : "View dashboard"} <ArrowRight />
              </Link>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
