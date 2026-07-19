# Legal Connect Product Perfection Plan

Current branch: `main`
Current HEAD before work: `d028feb014e6aa1b15731bc990e08b058075bf1c`
Live app: `https://www.legal-connect.in`
Android package: `in.legalconnect.app`
Public support email target: `legalconnect0s@gmail.com`

## Audit Findings

- Theme: the app already has the Legal Connect navy/gold identity, but several older bright-theme and glass layers remain mixed in. The final pass should normalize contrast and keep one premium legal-tech tone.
- Visibility: phone screenshots show crowded cards, stacked labels, and skinny buttons in Admin, Client booking, and Case Diary. Controls need one-column mobile stacking and stronger text wrapping.
- Mobile overlap: floating status/SOS/LawBot elements can sit over CTAs, and admin action grids can compress into unreadable vertical slivers.
- Navigation: the rail exposes too many internal workrooms at once. Primary navigation should be simpler, with deeper tools opened from the relevant portal.
- Status language: some messages still say "opened", "demo", or imply live provider behavior. User-facing language should be precise: request received, verification pending, Work Completion Hold pending, source-controlled rollout.
- Pricing: consultation prices must be consistent everywhere. Random audio/video prices should be removed or aligned with the approved pricing table.
- Booking flow: booking needs service, plan, problem summary, payment verification status, receipt, and Service Room next step. Frontend must not mark paid before backend verification.
- Legal SOS: must not imply instant emergency rescue or fake video connection. It should create a coordinated legal-support request and route the user to status/receipt.
- Court Mission: visible language should use Work Completion Hold, minimum Rs. 300, proof review, RNA approval, release/dispute/refund states.
- Admin/RNA: cards and action buttons need mobile-safe layout, masked/safe wording, and clear success/failure feedback without raw secrets.
- LawBot: should be shown as controlled rollout/source-locked; no general legal AI claims.
- Privacy/legal pages: public support email must become `legalconnect0s@gmail.com`, and pages must remain readable with Udyam registration and no overclaiming.
- Backend-dependent failures: local fallback states must be honest and should not claim sync, payment, counsel connection, court sync, or source ingestion unless backend/provider confirms it.

## Protected Areas

- Preserve signed session token usage and role protections.
- Preserve account deletion and privacy request protections.
- Preserve production OTP fallback disabled behavior.
- Preserve Razorpay backend order/verification route. Never mark a payment paid from frontend success alone.
- Do not expose secrets, `.env`, keystore, Android release artifacts, or local IDE files.
- Avoid native Android changes unless a critical WebView issue requires them.

## Work Plan

1. Replace public support email references with `legalconnect0s@gmail.com`.
2. Tighten home, navigation, Client, Advocate, Legal SOS, Court Mission, Service Room and Admin copy.
3. Align all public pricing with the approved pricing table.
4. Add a final responsive CSS layer for no-overlap phone behavior.
5. Keep LawBot honest as controlled/source-locked rollout.
6. Sync root web files into `artifacts/api-server/public`.
7. Run `npm run build` and backend smoke tests for health, app version, legal pages, OTP safety, admin protection, booking/receipt, payment verification guard, SOS, mission/task, and account deletion.
8. Create `PRODUCT_PERFECTION_REPORT.md`.
9. Commit with `Perfect Legal Connect product experience`.
