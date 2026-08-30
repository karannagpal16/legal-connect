export type LegalDictionaryCategory =
  | "court_process"
  | "documents"
  | "money_fees"
  | "rights_protections"
  | "criminal"
  | "civil_family";

export type LegalDictionaryTerm = {
  id: string;
  term: string;
  phonetic: string;
  category: LegalDictionaryCategory;
  definition: string;
  whyItMatters: string;
  aliases?: string[];
};

export const LEGAL_DICTIONARY_CATEGORIES: Array<{ id: LegalDictionaryCategory | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "court_process", label: "Court Process" },
  { id: "documents", label: "Documents" },
  { id: "money_fees", label: "Money & Fees" },
  { id: "rights_protections", label: "Rights & Protections" },
  { id: "criminal", label: "Criminal" },
  { id: "civil_family", label: "Civil & Family" },
];

export const LEGAL_DICTIONARY: LegalDictionaryTerm[] = [
  {
    id: "vakalatnama",
    term: "Vakalatnama",
    phonetic: "vah-kah-lat-nah-mah",
    category: "documents",
    definition: "A signed paper that authorises your lawyer to represent you in court and file papers on your behalf.",
    whyItMatters: "Without it, counsel usually cannot appear or submit filings for you.",
    aliases: ["vakalat", "power of attorney for advocate"],
  },
  {
    id: "affidavit",
    term: "Affidavit",
    phonetic: "af-ih-day-vit",
    category: "documents",
    definition: "A written statement you swear is true, used as evidence before a court or authority.",
    whyItMatters: "False statements can create legal trouble. Read every line before you sign.",
  },
  {
    id: "plaint",
    term: "Plaint",
    phonetic: "playnt",
    category: "documents",
    definition: "The formal written complaint that starts a civil case in court.",
    whyItMatters: "This sets out what you want the court to decide and why.",
  },
  {
    id: "written-statement",
    term: "Written Statement",
    phonetic: "rit-en state-ment",
    category: "documents",
    definition: "The defendant’s formal written reply to a civil plaint.",
    whyItMatters: "Missing the deadline can weaken your defence or lead to an ex-parte order.",
  },
  {
    id: "sub-judice",
    term: "Sub-judice",
    phonetic: "sub-joo-di-say",
    category: "court_process",
    definition: "Means the matter is currently before a court and under judicial consideration.",
    whyItMatters: "Public comments about an ongoing case can be restricted.",
  },
  {
    id: "ex-parte",
    term: "Ex-Parte",
    phonetic: "ex-par-tay",
    category: "court_process",
    definition: "A court order or hearing held when one side is absent or unheard.",
    whyItMatters: "If you miss a date, the court may proceed without you.",
  },
  {
    id: "stay-order",
    term: "Stay Order",
    phonetic: "stay or-der",
    category: "court_process",
    definition: "A temporary court direction that pauses an action or previous order.",
    whyItMatters: "It can stop eviction, demolition, or enforcement while the dispute continues.",
  },
  {
    id: "interim-injunction",
    term: "Interim Injunction",
    phonetic: "in-ter-im in-junk-shun",
    category: "rights_protections",
    definition: "A short-term court order telling someone to do, or not do, something until the case is decided.",
    whyItMatters: "Often used to prevent immediate harm while the full case runs.",
  },
  {
    id: "caveat",
    term: "Caveat",
    phonetic: "kav-ee-at",
    category: "court_process",
    definition: "A caution filed so the court alerts you before granting certain orders against you.",
    whyItMatters: "Helps you get a chance to be heard before an adverse interim order.",
  },
  {
    id: "adjournment",
    term: "Adjournment",
    phonetic: "uh-jurn-ment",
    category: "court_process",
    definition: "A postponement of a hearing to a later date.",
    whyItMatters: "Delays your case timeline; ask counsel why it happened and what is next.",
  },
  {
    id: "cognizable",
    term: "Cognizable Offence",
    phonetic: "kog-niz-uh-bul",
    category: "criminal",
    definition: "A crime where police may register an FIR and investigate without prior court permission.",
    whyItMatters: "Police action can begin quickly; get counsel early.",
  },
  {
    id: "non-bailable",
    term: "Non-Bailable",
    phonetic: "non-bay-luh-bul",
    category: "criminal",
    definition: "An offence where bail is not automatic and usually needs a court decision.",
    whyItMatters: "You may remain in custody until a court grants bail.",
  },
  {
    id: "bail",
    term: "Bail",
    phonetic: "bayl",
    category: "criminal",
    definition: "Court permission to stay free during a criminal case, often with conditions.",
    whyItMatters: "Conditions (surety, travel limits) must be followed carefully.",
  },
  {
    id: "anticipatory-bail",
    term: "Anticipatory Bail",
    phonetic: "an-tis-uh-puh-tor-ee bayl",
    category: "criminal",
    definition: "Bail sought in advance when someone fears arrest in a non-bailable case.",
    whyItMatters: "Can protect against sudden arrest while investigation proceeds.",
  },
  {
    id: "fir",
    term: "FIR",
    phonetic: "ef-eye-ahr",
    category: "criminal",
    definition: "First Information Report — the police record that starts investigation of a cognizable offence.",
    whyItMatters: "Get a copy. Errors in names, dates, or facts matter later.",
    aliases: ["first information report"],
  },
  {
    id: "charge-sheet",
    term: "Charge-Sheet",
    phonetic: "charj sheet",
    category: "criminal",
    definition: "The police report filed in court after investigation, listing alleged offences and evidence.",
    whyItMatters: "This is when the case formally moves into court trial stages.",
  },
  {
    id: "quashing",
    term: "Quashing",
    phonetic: "kwosh-ing",
    category: "criminal",
    definition: "Asking a higher court to cancel an FIR or criminal proceeding as legally unsustainable.",
    whyItMatters: "A strong early remedy in some cases — timing and facts are critical.",
  },
  {
    id: "remand",
    term: "Remand",
    phonetic: "ree-mand",
    category: "criminal",
    definition: "Court order sending an accused to police or judicial custody for a set period.",
    whyItMatters: "Know whether custody is police or judicial and when the next production date is.",
  },
  {
    id: "maintenance",
    term: "Maintenance",
    phonetic: "mayn-tuh-nuhns",
    category: "civil_family",
    definition: "Money a court may order one spouse/parent to pay for the other’s living support.",
    whyItMatters: "Affects monthly cash flow; keep payment records.",
  },
  {
    id: "alimony",
    term: "Alimony",
    phonetic: "al-uh-moh-nee",
    category: "civil_family",
    definition: "Financial support ordered after separation or divorce (often used interchangeably with maintenance).",
    whyItMatters: "Can be temporary or longer-term depending on the order.",
  },
  {
    id: "probate",
    term: "Probate",
    phonetic: "pro-bayt",
    category: "civil_family",
    definition: "Court process that validates a will so estate assets can be transferred.",
    whyItMatters: "Often needed before banks or registries accept will-based transfers.",
  },
  {
    id: "rcr",
    term: "Restitution of Conjugal Rights",
    phonetic: "res-ti-too-shun of kon-joo-gul rights",
    category: "civil_family",
    definition: "A family-law petition asking the court to direct a spouse to resume marital cohabitation.",
    whyItMatters: "A strategic family remedy — discuss consequences with counsel before filing.",
    aliases: ["RCR"],
  },
  {
    id: "partition-suit",
    term: "Partition Suit",
    phonetic: "par-tish-un soot",
    category: "civil_family",
    definition: "A case seeking division of jointly owned family or ancestral property.",
    whyItMatters: "Title papers and possession facts decide how shares are carved out.",
  },
  {
    id: "title-deed",
    term: "Title Deed",
    phonetic: "ty-tul deed",
    category: "documents",
    definition: "The ownership document for property (sale deed, gift deed, etc.).",
    whyItMatters: "Courts and buyers rely on a clear chain of title.",
  },
  {
    id: "security-deposit",
    term: "Security Deposit",
    phonetic: "si-kyoor-ih-tee dee-poz-it",
    category: "money_fees",
    definition: "Money held as security against risk, breach, or future costs.",
    whyItMatters: "Ask when it can be refunded and what deductions are allowed.",
  },
  {
    id: "retainer-fee",
    term: "Retainer Fee",
    phonetic: "ri-tay-ner fee",
    category: "money_fees",
    definition: "An upfront professional fee to engage counsel for ongoing or reserved work.",
    whyItMatters: "Clarify what work it covers and what is billed separately.",
  },
  {
    id: "escrow",
    term: "Work Completion Hold",
    phonetic: "es-kroh",
    category: "money_fees",
    definition: "Money held until agreed work or proof is completed, then released or refunded under platform rules.",
    whyItMatters: "On Legal Connect, holds protect both sides until milestones are verified.",
    aliases: ["work hold", "work completion hold"],
  },
  {
    id: "court-fee",
    term: "Court Fee",
    phonetic: "kort fee",
    category: "money_fees",
    definition: "Official fee payable to the court for filing cases or applications.",
    whyItMatters: "Underpayment can delay registration of your case.",
  },
  {
    id: "cost-risk",
    term: "Cost Risk",
    phonetic: "kost risk",
    category: "money_fees",
    definition: "The chance you may have to pay part of the other side’s legal costs if you lose.",
    whyItMatters: "Ask counsel for a realistic downside before aggressive litigation steps.",
  },
  {
    id: "summons",
    term: "Summons",
    phonetic: "sum-unz",
    category: "court_process",
    definition: "An official court notice requiring a person to appear or respond.",
    whyItMatters: "Ignoring it can lead to adverse orders or warrants.",
  },
  {
    id: "notice",
    term: "Legal Notice",
    phonetic: "lee-gul no-tis",
    category: "documents",
    definition: "A formal written warning or demand sent before or during a dispute.",
    whyItMatters: "Your reply (or silence) can later be used in court.",
  },
  {
    id: "mediation",
    term: "Mediation",
    phonetic: "mee-dee-ay-shun",
    category: "court_process",
    definition: "A settlement process where a neutral helper guides both sides to a voluntary agreement.",
    whyItMatters: "Can save time and cost compared with a full trial.",
  },
  {
    id: "arbitration",
    term: "Arbitration",
    phonetic: "ar-bih-tray-shun",
    category: "court_process",
    definition: "A private dispute process where an arbitrator gives a binding decision.",
    whyItMatters: "Common in commercial contracts; court challenges are limited.",
  },
  {
    id: "injunction",
    term: "Injunction",
    phonetic: "in-junk-shun",
    category: "rights_protections",
    definition: "A court order that commands or forbids a specific act.",
    whyItMatters: "Breach can attract contempt proceedings.",
  },
  {
    id: "limitation",
    term: "Limitation Period",
    phonetic: "lim-ih-tay-shun peer-ee-ud",
    category: "rights_protections",
    definition: "The legal deadline within which a case or claim must be filed.",
    whyItMatters: "Missing it can permanently bar your claim.",
  },
  {
    id: "locus-standi",
    term: "Locus Standi",
    phonetic: "loh-kus stan-dee",
    category: "rights_protections",
    definition: "Your legal right to bring a case because you are sufficiently affected.",
    whyItMatters: "Without standing, the court may dismiss the petition at the threshold.",
  },
  {
    id: "cause-list",
    term: "Cause List",
    phonetic: "kawz list",
    category: "court_process",
    definition: "The court’s daily schedule of cases listed for hearing.",
    whyItMatters: "Confirms whether your matter is listed and in which courtroom.",
  },
  {
    id: "ndoh",
    term: "NDOH (Next Date of Hearing)",
    phonetic: "en-dee-oh-aitch",
    category: "court_process",
    definition: "The next court date fixed for your matter.",
    whyItMatters: "Mark it immediately and confirm appearance requirements with counsel.",
    aliases: ["next date of hearing", "NDOH"],
  },
  {
    id: "passover",
    term: "Pass-over",
    phonetic: "pass-oh-ver",
    category: "court_process",
    definition: "A short court appearance, often by another advocate, to mention or adjourn a matter.",
    whyItMatters: "Useful when your primary counsel cannot personally attend that day.",
  },
  {
    id: "proxy-mission",
    term: "Proxy Mission",
    phonetic: "prok-see mish-un",
    category: "court_process",
    definition: "On Legal Connect, a paid court task (pass-over/adjournment etc.) handled by an advocate whose enrolment document Legal Connect has checked, under work-hold rules.",
    whyItMatters: "Proof and hold release protect payment until the mission is verified.",
  },
  {
    id: "order-sheet",
    term: "Order Sheet",
    phonetic: "or-der sheet",
    category: "documents",
    definition: "The court’s written record of what happened and what was ordered on a hearing date.",
    whyItMatters: "Keep copies — they prove adjournments, directions, and next dates.",
  },
  {
    id: "judgment",
    term: "Judgment / Decree",
    phonetic: "juj-ment / di-kree",
    category: "court_process",
    definition: "The court’s final decision and the formal order that follows it.",
    whyItMatters: "Starts appeal/limitation clocks and enforcement steps.",
  },
  {
    id: "appeal",
    term: "Appeal",
    phonetic: "uh-peel",
    category: "court_process",
    definition: "Asking a higher court to review and change a lower court’s decision.",
    whyItMatters: "Strict filing deadlines apply — ask counsel immediately after judgment.",
  },
  {
    id: "revision",
    term: "Revision",
    phonetic: "ri-vizh-un",
    category: "court_process",
    definition: "A limited higher-court review of legality or propriety of a lower-court order.",
    whyItMatters: "Different from a full appeal; available only in specific situations.",
  },
  {
    id: "contempt",
    term: "Contempt of Court",
    phonetic: "kun-tempt",
    category: "rights_protections",
    definition: "Disobeying or disrespecting a court order or the court’s authority.",
    whyItMatters: "Can lead to fines or custody. Follow orders precisely.",
  },
  {
    id: "power-of-attorney",
    term: "Power of Attorney",
    phonetic: "pow-er of uh-tur-nee",
    category: "documents",
    definition: "A document authorising someone to act for you in property or other transactions.",
    whyItMatters: "Scope and registration requirements vary — do not sign blank formats.",
    aliases: ["PoA", "GPA", "SPA"],
  },
  {
    id: "notary",
    term: "Notary / Attestation",
    phonetic: "no-tuh-ree",
    category: "documents",
    definition: "Official stamping/verification that a signature or copy is authentic for legal use.",
    whyItMatters: "Many affidavits and authorisations need proper attestation.",
  },
  {
    id: "surety",
    term: "Surety",
    phonetic: "shoor-ih-tee",
    category: "criminal",
    definition: "A person who guarantees an accused will follow bail conditions.",
    whyItMatters: "Sureties may face liability if conditions are broken.",
  },
  {
    id: "interim-relief",
    term: "Interim Relief",
    phonetic: "in-ter-im ri-leef",
    category: "rights_protections",
    definition: "Temporary protection from the court while the main case is still pending.",
    whyItMatters: "Often the most urgent ask in the first weeks of a dispute.",
  },
  {
    id: "status-quo",
    term: "Status Quo",
    phonetic: "stay-tus kwoh",
    category: "court_process",
    definition: "An order to keep things as they currently are until further court directions.",
    whyItMatters: "Prevents sudden changes in possession, construction, or access.",
  },
  {
    id: "prima-facie",
    term: "Prima Facie",
    phonetic: "pree-mah fay-shee",
    category: "court_process",
    definition: "Means “at first look” — enough evidence to proceed further, not the final truth.",
    whyItMatters: "Courts often decide interim issues on a prima facie view.",
  },
  {
    id: "without-prejudice",
    term: "Without Prejudice",
    phonetic: "with-out prej-uh-dis",
    category: "documents",
    definition: "Settlement communication that generally cannot be used as an admission in court.",
    whyItMatters: "Useful for negotiation — still get counsel to review wording.",
  },
  {
    id: "gn",
    term: "Show-Cause Notice",
    phonetic: "sho kawz no-tis",
    category: "documents",
    definition: "A notice asking you to explain why a proposed action or penalty should not be taken.",
    whyItMatters: "Reply deadlines are short; silence can be treated as acceptance.",
    aliases: ["show cause"],
  },
  {
    id: "lok-adalat",
    term: "Lok Adalat",
    phonetic: "lohk ah-daa-lut",
    category: "court_process",
    definition: "A people’s court forum focused on amicable settlement of disputes.",
    whyItMatters: "Settlements here are final and executable like a court decree.",
  },
  {
    id: "legal-aid",
    term: "Legal Aid",
    phonetic: "lee-gul ayd",
    category: "rights_protections",
    definition: "State-supported legal help for eligible people who cannot afford private counsel.",
    whyItMatters: "Ask about eligibility if cost is blocking access to justice.",
  },
  {
    id: "pro-bono",
    term: "Pro Bono",
    phonetic: "proh boh-noh",
    category: "money_fees",
    definition: "Legal work done free or at heavily reduced cost in public interest.",
    whyItMatters: "Availability is limited; criteria vary by chamber and matter type.",
  },
  {
    id: "counsel",
    term: "Counsel",
    phonetic: "kown-sul",
    category: "court_process",
    definition: "Your advocate/lawyer representing you in the matter.",
    whyItMatters: "On Legal Connect, clients usually see “Assigned counsel” while LC supervises communication.",
  },
  {
    id: "lc-review",
    term: "LC Review",
    phonetic: "el-see ri-vyoo",
    category: "court_process",
    definition: "Legal Connect supervision step where platform admins review intakes or counsel updates before release.",
    whyItMatters: "Protects clients from unvetted advice and keeps case messaging accountable.",
    aliases: ["Legal Connect review", "pending LC review"],
  },
];

const termIndex = new Map<string, LegalDictionaryTerm>();
for (const item of LEGAL_DICTIONARY) {
  termIndex.set(item.term.toLowerCase(), item);
  termIndex.set(item.id.toLowerCase(), item);
  for (const alias of item.aliases || []) termIndex.set(alias.toLowerCase(), item);
}

export function findLegalTerm(term: string): LegalDictionaryTerm | undefined {
  const key = String(term || "").trim().toLowerCase();
  if (!key) return undefined;
  return termIndex.get(key) || LEGAL_DICTIONARY.find((item) => item.term.toLowerCase() === key);
}

export function searchLegalDictionary(query: string, category: LegalDictionaryCategory | "all" = "all"): LegalDictionaryTerm[] {
  const needle = query.trim().toLowerCase();
  return LEGAL_DICTIONARY.filter((item) => {
    if (category !== "all" && item.category !== category) return false;
    if (!needle) return true;
    return [item.term, item.definition, item.whyItMatters, ...(item.aliases || [])]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });
}
