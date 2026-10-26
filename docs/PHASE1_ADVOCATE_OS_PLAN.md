# Legal Connect — Phase 1: Advocate Operating System (firm pilot plan)

Status: planning · Written 26 Oct 2026 · Builds on PR #46 (`fix/phase0-loose-ends`)

## Goal

Phase 1 is for advocates. Before public launch, the founder's own law firm runs its daily
litigation on Legal Connect: court diary, hearings, team, order sheets, judgments, ProxyHub
and client updates. When the firm can work a full month on it without spreadsheets or
WhatsApp, it is ready for other chambers.

## Decisions taken

| Question | Decision |
| --- | --- |
| Chamber Vault and ProxyHub | New screens and flows from scratch; keep the server logic fixed and tested in PR #46 (payments, permissions, supervision, 109 e2e checks) |
| Court data source | Official sites only (no paid provider, no captcha-breaking scrapers) |
| Pilot users | Chamber owner + associates, interns, outside proxy counsel, the firm's clients |

## Court data: what "official sites only" can and can't do

There is no official public API or RSS feed for eCourts case status or new judgments.
The official portals (eCourts services, the Judgment & Order search portal, the Supreme Court
and High Court sites) are human-facing and protected by captchas. Automatically breaking
captchas or bulk-scraping these sites is against their terms and fragile, so we won't.

What we build instead:

1. **CNR-first matters.** Every matter stores its CNR / case number and court. One tap opens
   the exact official status page. The app tracks the NDOH the firm records at hearing closure.
2. **Order sheets in, structured out.** After each hearing the advocate (or proxy) uploads the
   order sheet in the Court Day close flow. It's stored, verified by the chamber owner/LC, and
   read by AI into: outcome, next date, purpose, directions, deadlines.
3. **Judgment library from official PDFs.** Judgments downloaded from the SC/HC/district
   official sites are added to the library (single upload or a folder batch). Each is indexed
   with court, bench, date, parties, statutes and sections cited.
4. **Matter watchlists.** Each matter can watch acts/sections, parties, judges and courts.
   When a newly added judgment matches, the assigned advocates get an alert with an AI summary
   of why it may matter.
5. **Later, if needed:** a licensed data feed can plug into the same library and watchlists
   without changing the screens.

## AI layer ("advance AI operating system")

Needs one decision: an LLM API key on the server (recommended: Anthropic Claude API).
Every AI output cites its source document, is marked "AI draft — verify", and is for the
advocate's own use (not legal advice to clients, per Bar Council rules).

- Order-sheet reader: outcome, NDOH, purpose, directions → pre-fills hearing closure.
- Judgment digest: headnote, holding, statutes, how it bears on a watched matter.
- Matter brief: one page from the matter's orders, documents and timeline before each hearing.
- Drafting help: adjournment request, proxy brief/passover script, client update draft
  (client updates still go through LC review).
- Ask-the-matter: questions answered only from that matter's own documents.

## Workstreams

### A. Chamber Vault v2 (new screens)
- Today (court-day board): hearings by court/room/time, clashes, who's appearing, status.
- Diary / calendar: week and month, NDOH timeline, clash detection, holidays.
- Matter page: parties, CNR + official link, timeline of hearings and orders, documents,
  team, tasks, watchlist, AI brief.
- Team: invite → accept/decline screen, roles (owner, senior, associate, intern), seats.
- Hearing assignment → accept → close with NDOH → order-sheet upload → verification.
- Document vault: per-matter folders, versions, access log.
- Plan & billing page (Core / Pro / Elite) with the founder's complimentary entitlement.
- Bulk import: the firm's existing diary from Excel/CSV.

### B. ProxyHub v2 (new screens)
- Post mission → pay → LC assigns → proxy accepts → conflict declaration → check-in →
  order-sheet proof → LC verifies → posting counsel reviews → payout or refund.
- Boards: my posted missions, available missions (masked until assigned), my appearances.
- Ratings both ways, no-show handling, dispute flow, receipts.

### C. Court data & judgments
CNR links, order-sheet extraction, judgment library ingestion, watchlists and alerts (above).

### D. AI layer (above).

### E. Firm pilot setup
- Founder testing mode (FOUNDER_INTERNAL entitlement bound to a user ID, staging test accounts).
- Staging service on Render: own database, Razorpay TEST keys, own S3 bucket.
- The firm's real chamber, members and imported matters on production after staging sign-off.

### F. Testing
- Extend the API e2e suite per workflow; Playwright click-through tests for every new screen
  (desktop and phone width / Android WebView); route sweep before every release.

## Order of work and gates

| Stage | Work | Gate to move on |
| --- | --- | --- |
| 0 | Merge PR #46 to staging; enable build access (npm) for Claude | Staging runs; all roles sign in |
| 1 | A + E: Chamber Vault v2, founder testing mode, diary import | Firm runs its diary in the app for 2 weeks |
| 2 | B: ProxyHub v2 | 20 real proxy appearances with verified proof |
| 3 | C: order sheets, judgment library, watchlists | Orders for all hearings captured for 2 weeks |
| 4 | D: AI layer | Advocates use AI briefs/order reading weekly and trust them |
| 5 | Launch hardening: legal review, paid hosting, OTP/SMS, monitoring | Public Phase 1 launch for advocates |

## Needed from the founder

1. Build access: allow `registry.npmjs.org` for Claude's workspace (may need a new session).
2. Merge PR #46 after a staging check; create the staging service.
3. Firm details: number of advocates/interns, courts practised in, current diary format (Excel? register?).
4. Decide on the LLM API key (Anthropic recommended) for the AI layer.
5. S3 bucket (staging + production) for order sheets and documents.
