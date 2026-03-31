import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Bell, ChevronRight, FileText, Phone, ExternalLink, MapPin, ArrowRight, Sparkles, BookOpen } from "lucide-react";

interface Card {
  id: string;
  tag: string;
  tagColor: string;
  tagBg: string;
  emoji: string;
  title: string;
  hook: string;
  detail: string;
  actionLabel: string;
  actionHref: string;
  isLocal?: boolean;
}

const cards: Card[] = [
  {
    id: "rent-2026",
    tag: "Rent Law 2026",
    tagColor: "text-blue-400",
    tagBg: "bg-blue-500/10 border-blue-500/20",
    emoji: "🏠",
    title: "Security Deposit Cap — New Delhi Rule",
    hook: "Did you know? Security deposits are now capped at 2 months' rent for residential properties and 6 months for commercial in Delhi.",
    detail: "Under the revised Model Tenancy Act framework adopted by Delhi, any landlord demanding more than 2 months advance for a residential unit is in violation. You can file a complaint with the Rent Authority. If paying by cheque, write 'Security Deposit — Refundable' on the back.",
    actionLabel: "Generate Rent Agreement",
    actionHref: "/client/diy-docs",
  },
  {
    id: "traffic-fine",
    tag: "Traffic Alert 2026",
    tagColor: "text-amber-400",
    tagBg: "bg-amber-500/10 border-amber-500/20",
    emoji: "🚗",
    title: "Traffic Fines — Know the New Amounts",
    hook: "Driving without a license now carries a ₹5,000 fine. Refusing to give way to an ambulance: ₹10,000. Are you aware?",
    detail: "Under MV Act amendments, signal jumping: ₹1,000–5,000 · Using phone while driving: ₹1,000 (1st offence), ₹10,000 (repeat) · No seatbelt: ₹1,000 · Drunk driving: ₹10,000 + 6 months imprisonment. If penalised wrongly, you have 60 days to challenge before the Motor Accidents Claims Tribunal.",
    actionLabel: "View Full Fine List",
    actionHref: "/client/legal-guide",
  },
  {
    id: "landlord-entry",
    tag: "Tenant Rights",
    tagColor: "text-emerald-400",
    tagBg: "bg-emerald-500/10 border-emerald-500/20",
    emoji: "🔑",
    title: "Your Landlord CANNOT Enter Without Notice",
    hook: "Your landlord must give you 24-hour written notice before entering your home. Surprise inspections are illegal.",
    detail: "Under the Model Tenancy Act, landlords may only enter for maintenance or inspection, must give at least 24 hours' notice, and must visit between 7 AM and 8 PM. If your landlord cuts essential services (water, electricity) to force you out, that is an offence under Section 11 and you can seek an injunction from the Rent Authority.",
    actionLabel: "File Complaint",
    actionHref: "/client/connect",
  },
  {
    id: "dpdp-act",
    tag: "Digital Rights",
    tagColor: "text-violet-400",
    tagBg: "bg-violet-500/10 border-violet-500/20",
    emoji: "🔐",
    title: "DPDP Act 2023 — Your Data Rights",
    hook: "If a company leaks your personal data, you can now claim financial compensation under Indian law. This is new.",
    detail: "The Digital Personal Data Protection Act 2023 gives you the right to: (1) Know what data a company holds about you, (2) Correct wrong data, (3) Withdraw consent at any time, (4) Seek financial penalty against the company for data breaches up to ₹250 crore. File complaints with the Data Protection Board of India. RNA Legal Connect can help you draft a formal demand notice.",
    actionLabel: "Ask LexBot",
    actionHref: "/client/connect",
  },
  {
    id: "consumer-2026",
    tag: "Consumer Law",
    tagColor: "text-rose-400",
    tagBg: "bg-rose-500/10 border-rose-500/20",
    emoji: "🛒",
    title: "E-Commerce Platform? They're Liable for Your Defective Product",
    hook: "Supreme Court (March 2026): Amazon, Flipkart etc. cannot disclaim liability for defective products sold by third-party sellers on their platform.",
    detail: "This landmark ruling means e-commerce platforms are now jointly liable for defective products. You can file a consumer complaint against both the seller AND the platform. Complaints below ₹1 crore go to the District Consumer Forum. File online at consumerhelpline.gov.in or let RNA Legal Connect draft your complaint.",
    actionLabel: "Draft Complaint",
    actionHref: "/client/diy-docs",
  },
  {
    id: "msme-reg",
    tag: "Business",
    tagColor: "text-cyan-400",
    tagBg: "bg-cyan-500/10 border-cyan-500/20",
    emoji: "💼",
    title: "Unregistered Business? You're Missing Legal Protection",
    hook: "Freelancers and small businesses without Udyam Registration are not protected under the MSME Payment Protection Act. Clients can delay payment indefinitely.",
    detail: "Udyam Registration (free at udyamregistration.gov.in) gives you: (1) Right to receive payment within 45 days, (2) 3x penal interest for delayed payments, (3) Access to government MSME dispute resolution portal, (4) Tax benefits. RNA Legal Connect can help with your business contract drafting once you are registered.",
    actionLabel: "Generate Client Contract",
    actionHref: "/client/diy-docs",
  },
  {
    id: "mcd-tax",
    tag: "📍 Subhash Nagar Alert",
    tagColor: "text-amber-300",
    tagBg: "bg-amber-500/15 border-amber-400/30",
    emoji: "🏛️",
    title: "MCD Property Tax — Amnesty Scheme Extended",
    hook: "MCD's Sampattikar Niptaan Yojana (Property Tax Amnesty) has been extended. Pay now — 100% interest waiver on pending dues.",
    detail: "The MCD amnesty applies to all residential and commercial properties in West Delhi including Subhash Nagar, Hari Nagar, and Tilak Nagar. Unpaid property tax after the amnesty period attracts 100% interest plus legal action by MCD. RNA Legal Connect can help if you've received an MCD notice. Visit your ward office or pay at mcdonline.nic.in.",
    actionLabel: "Get Help with MCD Notice",
    actionHref: "/client/connect",
    isLocal: true,
  },
  {
    id: "dda-housing",
    tag: "📍 Local Alert",
    tagColor: "text-amber-300",
    tagBg: "bg-amber-500/15 border-amber-400/30",
    emoji: "🏗️",
    title: "DDA Housing Scheme 2026 — Last Date for Objections",
    hook: "DDA is acquiring land in West Delhi corridors. If your property is in the acquisition zone, you have 90 days to file objections — don't miss the deadline.",
    detail: "Under the Land Acquisition Act 2013, landowners have a right to object to acquisition and claim fair compensation (up to 4x market value for rural land). Deadline for objections is typically published in the Delhi Gazette. RNA Legal Connect can review your property documents and file a timely objection on your behalf.",
    actionLabel: "File Objection",
    actionHref: "/client/connect",
    isLocal: true,
  },
  {
    id: "builder-delay",
    tag: "Property Rights",
    tagColor: "text-blue-400",
    tagBg: "bg-blue-500/10 border-blue-500/20",
    emoji: "🏢",
    title: "Builder Delayed Possession in Dwarka/Rohini? You Can Claim Interest",
    hook: "Under RERA, if a builder delays possession, you are entitled to SBI MCLR + 2% interest per annum on your entire deposited amount.",
    detail: "Delhi RERA has received 4,200+ complaints in 2025-26. Steps to claim: (1) Send a legal notice to the builder demanding possession date and compensation. (2) File a complaint at RERA Delhi (rera.delhi.gov.in). (3) If the builder is unresponsive, approach RERA Adjudicating Officer. RNA Legal Connect has handled 30+ RERA cases — contact us for a consultation.",
    actionLabel: "Consult for RERA Claim",
    actionHref: "/client/connect",
  },
];

const categories = ["All", "Rent Law", "Traffic", "Tenant Rights", "Digital Rights", "Consumer", "Local Alert", "Property"];

export function ClientRightsFeed() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = activeCategory === "All"
    ? cards
    : cards.filter(c => c.tag.toLowerCase().includes(activeCategory.toLowerCase()) || c.id.includes(activeCategory.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-white">Know Your Rights</h1>
            <p className="text-white/40 text-xs mt-0.5">Daily legal cards · Delhi 2026 · Updated weekly</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
          <Bell className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-400 text-xs font-bold">{cards.length} cards this week</span>
        </div>
      </div>

      {/* Local alert banner */}
      <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl px-5 py-4 flex items-start gap-3">
        <MapPin className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-amber-400 text-sm font-bold">📍 Subhash Nagar & West Delhi Alert</p>
          <p className="text-white/50 text-xs mt-0.5">MCD Amnesty Scheme active · DDA land notifications in progress · 2 items affect your area</p>
        </div>
        <button onClick={() => setActiveCategory("Local Alert")} className="text-xs font-bold text-amber-400 hover:underline flex-shrink-0">View →</button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`text-xs px-4 py-2 rounded-full border font-semibold transition-all ${activeCategory === cat ? "bg-primary/20 border-primary/40 text-primary" : "bg-white/5 border-white/10 text-white/40 hover:text-white hover:border-white/25"}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence>
          {filtered.map((card, i) => (
            <motion.div
              key={card.id}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: 0.05 * i }}
              className={`bg-card/40 border rounded-2xl overflow-hidden transition-colors hover:border-white/20 cursor-pointer ${card.isLocal ? "border-amber-500/25" : "border-white/10"}`}
              onClick={() => setExpanded(expanded === card.id ? null : card.id)}
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${card.tagBg} ${card.tagColor}`}>{card.tag}</span>
                  <span className="text-2xl">{card.emoji}</span>
                </div>
                <h3 className="text-white font-bold text-sm leading-snug mb-2">{card.title}</h3>
                <p className="text-white/50 text-xs leading-relaxed">{card.hook}</p>
              </div>

              <AnimatePresence>
                {expanded === card.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-white/8 bg-white/3 px-5 py-4"
                  >
                    <p className="text-white/65 text-xs leading-relaxed mb-4">{card.detail}</p>
                    <Link href={card.actionHref}>
                      <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-background text-xs font-bold px-4 py-2.5 rounded-xl transition-all w-full justify-center" onClick={e => e.stopPropagation()}>
                        {card.actionLabel} <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="px-5 py-2.5 border-t border-white/5 flex items-center justify-between text-[10px] text-white/25">
                <span>{expanded === card.id ? "Click to collapse" : "Tap to read more"}</span>
                <ChevronRight className={`w-3 h-3 transition-transform ${expanded === card.id ? "rotate-90" : ""}`} />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Bottom CTA */}
      <div className="bg-primary/8 border border-primary/20 rounded-2xl p-5 flex items-center gap-4">
        <Sparkles className="w-8 h-8 text-primary flex-shrink-0" />
        <div className="flex-1">
          <p className="text-white font-bold text-sm">Have a specific legal question?</p>
          <p className="text-white/40 text-xs mt-0.5">Ask LexBot or connect with one of our advocates instantly.</p>
        </div>
        <Link href="/client/connect">
          <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-background text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex-shrink-0">
            Consult RNA <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </Link>
      </div>
    </div>
  );
}
