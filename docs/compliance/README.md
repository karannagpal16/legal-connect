# Legal Connect — BCI compliance programme

Compliance here is a product-design project, not a letter-writing exercise. The documents in this
folder are the paperwork; the enforcement lives in the code.

**The position being built and defended:**

> Legal Connect is technology and legal-operations infrastructure. Advocates are independent legal
> professionals. Clients and institutions choose and engage advocates independently. There is no
> referral commission, no paid promotion of any advocate, and no sale of legal work.

The regulatory context: Rule 36 of the Bar Council of India Rules prohibits an advocate from
advertising or soliciting work, directly or indirectly, and in 2024 the Bar Council of India directed
State Bar Councils to act against online platforms facilitating prohibited advertisement of legal
services.

---

## The documents

| Document | What it is | Status |
|---|---|---|
| [`PROFESSIONAL_CONDUCT_POLICY.md`](PROFESSIONAL_CONDUCT_POLICY.md) | The ten non-negotiable rules, and how each is enforced | Adopt internally first |
| [`FEATURE_COMPLIANCE_AUDIT.md`](FEATURE_COMPLIANCE_AUDIT.md) | Every feature classified 🟢/🟡/🔴, mapped to the file that implements it, with remediation status | Live register; re-run quarterly |
| [`INDEPENDENT_OPINION_BRIEF.md`](INDEPENDENT_OPINION_BRIEF.md) | Brief to an independent advocate: what to give them, the ten questions, what the opinion must conclude | Do this before writing to any regulator |
| [`BCI_REGULATORY_REPRESENTATION.md`](BCI_REGULATORY_REPRESENTATION.md) | The representation itself: covering letter, Annexures A–I, seven questions, twelve undertakings, architecture and money-flow diagrams, dispatch checklist | Signature-ready draft; blocked on the opinion |
| [`BCD_ENGAGEMENT_LETTER.md`](BCD_ENGAGEMENT_LETTER.md) | Meeting request to the Bar Council of Delhi: credential validation, practice technology, workshops, and an invitation-only pilot | Draft; send after the BCI representation |
| [`POLICY_ADVOCATE_PARTICIPATION_TERMS.md`](POLICY_ADVOCATE_PARTICIPATION_TERMS.md) | Terms for participating advocates | Draft for counsel review |
| [`POLICY_ENTERPRISE_COUNSELOPS_TERMS.md`](POLICY_ENTERPRISE_COUNSELOPS_TERMS.md) | Terms for institutional clients, plus a regulatory note for their compliance file | Draft for counsel review |
| [`POLICY_PAYMENTS.md`](POLICY_PAYMENTS.md) | Every permitted money flow, and the ones forbidden outright | Reflects the shipped fee model |
| [`POLICY_VERIFICATION.md`](POLICY_VERIFICATION.md) | What a credential statement may and may not say | Reflects the shipped copy |
| [`PHASE1_LAUNCH_REPORT.md`](PHASE1_LAUNCH_REPORT.md) | Phase-1 production hardening report: what shipped, what is hidden, remaining ops blockers | Current |

---

## What is already enforced in the product

These are not commitments for later; they are in the tree on this branch.

| Change | Where |
|---|---|
| Platform revenue is a flat per-mission technology and administration fee, never a share of a professional fee | `artifacts/api-server/compliance-policy.js`, `strategy-features.js`, `server.js` |
| The fee model, the ten rules, the prohibited practices, the metric policy and the verification policy are published by the running system | `GET /api/compliance/policy` |
| A build test fails if platform revenue becomes fee-linked, if a percentage-of-fee field reappears, or if the Rule 36 guard weakens | `artifacts/api-server/compliance-policy.test.js` |
| Counterpart star ratings are withdrawn; an operational service-window record replaces them | `POST /api/tasks/:id/service-record`; `/rate` returns HTTP 410 |
| Solicitation and superlative copy is withdrawn from the public intake page | `artifacts/law-firm/src/pages/BookLawyer.tsx`, `Home.tsx` |
| "Bar-verified" claims are replaced by statements of the document actually checked | server copy, client and admin surfaces |
| The public transparency page states that the professional fee is paid to the advocate in full | `TransparencyLedger.tsx`, `getTransparencyStats` |
| The Rule 36 content guard rejects superlatives, success rates, paid placement, pay-per-lead and Bar Council endorsement claims at the point of entry | `RULE36_PATTERNS` in `strategy-features.js` |

Run the checks:

```bash
node artifacts/api-server/compliance-policy.test.js
curl -s localhost:3000/api/compliance/policy | jq .
```

---

## Sequence

**Week 1 — audit and freeze.** Re-run the feature register. Keep every 🔴 withdrawn. Instruct the
independent advocate. Freeze any high-risk marketplace functionality that remains anywhere in a branch
or a design document, not just in production.

**Week 2 — assemble the representation.** Complete the placeholders, in particular Annexure C.4 on any
associated law firm and Annexure D.4 on the advisory allocation. Prepare the annexures and the
diagrams. Do not dispatch.

**Week 3 — opinion, then dispatch.** Fold the opinion into the representation. Sign. Dispatch by Speed
Post and email. Log it. Separately request the Bar Council of Delhi meeting.

**Weeks 3–4 — publish the policies.** Enterprise Terms, Advocate Participation Terms, Payment Policy
and Verification Policy, aligned with the shipped product.

**Week 4 — start enterprise selling.** "CounselOps — manage your existing legal panel." No advocate
sourcing in the pitch.

**Weeks 5–6 — win one pilot.** 50–100 matters, the institution's own advocates, per the pilot playbook.

**Weeks 6–8 — regulator engagement.** Bar Council of Delhi meeting; follow up with the Bar Council of
India; adapt the architecture to whatever response arrives.

**After regulatory comfort.** Only then consider panel-expansion workflows, advocate discovery and
consumer-side counsel functionality — strictly within what the opinion and any regulatory guidance
support.

---

## The two things not to forget

1. **A structure does not become compliant because it is labelled technology.** The flows, the
   ownership, the fees, the marketing copy and the relationship with practising advocates decide it.
   That is why the independent opinion comes before the regulator.
2. **Do not let the product drift away from the representation.** From the day of dispatch, material
   changes are recorded in `SUBMISSION_LOG.md`. A regulator's comment on a model we no longer operate
   is worth nothing.
