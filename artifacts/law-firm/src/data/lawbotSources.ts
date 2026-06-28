export type LawBotSourceMode =
  | "Bare Acts"
  | "Case Laws"
  | "Bills & Amendments"
  | "Client Simple Explanation"
  | "Advocate Research"
  | "Order Explainer";

export type LawBotSourceType =
  | "bare-act"
  | "case-law"
  | "bill-amendment"
  | "template"
  | "explainer";

export type LawBotSource = {
  id: string;
  sourceType: LawBotSourceType;
  title: string;
  courtOrAuthority: string;
  date: string;
  citation: string;
  url?: string;
  text: string;
  tags: string[];
};

export const LAW_BOT_SOURCE_MODES: LawBotSourceMode[] = [
  "Bare Acts",
  "Case Laws",
  "Bills & Amendments",
  "Client Simple Explanation",
  "Advocate Research",
  "Order Explainer",
];

export const LAW_BOT_DISCLAIMER =
  "This is legal information, not legal advice. Consult a verified advocate before taking action.";

export const APPROVED_API_PLACEHOLDERS = {
  SCC_ONLINE_API_KEY: "placeholder-only-not-connected",
  BAR_AND_BENCH_API_KEY: "placeholder-only-not-connected",
  INDIAN_KANOON_API_KEY: "placeholder-only-not-connected",
} as const;

export const lawbotSources: LawBotSource[] = [
  {
    id: "bns-103",
    sourceType: "bare-act",
    title: "Bharatiya Nyaya Sanhita, 2023 - culpable homicide and murder reference",
    courtOrAuthority: "Parliament of India",
    date: "2023-12-25",
    citation: "Bharatiya Nyaya Sanhita, 2023, Section 103 demo extract",
    url: "https://www.indiacode.nic.in/",
    text: "For demo research, BNS Section 103 is treated as the murder provision replacing the earlier IPC murder framework. A practical answer should identify the offence, mental element, punishment range, and immediately recommend verified legal representation in serious criminal matters.",
    tags: ["bns", "bharatiya nyaya sanhita", "murder", "section 103", "criminal law", "ipc replacement"],
  },
  {
    id: "bnss-bail",
    sourceType: "bare-act",
    title: "Bharatiya Nagarik Suraksha Sanhita, 2023 - bail process overview",
    courtOrAuthority: "Parliament of India",
    date: "2023-12-25",
    citation: "BNSS, 2023 demo procedural note",
    url: "https://www.indiacode.nic.in/",
    text: "The BNSS is the primary procedural criminal law framework replacing the Code of Criminal Procedure. A bail query should be answered as procedure-focused information: identify the offence, custody status, court forum, documents, surety, and urgency. The user should consult a verified advocate for strategy.",
    tags: ["bnss", "bharatiya nagarik suraksha sanhita", "bail", "arrest", "criminal procedure", "custody"],
  },
  {
    id: "bsa-evidence",
    sourceType: "bare-act",
    title: "Bharatiya Sakshya Adhiniyam, 2023 - evidence reliability overview",
    courtOrAuthority: "Parliament of India",
    date: "2023-12-25",
    citation: "BSA, 2023 demo evidence note",
    url: "https://www.indiacode.nic.in/",
    text: "The Bharatiya Sakshya Adhiniyam governs relevancy, admissibility, proof, witnesses, documents, and electronic evidence. A safe explanation should separate what a document says from whether it is admissible and proved in court.",
    tags: ["bsa", "bharatiya sakshya adhiniyam", "evidence", "electronic evidence", "proof", "witness"],
  },
  {
    id: "nia-138",
    sourceType: "bare-act",
    title: "Negotiable Instruments Act, 1881 - cheque dishonour",
    courtOrAuthority: "Parliament of India",
    date: "1881-12-09",
    citation: "Negotiable Instruments Act, 1881, Section 138 demo extract",
    url: "https://www.indiacode.nic.in/",
    text: "Section 138 concerns dishonour of cheque for insufficiency of funds or similar reasons. A compliant path usually involves cheque return memo, statutory demand notice within the prescribed period, failure to pay after notice, and filing a complaint within limitation.",
    tags: ["cheque bounce", "section 138", "negotiable instruments", "demand notice", "dishonour", "limitation"],
  },
  {
    id: "consumer-complaint",
    sourceType: "bare-act",
    title: "Consumer Protection Act, 2019 - consumer complaint basics",
    courtOrAuthority: "Parliament of India",
    date: "2019-08-09",
    citation: "Consumer Protection Act, 2019 demo extract",
    url: "https://www.indiacode.nic.in/",
    text: "A consumer complaint can arise from defective goods, deficiency in services, unfair trade practice, or misleading advertisement. The practical preparation is invoice, warranty, complaint emails, photographs, service record, loss estimate, and relief sought.",
    tags: ["consumer", "defective goods", "service deficiency", "refund", "warranty", "complaint"],
  },
  {
    id: "rent-template",
    sourceType: "template",
    title: "Rent agreement / tenancy checklist",
    courtOrAuthority: "Legal Connect Template Library",
    date: "2026-06-28",
    citation: "Legal Connect demo tenancy template",
    text: "A rent agreement should usually record landlord and tenant details, property description, rent amount, security deposit, lock-in period, maintenance responsibility, notice period, permitted use, police verification if applicable, and dispute resolution clause.",
    tags: ["rent agreement", "tenancy", "landlord", "tenant", "security deposit", "lease", "draft"],
  },
  {
    id: "sc-privacy-demo",
    sourceType: "case-law",
    title: "Sample Supreme Court case law - privacy as a constitutional value",
    courtOrAuthority: "Supreme Court of India",
    date: "2017-08-24",
    citation: "Justice K.S. Puttaswamy v. Union of India, demo citation note",
    text: "The sample case law note treats privacy as connected to dignity, autonomy, and Article 21. For a demo answer, explain that privacy is a constitutional value and any restriction must satisfy legality, legitimate aim, proportionality, and safeguards.",
    tags: ["supreme court", "privacy", "article 21", "constitutional law", "puttaswamy", "fundamental rights"],
  },
  {
    id: "hc-bail-demo",
    sourceType: "case-law",
    title: "Sample High Court case law - bail conditions must be proportionate",
    courtOrAuthority: "High Court of Delhi",
    date: "2024-04-12",
    citation: "Delhi High Court demo bail order note",
    text: "The sample High Court note says bail conditions should secure presence, prevent tampering, and protect investigation without becoming punitive. A demo answer should identify the condition, its purpose, and whether modification may be sought.",
    tags: ["high court", "delhi high court", "bail conditions", "modification", "criminal procedure", "surety"],
  },
  {
    id: "criminal-law-amendment",
    sourceType: "bill-amendment",
    title: "Criminal law transition note - IPC/CrPC/Evidence to BNS/BNSS/BSA",
    courtOrAuthority: "Ministry of Law and Justice demo update",
    date: "2024-07-01",
    citation: "Legal Connect demo amendment tracker",
    url: "https://legislative.gov.in/",
    text: "The criminal law transition replaces IPC with BNS, CrPC with BNSS, and the Evidence Act with BSA for the new legal framework. A safe answer should mention transition date, applicable facts period, and need to verify the governing statute before filing.",
    tags: ["amendment", "bill", "criminal law", "ipc", "crpc", "evidence act", "bns", "bnss", "bsa"],
  },
];

const modeTypeMap: Record<LawBotSourceMode, LawBotSourceType[]> = {
  "Bare Acts": ["bare-act", "template"],
  "Case Laws": ["case-law"],
  "Bills & Amendments": ["bill-amendment"],
  "Client Simple Explanation": ["bare-act", "template", "explainer", "case-law", "bill-amendment"],
  "Advocate Research": ["bare-act", "case-law", "bill-amendment", "template"],
  "Order Explainer": ["case-law", "bare-act"],
};

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

export function retrieveLawBotSources(query: string, mode: LawBotSourceMode) {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const allowedTypes = modeTypeMap[mode];
  return lawbotSources
    .filter((source) => allowedTypes.includes(source.sourceType))
    .map((source) => {
      const haystack = tokenize(`${source.title} ${source.text} ${source.tags.join(" ")} ${source.citation}`);
      const tagHits = source.tags.filter((tag) => query.toLowerCase().includes(tag.toLowerCase())).length * 4;
      const tokenHits = tokens.reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
      return { source, score: tagHits + tokenHits };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((result) => result.source);
}

export function answerFromApprovedSources(query: string, mode: LawBotSourceMode) {
  const matches = retrieveLawBotSources(query, mode);
  if (matches.length === 0) {
    return {
      answer: "I could not find this in the approved legal sources.",
      citations: [],
    };
  }

  const sourceText = matches.map((source) => source.text).join(" ");
  const prefix =
    mode === "Client Simple Explanation"
      ? "In simple words, based only on the approved source snippets:"
      : mode === "Advocate Research"
        ? "Research note based only on the approved source snippets:"
        : mode === "Order Explainer"
          ? "Order explainer based only on the approved source snippets:"
          : "Based only on the approved source snippets:";

  return {
    answer: `${prefix} ${sourceText} ${LAW_BOT_DISCLAIMER}`,
    citations: matches,
  };
}
