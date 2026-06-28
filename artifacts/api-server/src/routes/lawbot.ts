import { Router } from "express";

const router = Router();

const fallbackMessage = "I could not find this in the approved legal sources.";

const mockSources = [
  {
    id: "nia-138",
    sourceType: "bare-act",
    title: "Negotiable Instruments Act, 1881 - cheque dishonour",
    courtOrAuthority: "Parliament of India",
    date: "1881-12-09",
    citation: "Negotiable Instruments Act, 1881, Section 138 demo extract",
    text: "Section 138 concerns dishonour of cheque for insufficiency of funds or similar reasons. A compliant path usually involves cheque return memo, statutory demand notice within the prescribed period, failure to pay after notice, and filing a complaint within limitation.",
    tags: ["cheque bounce", "section 138", "negotiable instruments", "demand notice", "dishonour"],
  },
  {
    id: "consumer-complaint",
    sourceType: "bare-act",
    title: "Consumer Protection Act, 2019 - consumer complaint basics",
    courtOrAuthority: "Parliament of India",
    date: "2019-08-09",
    citation: "Consumer Protection Act, 2019 demo extract",
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
];

function scoreSource(query: string, source: (typeof mockSources)[number]) {
  const normalized = query.toLowerCase();
  const text = `${source.title} ${source.text} ${source.tags.join(" ")}`.toLowerCase();
  return source.tags.filter((tag) => normalized.includes(tag)).length * 4
    + normalized.split(/\s+/).filter((word) => word.length > 2 && text.includes(word)).length;
}

router.post("/lawbot/query", (req, res) => {
  const query = String(req.body?.query ?? "");
  const matches = mockSources
    .map((source) => ({ source, score: scoreSource(query, source) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.source);

  if (matches.length === 0) {
    return res.json({ answer: fallbackMessage, citations: [] });
  }

  return res.json({
    answer: `Based only on approved source snippets: ${matches.map((source) => source.text).join(" ")} This is legal information, not legal advice. Consult a verified advocate before taking action.`,
    citations: matches,
  });
});

export default router;
