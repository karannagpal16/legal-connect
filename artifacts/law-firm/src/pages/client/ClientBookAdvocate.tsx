import { useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileSearch,
  Gavel,
  IndianRupee,
  Loader2,
  LockKeyhole,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { workspaceRequest } from "@/lib/workspace";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const services = [
  { id: "consult", title: "Legal consultation", detail: "Issue review and a practical action plan", amount: 499, icon: Scale },
  { id: "document", title: "Document review", detail: "Review a notice, agreement, pleading or order", amount: 999, icon: FileSearch },
  { id: "matter", title: "Matter representation", detail: "Conflict check and counsel assignment intake", amount: 1499, icon: Gavel },
];

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

export function ClientBookAdvocate() {
  const { session } = useAuth();
  const [stage, setStage] = useState<IntakeStage>("intake");
  const [serviceId, setServiceId] = useState("consult");
  const [urgency, setUrgency] = useState("standard");
  const [summary, setSummary] = useState("");
  const [oppositeParty, setOppositeParty] = useState("");
  const [court, setCourt] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<{ id: string; receiptNo?: string; amount: number } | null>(null);
  const service = useMemo(() => services.find((item) => item.id === serviceId) || services[0], [serviceId]);

  const reviewIntake = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!consent) { setError("Confirm the conflict-check and privacy notice before continuing."); return; }
    setStage("payment");
  };

  const beginPayment = async () => {
    setBusy(true);
    setError("");
    try {
      const booking = await workspaceRequest<any>("/api/bookings", session?.token, {
        method: "POST",
        body: JSON.stringify({
          serviceType: service.title,
          legalIssueType: service.title,
          amount: service.amount,
          paymentStatus: "payment_pending",
          workHoldStatus: "pending",
          nextDestination: "Legal Connect assignment desk",
          urgency,
          problemSummary: summary,
          oppositeParty,
          court,
          assignmentPolicy: "legal-connect-managed",
        }),
      });
      const order = await workspaceRequest<any>("/api/payments/create-order", session?.token, {
        method: "POST",
        body: JSON.stringify({ bookingId: booking.id, amount: service.amount, serviceType: service.title, receiptNo: booking.receiptNo }),
      });

      if (order.mode === "google-play-review" || (order.mode === "demo" && order.status === "review_only")) {
        setReceipt({ id: booking.id, receiptNo: order.receipt, amount: service.amount });
        setStage("assignment");
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
        description: service.title,
        prefill: { name: session?.user.name || "", email: session?.user.email || "" },
        theme: { color: "#b18938" },
        handler: async (response: any) => {
          try {
            await workspaceRequest("/api/payments/verify", session?.token, {
              method: "POST",
              body: JSON.stringify({ bookingId: booking.id, order_id: response.razorpay_order_id, payment_id: response.razorpay_payment_id, signature: response.razorpay_signature }),
            });
            setReceipt({ id: booking.id, receiptNo: booking.receiptNo, amount: service.amount });
            setStage("assignment");
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
    <div className="lc-intake-page">
      <header className="lc-intake-heading">
        <div><span className="lc-kicker">LEGAL CONNECT MANAGED ASSIGNMENT</span><h2>Start a legal intake</h2><p>Tell us what you need, complete payment, and we assign suitable verified counsel after a conflict check.</p></div>
        <div className="lc-intake-steps" aria-label="Intake progress"><span className="active">1 Intake</span><i /><span className={stage !== "intake" ? "active" : ""}>2 Payment</span><i /><span className={stage === "assignment" ? "active" : ""}>3 Assignment</span></div>
      </header>

      <AnimatePresence mode="wait">
        {stage === "intake" && (
          <motion.form key="intake" className="lc-intake-form" onSubmit={reviewIntake} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <section className="lc-operational-panel lc-service-selector">
              <header><div><span>Step 1</span><h2>Choose the type of help</h2></div></header>
              <div>
                {services.map((item) => (
                  <button key={item.id} type="button" className={serviceId === item.id ? "active" : ""} onClick={() => setServiceId(item.id)}>
                    <item.icon /><span><strong>{item.title}</strong><small>{item.detail}</small></span><em>₹{item.amount.toLocaleString("en-IN")}</em>
                  </button>
                ))}
              </div>
            </section>

            <section className="lc-operational-panel lc-intake-details">
              <header><div><span>Confidential intake</span><h2>Matter details</h2></div><ShieldCheck /></header>
              <label><span>Briefly describe the issue</span><textarea value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="What happened, important dates, and the help you need" rows={5} minLength={30} required /></label>
              <div className="lc-form-grid">
                <label><span>Opposite party</span><input value={oppositeParty} onChange={(event) => setOppositeParty(event.target.value)} placeholder="Name for conflict check" required /></label>
                <label><span>Court / city, if any</span><input value={court} onChange={(event) => setCourt(event.target.value)} placeholder="Delhi High Court / New Delhi" /></label>
                <label><span>Urgency</span><select value={urgency} onChange={(event) => setUrgency(event.target.value)}><option value="standard">Standard · within 1 business day</option><option value="urgent">Urgent · within 2 hours</option><option value="sos">Legal SOS · immediate triage</option></select></label>
              </div>
              <label className="lc-consent-field"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>I authorise a confidential conflict check and understand that no advocate is assigned until payment is verified.</span></label>
              {error && <div className="lc-form-error"><AlertTriangle /> {error}</div>}
              <button className="lc-button lc-button-primary" type="submit">Review and pay <ArrowRight /></button>
            </section>
          </motion.form>
        )}

        {stage === "payment" && (
          <motion.section key="payment" className="lc-payment-review" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <button className="lc-back-command" onClick={() => setStage("intake")}><ArrowLeft /> Edit intake</button>
            <div className="lc-operational-panel lc-payment-summary">
              <header><div><span>Step 2</span><h2>Secure payment</h2></div><LockKeyhole /></header>
              <dl><div><dt>Service</dt><dd>{service.title}</dd></div><div><dt>Assignment</dt><dd>Managed by Legal Connect after conflict check</dd></div><div><dt>Advocate names</dt><dd>Not displayed before verified assignment</dd></div><div><dt>Professional intake fee</dt><dd>₹{service.amount.toLocaleString("en-IN")}</dd></div></dl>
              <div className="lc-payment-total"><span>Total payable</span><strong>₹{service.amount.toLocaleString("en-IN")}</strong></div>
              <p><ShieldCheck /> Payment is verified by the backend before the assignment desk can release a matter to counsel.</p>
              {error && <div className="lc-form-error"><AlertTriangle /> {error}</div>}
              <button className="lc-button lc-button-primary lc-button-full" onClick={beginPayment} disabled={busy}>{busy ? <Loader2 className="lc-spin" /> : <IndianRupee />} Pay securely</button>
            </div>
          </motion.section>
        )}

        {stage === "assignment" && (
          <motion.section key="assignment" className="lc-assignment-confirmed" initial={{ opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }}>
            <span><CheckCircle2 /></span><p className="lc-kicker">PAYMENT VERIFIED</p><h2>Your intake is with the assignment desk.</h2><p>Legal Connect is completing the conflict check and selecting verified counsel for this matter. Counsel identity and the communication channel will appear in your dashboard after acceptance.</p>
            <dl><div><dt>Intake reference</dt><dd>{receipt?.id}</dd></div><div><dt>Amount</dt><dd>₹{receipt?.amount.toLocaleString("en-IN")}</dd></div><div><dt>Status</dt><dd>Assignment pending</dd></div></dl>
            <Link className="lc-button lc-button-primary" href="/client">Return to dashboard <ArrowRight /></Link>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
