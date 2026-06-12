import { useState } from "react";
import { FileText, Download, Copy, Check, ChevronRight, Pen, Home, Scale, AlertCircle, Car, Briefcase, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";

interface DocTemplate {
  id: string;
  title: string;
  icon: typeof FileText;
  category: string;
  color: string;
  bg: string;
  desc: string;
  fields: { key: string; label: string; placeholder: string; multiline?: boolean }[];
  template: (values: Record<string, string>) => string;
}

const templates: DocTemplate[] = [
  {
    id: "rent",
    title: "Rent Agreement",
    icon: Home,
    category: "Property",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    desc: "Standard residential rent agreement between landlord and tenant.",
    fields: [
      { key: "landlordName", label: "Landlord's Full Name", placeholder: "Rajesh Kumar Sharma" },
      { key: "tenantName", label: "Tenant's Full Name", placeholder: "Amit Verma" },
      { key: "propertyAddress", label: "Property Address", placeholder: "C-42, Sector 15, Noida, UP 201301", multiline: true },
      { key: "monthlyRent", label: "Monthly Rent (₹)", placeholder: "25000" },
      { key: "securityDeposit", label: "Security Deposit (₹)", placeholder: "50000" },
      { key: "startDate", label: "Lease Start Date", placeholder: "01/04/2026" },
      { key: "duration", label: "Lease Duration", placeholder: "11 months" },
    ],
    template: (v) => `RENT AGREEMENT

This Rent Agreement is made and executed on this ${new Date().toLocaleDateString("en-IN")} at New Delhi.

BETWEEN:
${v.landlordName || "[LANDLORD NAME]"} (hereinafter referred to as "LANDLORD")

AND

${v.tenantName || "[TENANT NAME]"} (hereinafter referred to as "TENANT")

PROPERTY: The Landlord hereby agrees to let out the property situated at ${v.propertyAddress || "[PROPERTY ADDRESS]"} to the Tenant.

TERMS AND CONDITIONS:

1. DURATION: This agreement shall be valid for a period of ${v.duration || "11 months"} commencing from ${v.startDate || "[DATE]"}.

2. RENT: The monthly rent shall be ₹${v.monthlyRent || "[AMOUNT]"}/- (Rupees ${v.monthlyRent || "[Amount in words]"} Only) payable on or before the 5th of every month.

3. SECURITY DEPOSIT: The Tenant has paid a security deposit of ₹${v.securityDeposit || "[AMOUNT]"}/- which shall be refunded at the time of vacating after deduction of dues if any.

4. UTILITIES: The Tenant shall pay all utility bills including electricity, water, gas, etc.

5. SUBLETTING: The Tenant shall not sublet the premises without written consent of the Landlord.

6. MAINTENANCE: The Tenant shall maintain the premises in good condition and shall not make any structural changes.

7. TERMINATION: Either party may terminate this agreement by giving one month's advance written notice.

8. LOCK-IN PERIOD: There shall be a lock-in period of [SPECIFY] months.

IN WITNESS WHEREOF, both parties have signed this agreement on the date first mentioned above.

LANDLORD: _______________________        TENANT: _______________________
(${v.landlordName || "[Landlord Name]"})           (${v.tenantName || "[Tenant Name]"})

WITNESS 1: _______________________       WITNESS 2: _______________________

[Note: This draft should be reviewed by an advocate and stamped on ₹500 stamp paper for legal validity]`,
  },
  {
    id: "affidavit",
    title: "General Affidavit",
    icon: Scale,
    category: "Legal",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    desc: "General purpose sworn statement / affidavit for official use.",
    fields: [
      { key: "deponentName", label: "Deponent's Full Name", placeholder: "Sunita Joshi" },
      { key: "deponentAge", label: "Age", placeholder: "35" },
      { key: "deponentAddress", label: "Address", placeholder: "B-12, Civil Lines, Delhi 110054", multiline: true },
      { key: "purpose", label: "Purpose / Statement", placeholder: "I hereby declare that I am a resident of the above address since the year 2010 and the said property belongs to my family.", multiline: true },
    ],
    template: (v) => `AFFIDAVIT

I, ${v.deponentName || "[FULL NAME]"}, aged ${v.deponentAge || "[AGE]"} years, residing at ${v.deponentAddress || "[ADDRESS]"}, do hereby solemnly affirm and declare as under:

1. That I am the deponent in this affidavit and am competent to swear this affidavit.

2. ${v.purpose || "[YOUR STATEMENT HERE]"}

3. That the above facts mentioned are true and correct to the best of my knowledge and belief and nothing material has been concealed therein.

DEPONENT

Verified on this _____ day of __________, 20___, at _____________.

I, ${v.deponentName || "[NAME]"}, the above-named deponent, do hereby verify that the contents of the above affidavit are true and correct to my knowledge, no part of it is false, and nothing material has been concealed therein.

DEPONENT

Signed before me:

_______________________
NOTARY / OATH COMMISSIONER
[Stamp & Seal]

[Note: This affidavit must be executed on stamp paper (₹10 or ₹20 as applicable) and attested by a Notary or Oath Commissioner]`,
  },
  {
    id: "notice",
    title: "Legal Notice",
    icon: AlertCircle,
    category: "Legal",
    color: "text-rose-400",
    bg: "bg-rose-500/10 border-rose-500/20",
    desc: "Legal notice to demand payment or resolution of a dispute.",
    fields: [
      { key: "senderName", label: "Your Full Name", placeholder: "Priya Mehta" },
      { key: "senderAddress", label: "Your Address", placeholder: "A-5, Lajpat Nagar, New Delhi 110024" },
      { key: "recipientName", label: "Recipient's Name", placeholder: "Mr. Vikas Gupta" },
      { key: "recipientAddress", label: "Recipient's Address", placeholder: "B-22, Rohini Sector 3, Delhi 110085" },
      { key: "subject", label: "Subject of Notice", placeholder: "Recovery of outstanding dues of ₹1,50,000" },
      { key: "facts", label: "Facts & Demand", placeholder: "You had borrowed ₹1,50,000 from me on 15/01/2026 with a promise to return by 15/03/2026. Despite multiple reminders, you have failed to repay the same.", multiline: true },
      { key: "demand", label: "Your Demand", placeholder: "Pay ₹1,50,000 within 15 days of receipt of this notice" },
    ],
    template: (v) => `LEGAL NOTICE

Date: ${new Date().toLocaleDateString("en-IN")}

From:
${v.senderName || "[YOUR NAME]"}
${v.senderAddress || "[YOUR ADDRESS]"}

To:
${v.recipientName || "[RECIPIENT NAME]"}
${v.recipientAddress || "[RECIPIENT ADDRESS]"}

SUBJECT: ${v.subject || "[SUBJECT]"}

Dear Sir/Madam,

Under the instructions of and on behalf of my client ${v.senderName || "[CLIENT NAME]"}, I hereby serve upon you this legal notice as under:

1. ${v.facts || "[STATE THE FACTS]"}

2. You have failed to comply with your obligations despite repeated verbal and written requests, thereby causing loss and inconvenience to my client.

3. You are hereby called upon to ${v.demand || "[STATE YOUR DEMAND]"} from the date of receipt of this notice, failing which my client shall be constrained to initiate appropriate legal proceedings against you in the competent court of law, without further notice, at your risk, cost, and consequences.

4. A copy of this notice is being retained in our office for future reference.

Yours faithfully,

_______________________
${v.senderName || "[NAME]"}
[or Advocate's name and stamp]

[Note: For stronger legal standing, send this notice through a registered advocate and by Registered Post / Speed Post with Acknowledgement Due]`,
  },
  {
    id: "nda",
    title: "NDA / Non-Disclosure",
    icon: Briefcase,
    category: "Business",
    color: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/20",
    desc: "Simple one-way non-disclosure agreement for business use.",
    fields: [
      { key: "disclosingParty", label: "Disclosing Party (You)", placeholder: "TechStartup Pvt. Ltd." },
      { key: "receivingParty", label: "Receiving Party", placeholder: "Rahul Sharma, Freelancer" },
      { key: "purpose", label: "Purpose of Disclosure", placeholder: "Evaluation of a potential business collaboration for mobile app development" },
      { key: "duration", label: "Confidentiality Period", placeholder: "2 years" },
    ],
    template: (v) => `NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into on ${new Date().toLocaleDateString("en-IN")} between:

DISCLOSING PARTY: ${v.disclosingParty || "[YOUR NAME/COMPANY]"}
RECEIVING PARTY: ${v.receivingParty || "[RECIPIENT NAME]"}

PURPOSE: ${v.purpose || "[STATE PURPOSE]"}

1. CONFIDENTIAL INFORMATION: "Confidential Information" means any and all information disclosed by the Disclosing Party to the Receiving Party in connection with the Purpose, including but not limited to business plans, financial information, technical data, trade secrets, customer lists, and proprietary information.

2. OBLIGATIONS: The Receiving Party agrees to:
   a) Hold all Confidential Information in strict confidence;
   b) Not disclose Confidential Information to third parties without prior written consent;
   c) Use the Confidential Information solely for the Purpose stated above;
   d) Take reasonable measures to protect the confidentiality of the information.

3. DURATION: This Agreement shall remain in effect for ${v.duration || "2 years"} from the date of execution.

4. EXCLUSIONS: This Agreement does not apply to information that: (a) is or becomes publicly available; (b) was known to Receiving Party before disclosure; (c) is independently developed by Receiving Party.

5. GOVERNING LAW: This Agreement shall be governed by the laws of India and disputes shall be subject to the jurisdiction of courts in [CITY].

DISCLOSING PARTY: _______________________     RECEIVING PARTY: _______________________
(${v.disclosingParty || "[Name]"})                      (${v.receivingParty || "[Name]"})
Date: _______________                          Date: _______________

[Note: Have this reviewed by an advocate for complex business arrangements]`,
  },
];

export function ClientDIYDocs() {
  const [selectedDoc, setSelectedDoc] = useState<DocTemplate | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [generated, setGenerated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    if (!selectedDoc) return;
    const doc = selectedDoc.template(values);
    setGenerated(doc);
  };

  const handleCopy = () => {
    if (generated) {
      navigator.clipboard.writeText(generated);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!generated || !selectedDoc) return;
    const blob = new Blob([generated], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedDoc.title.replace(/\s+/g, "_")}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <Pen className="w-7 h-7 text-blue-400" />
          <h1 className="text-3xl font-serif font-bold text-[#1A2E2A]">DIY Legal Documents</h1>
        </div>
        <p className="text-[#1A2E2A]/40 ml-10">Draft basic legal documents yourself — instantly, for free.</p>
      </motion.div>

      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-start gap-3">
        <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <p className="text-[#1A2E2A]/60 text-sm leading-relaxed">
          These templates are a starting point. For important matters, always have a qualified advocate review the document before signing or filing.
        </p>
      </div>

      {!selectedDoc ? (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#1A2E2A]/40 mb-4">Choose a Document</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {templates.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * i }}
                onClick={() => { setSelectedDoc(t); setValues({}); setGenerated(null); }}
                className={`border rounded-2xl p-5 cursor-pointer hover:-translate-y-1 transition-all duration-300 group ${t.bg}`}
              >
                <div className="flex items-start gap-4">
                  <t.icon className={`w-8 h-8 ${t.color} flex-shrink-0`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-[#1A2E2A] font-bold">{t.title}</h3>
                      <span className="text-[10px] text-[#1A2E2A]/30 bg-[#1A2E2A]/5 px-2 py-0.5 rounded-full border border-[#1A2E2A]/10">{t.category}</span>
                    </div>
                    <p className="text-[#1A2E2A]/50 text-sm">{t.desc}</p>
                    <div className={`flex items-center gap-1.5 mt-3 text-sm font-bold ${t.color} group-hover:gap-2 transition-all`}>
                      Create Draft <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 p-5 bg-card/30 border border-[#1A2E2A]/10 rounded-2xl text-center">
            <p className="text-[#1A2E2A]/40 text-sm mb-3">Need a custom document or something more complex?</p>
            <div className="flex justify-center gap-3">
              <Link href="/client/ai-assistant">
                <button className="flex items-center gap-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-500/30 transition-all">
                  Ask AI Assistant
                </button>
              </Link>
              <Link href="/client/book">
                <button className="flex items-center gap-2 bg-[#1A2E2A]/10 text-[#1A2E2A] border border-[#1A2E2A]/10 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#1A2E2A]/20 transition-all">
                  Book an Advocate
                </button>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <button
            onClick={() => { setSelectedDoc(null); setGenerated(null); }}
            className="flex items-center gap-2 text-[#1A2E2A]/40 hover:text-[#1A2E2A] text-sm mb-6 transition-colors"
          >
            ← Back to Documents
          </button>

          <div className={`border rounded-2xl p-5 mb-6 ${selectedDoc.bg}`}>
            <div className="flex items-center gap-3">
              <selectedDoc.icon className={`w-7 h-7 ${selectedDoc.color}`} />
              <div>
                <h2 className="text-[#1A2E2A] font-bold text-lg">{selectedDoc.title}</h2>
                <p className="text-[#1A2E2A]/40 text-xs">{selectedDoc.desc}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {selectedDoc.fields.map(field => (
              <div key={field.key} className={field.multiline ? "sm:col-span-2" : ""}>
                <label className="block text-[#1A2E2A]/60 text-xs font-semibold uppercase tracking-wider mb-2">{field.label}</label>
                {field.multiline ? (
                  <textarea
                    value={values[field.key] || ""}
                    onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    rows={3}
                    className="w-full bg-card/40 border border-[#1A2E2A]/10 rounded-xl px-4 py-3 text-[#1A2E2A] text-sm placeholder:text-[#1A2E2A]/25 focus:outline-none focus:border-blue-500/40 resize-none"
                  />
                ) : (
                  <input
                    value={values[field.key] || ""}
                    onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full bg-card/40 border border-[#1A2E2A]/10 rounded-xl px-4 py-3 text-[#1A2E2A] text-sm placeholder:text-[#1A2E2A]/25 focus:outline-none focus:border-blue-500/40"
                  />
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleGenerate}
            className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-[#1A2E2A] py-4 rounded-xl font-bold text-base transition-all hover:shadow-lg hover:shadow-blue-500/30 mb-6"
          >
            <FileText className="w-5 h-5" />
            Generate Document
          </button>

          {generated && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[#1A2E2A] font-semibold">Your Document is Ready</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 bg-[#1A2E2A]/10 hover:bg-[#1A2E2A]/20 text-[#1A2E2A]/60 hover:text-[#1A2E2A] px-3 py-2 rounded-xl text-xs font-bold transition-all border border-[#1A2E2A]/10"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                </div>
              </div>
              <pre className="bg-card/40 border border-[#1A2E2A]/10 rounded-2xl p-5 text-[#1A2E2A]/80 text-xs leading-relaxed whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
                {generated}
              </pre>
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <p className="text-amber-400 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  Review this draft carefully and have it checked by a qualified advocate before signing, notarizing, or filing it.
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
