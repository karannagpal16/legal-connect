/** Plain-English legal dictionary served at GET /api/legal-dictionary */
const LEGAL_DICTIONARY = [
  { id: "vakalatnama", term: "Vakalatnama", phonetic: "vah-kah-lat-nah-mah", category: "documents", definition: "A signed paper that authorises your lawyer to represent you in court.", whyItMatters: "Without it, counsel usually cannot appear or submit filings for you." },
  { id: "affidavit", term: "Affidavit", phonetic: "af-ih-day-vit", category: "documents", definition: "A written statement you swear is true, used as evidence.", whyItMatters: "False statements can create legal trouble." },
  { id: "plaint", term: "Plaint", phonetic: "playnt", category: "documents", definition: "The formal written complaint that starts a civil case.", whyItMatters: "This sets out what you want the court to decide." },
  { id: "written-statement", term: "Written Statement", phonetic: "rit-en state-ment", category: "documents", definition: "The defendant’s formal written reply to a civil plaint.", whyItMatters: "Missing the deadline can weaken your defence." },
  { id: "sub-judice", term: "Sub-judice", phonetic: "sub-joo-di-say", category: "court_process", definition: "The matter is currently before a court.", whyItMatters: "Public comments about an ongoing case can be restricted." },
  { id: "ex-parte", term: "Ex-Parte", phonetic: "ex-par-tay", category: "court_process", definition: "A court order or hearing held when one side is absent.", whyItMatters: "If you miss a date, the court may proceed without you." },
  { id: "stay-order", term: "Stay Order", phonetic: "stay or-der", category: "court_process", definition: "A temporary court direction that pauses an action.", whyItMatters: "It can stop eviction or enforcement while the dispute continues." },
  { id: "interim-injunction", term: "Interim Injunction", phonetic: "in-ter-im in-junk-shun", category: "rights_protections", definition: "A short-term court order to do or not do something.", whyItMatters: "Used to prevent immediate harm while the case runs." },
  { id: "caveat", term: "Caveat", phonetic: "kav-ee-at", category: "court_process", definition: "A caution so the court alerts you before certain orders.", whyItMatters: "Helps you get a chance to be heard." },
  { id: "adjournment", term: "Adjournment", phonetic: "uh-jurn-ment", category: "court_process", definition: "A postponement of a hearing to a later date.", whyItMatters: "Ask counsel why it happened and what is next." },
  { id: "bail", term: "Bail", phonetic: "bayl", category: "criminal", definition: "Court permission to stay free during a criminal case.", whyItMatters: "Bail conditions must be followed carefully." },
  { id: "anticipatory-bail", term: "Anticipatory Bail", phonetic: "an-tis-uh-puh-tor-ee bayl", category: "criminal", definition: "Bail sought in advance when arrest is feared.", whyItMatters: "Can protect against sudden arrest." },
  { id: "fir", term: "FIR", phonetic: "ef-eye-ahr", category: "criminal", definition: "First Information Report starting a police investigation.", whyItMatters: "Get a copy; facts and dates matter later." },
  { id: "charge-sheet", term: "Charge-Sheet", phonetic: "charj sheet", category: "criminal", definition: "Police report filed in court after investigation.", whyItMatters: "Marks the move into court trial stages." },
  { id: "quashing", term: "Quashing", phonetic: "kwosh-ing", category: "criminal", definition: "Asking a higher court to cancel an FIR or proceeding.", whyItMatters: "Timing and facts are critical." },
  { id: "remand", term: "Remand", phonetic: "ree-mand", category: "criminal", definition: "Court order sending an accused into custody for a period.", whyItMatters: "Know the next production date." },
  { id: "maintenance", term: "Maintenance", phonetic: "mayn-tuh-nuhns", category: "civil_family", definition: "Court-ordered support money for a spouse or child.", whyItMatters: "Keep payment records." },
  { id: "alimony", term: "Alimony", phonetic: "al-uh-moh-nee", category: "civil_family", definition: "Financial support after separation or divorce.", whyItMatters: "Can be temporary or longer-term." },
  { id: "probate", term: "Probate", phonetic: "pro-bayt", category: "civil_family", definition: "Court process validating a will for estate transfer.", whyItMatters: "Often needed before banks accept will-based transfers." },
  { id: "title-deed", term: "Title Deed", phonetic: "ty-tul deed", category: "documents", definition: "The ownership document for property.", whyItMatters: "Courts rely on a clear chain of title." },
  { id: "escrow", term: "Escrow / Work Completion Hold", phonetic: "es-kroh", category: "money_fees", definition: "Money held until agreed work or proof is completed.", whyItMatters: "On Legal Connect, holds protect both sides until milestones are verified." },
  { id: "court-fee", term: "Court Fee", phonetic: "kort fee", category: "money_fees", definition: "Official fee payable to the court for filing.", whyItMatters: "Underpayment can delay registration." },
  { id: "cost-risk", term: "Cost Risk", phonetic: "kost risk", category: "money_fees", definition: "Chance you may pay part of the other side’s costs if you lose.", whyItMatters: "Ask counsel for a realistic downside." },
  { id: "retainer-fee", term: "Retainer Fee", phonetic: "ri-tay-ner fee", category: "money_fees", definition: "Upfront professional fee to engage counsel.", whyItMatters: "Clarify what work it covers." },
  { id: "summons", term: "Summons", phonetic: "sum-unz", category: "court_process", definition: "Official court notice requiring appearance or response.", whyItMatters: "Ignoring it can lead to adverse orders." },
  { id: "notice", term: "Legal Notice", phonetic: "lee-gul no-tis", category: "documents", definition: "Formal written warning or demand before or during a dispute.", whyItMatters: "Your reply or silence can later be used in court." },
  { id: "mediation", term: "Mediation", phonetic: "mee-dee-ay-shun", category: "court_process", definition: "Settlement process guided by a neutral helper.", whyItMatters: "Can save time and cost versus full trial." },
  { id: "injunction", term: "Injunction", phonetic: "in-junk-shun", category: "rights_protections", definition: "Court order that commands or forbids a specific act.", whyItMatters: "Breach can attract contempt proceedings." },
  { id: "limitation", term: "Limitation Period", phonetic: "lim-ih-tay-shun peer-ee-ud", category: "rights_protections", definition: "Legal deadline to file a claim.", whyItMatters: "Missing it can permanently bar your claim." },
  { id: "cause-list", term: "Cause List", phonetic: "kawz list", category: "court_process", definition: "Court’s daily schedule of listed cases.", whyItMatters: "Confirms courtroom and listing." },
  { id: "ndoh", term: "NDOH (Next Date of Hearing)", phonetic: "en-dee-oh-aitch", category: "court_process", definition: "The next court date fixed for your matter.", whyItMatters: "Mark it and confirm appearance needs." },
  { id: "passover", term: "Pass-over", phonetic: "pass-oh-ver", category: "court_process", definition: "Short court appearance, often by another advocate.", whyItMatters: "Useful when primary counsel cannot attend." },
  { id: "proxy-mission", term: "Proxy Mission", phonetic: "prok-see mish-un", category: "court_process", definition: "Paid court task handled under Legal Connect work-hold rules.", whyItMatters: "Proof and hold release protect payment." },
  { id: "order-sheet", term: "Order Sheet", phonetic: "or-der sheet", category: "documents", definition: "Court’s written record of a hearing day’s orders.", whyItMatters: "Keep copies for next dates and directions." },
  { id: "judgment", term: "Judgment / Decree", phonetic: "juj-ment / di-kree", category: "court_process", definition: "The court’s final decision and formal order.", whyItMatters: "Starts appeal clocks and enforcement." },
  { id: "appeal", term: "Appeal", phonetic: "uh-peel", category: "court_process", definition: "Asking a higher court to review a decision.", whyItMatters: "Strict filing deadlines apply." },
  { id: "contempt", term: "Contempt of Court", phonetic: "kun-tempt", category: "rights_protections", definition: "Disobeying or disrespecting a court order.", whyItMatters: "Can lead to fines or custody." },
  { id: "power-of-attorney", term: "Power of Attorney", phonetic: "pow-er of uh-tur-nee", category: "documents", definition: "Document authorising someone to act for you.", whyItMatters: "Do not sign blank formats." },
  { id: "surety", term: "Surety", phonetic: "shoor-ih-tee", category: "criminal", definition: "Person who guarantees bail conditions will be followed.", whyItMatters: "Sureties may face liability if conditions break." },
  { id: "interim-relief", term: "Interim Relief", phonetic: "in-ter-im ri-leef", category: "rights_protections", definition: "Temporary court protection while the main case is pending.", whyItMatters: "Often the most urgent early ask." },
  { id: "status-quo", term: "Status Quo", phonetic: "stay-tus kwoh", category: "court_process", definition: "Order to keep things as they currently are.", whyItMatters: "Prevents sudden possession or access changes." },
  { id: "prima-facie", term: "Prima Facie", phonetic: "pree-mah fay-shee", category: "court_process", definition: "Enough evidence at first look to proceed further.", whyItMatters: "Interim issues are often decided this way." },
  { id: "without-prejudice", term: "Without Prejudice", phonetic: "with-out prej-uh-dis", category: "documents", definition: "Settlement talk that generally cannot be used as admission.", whyItMatters: "Useful for negotiation — still get counsel review." },
  { id: "lok-adalat", term: "Lok Adalat", phonetic: "lohk ah-daa-lut", category: "court_process", definition: "People’s court forum focused on amicable settlement.", whyItMatters: "Settlements are final like a decree." },
  { id: "legal-aid", term: "Legal Aid", phonetic: "lee-gul ayd", category: "rights_protections", definition: "State-supported legal help for eligible people.", whyItMatters: "Ask about eligibility if cost blocks access." },
  { id: "counsel", term: "Counsel", phonetic: "kown-sul", category: "court_process", definition: "Your advocate representing you in the matter.", whyItMatters: "Clients usually see Assigned counsel under LC supervision." },
  { id: "lc-review", term: "LC Review", phonetic: "el-see ri-vyoo", category: "court_process", definition: "Legal Connect supervision of intakes or counsel updates.", whyItMatters: "Keeps case messaging accountable." },
  { id: "cognizable", term: "Cognizable Offence", phonetic: "kog-niz-uh-bul", category: "criminal", definition: "Crime police may investigate without prior court permission.", whyItMatters: "Police action can begin quickly." },
  { id: "non-bailable", term: "Non-Bailable", phonetic: "non-bay-luh-bul", category: "criminal", definition: "Offence where bail is not automatic.", whyItMatters: "You may remain in custody until court grants bail." },
  { id: "partition-suit", term: "Partition Suit", phonetic: "par-tish-un soot", category: "civil_family", definition: "Case seeking division of jointly owned property.", whyItMatters: "Title papers and possession facts decide shares." },
  { id: "rcr", term: "Restitution of Conjugal Rights", phonetic: "res-ti-too-shun of kon-joo-gul rights", category: "civil_family", definition: "Petition asking a spouse to resume marital cohabitation.", whyItMatters: "Discuss consequences with counsel before filing." },
  { id: "security-deposit", term: "Security Deposit", phonetic: "si-kyoor-ih-tee dee-poz-it", category: "money_fees", definition: "Money held as security against risk or future costs.", whyItMatters: "Ask when it can be refunded." },
  { id: "arbitration", term: "Arbitration", phonetic: "ar-bih-tray-shun", category: "court_process", definition: "Private dispute process with a binding arbitrator decision.", whyItMatters: "Common in commercial contracts." },
  { id: "revision", term: "Revision", phonetic: "ri-vizh-un", category: "court_process", definition: "Limited higher-court review of a lower-court order.", whyItMatters: "Different from a full appeal." },
  { id: "notary", term: "Notary / Attestation", phonetic: "no-tuh-ree", category: "documents", definition: "Official verification of a signature or copy.", whyItMatters: "Many affidavits need proper attestation." },
  { id: "show-cause", term: "Show-Cause Notice", phonetic: "sho kawz no-tis", category: "documents", definition: "Notice asking why a proposed action should not be taken.", whyItMatters: "Reply deadlines are short." },
  { id: "pro-bono", term: "Pro Bono", phonetic: "proh boh-noh", category: "money_fees", definition: "Legal work done free or at reduced cost.", whyItMatters: "Availability is limited." },
  { id: "locus-standi", term: "Locus Standi", phonetic: "loh-kus stan-dee", category: "rights_protections", definition: "Your legal right to bring a case.", whyItMatters: "Without standing, petitions can be dismissed early." },
];

function searchLegalDictionary(query = "", category = "all") {
  const needle = String(query || "").trim().toLowerCase();
  return LEGAL_DICTIONARY.filter((item) => {
    if (category && category !== "all" && item.category !== category) return false;
    if (!needle) return true;
    return `${item.term} ${item.definition} ${item.whyItMatters}`.toLowerCase().includes(needle);
  });
}

module.exports = { LEGAL_DICTIONARY, searchLegalDictionary };
