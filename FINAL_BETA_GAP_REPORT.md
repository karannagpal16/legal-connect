# Legal Connect Final Beta Gap Report

Date: 2026-07-10

Scope: controlled beta and limited paid pilot readiness for the Legal Connect web app, Render backend, PostgreSQL persistence, Android WebView wrapper, payments, notifications, receipts, source library, and LawBot guardrails.

## Audit Status

| Area | Status | Notes |
| --- | --- | --- |
| Web app health | Ready | `GET /api/health` exposes safe system status without secrets. |
| Android WebView/internal testing compatibility | Ready | Android wrapper loads the live web app. Normal web changes do not need a new AAB. |
| Login/OTP flow | Partially Ready | Email OTP is production-ready only when Resend is configured. Phone OTP remains SMS-provider ready, not live. |
| OTP fallback safety | Ready | Testing fallback is allowed only in demo/local mode. Production disables fallback. |
| Client booking flow | Ready for Beta | Booking creates a request, receipt, Service Room route, and pending payment state. |
| Legal SOS flow | Ready for Beta | SOS request creates a visible next-step flow and receipt. Actual call/video provider is still a launch dependency. |
| Chat plan flow | Ready for Beta | Chat/audio/video/doorstep plans route through booking and Service Room. |
| Draft request flow | Ready for Beta | Draft request creates receipt/status and shows next step. |
| Court Mission/Post Mission flow | Ready for Beta | Mission posting creates a task, status, receipt, and Work Completion Hold context. |
| Service Room routing | Ready | Booking/SOS/draft/mission routes show status, receipt/reference, next step, and support email. |
| Receipts visibility and privacy | Ready | Server returns no receipt history for anonymous users; normal users see only own receipts, RNA/Admin sees governance view. |
| Razorpay checkout | Partially Ready | Checkout structure exists. Live pilot must be tested with small controlled payments. |
| Razorpay backend verification | Ready for Pilot Testing | HMAC verification activates paid status and Work Completion Hold only after valid verification. |
| Work Completion Hold activation | Ready | Hold remains pending until backend payment verification succeeds. |
| Resend email/notification flow | Partially Ready | Ready when `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `FROM_EMAIL`, and `SUPPORT_EMAIL` are set. |
| Admin/RNA panel | Ready for Beta | Mobile overlap has been tightened; admin controls stack on phone. |
| Beta readiness panel | Ready | Shows health, OTP mode, payment, email, DB, LawBot/source status, and deployment state. |
| Mobile layout/WebView layout | Ready for Beta | Horizontal overflow is constrained; dense controls stack on phone. |
| Privacy Policy | Ready for Beta | Present in app with MSME and support details. Formal legal review recommended before public launch. |
| Terms | Ready for Beta | Present. Formal legal review recommended before public launch. |
| Refund Policy | Must Fix Before Public Launch | Present as beta policy. Needs final counsel/payment-gateway-approved wording. |
| Disclaimer | Ready for Beta | Avoids outcome guarantees and clarifies informational nature. |
| Contact/support email | Ready | `legalconnect0s@gmail.com` is visible. |
| Play Store Internal Testing readiness | Ready | Internal testing is active; tester emails must be managed in Play Console. |
| Store Data Safety notes | Must Fix Before Public Launch | Must be completed manually in Play Console with actual data-use declarations. |
| LawBot/source library status | Partially Ready | Source Library is ready. Public LawBot answers should remain controlled until approved sources are indexed. |
| Source-locked legal AI safety | Ready for Beta | LawBot route refuses unsupported queries and answers only from approved indexed chunks. |
| App version/update banner | Ready | `/api/app-version` and frontend refresh banner are present. |
| Error handling/offline/sleeping backend behavior | Ready for Beta | UI explains local fallback/server sync for controlled testing. |
| Security/privacy risks | Must Fix Before Public Launch | Need final legal review, SMS provider, production monitoring, access-control audit, and data retention policy. |

## Critical Bugs Fixed In This Pass

- Production OTP bypass risk reduced: the `111111` fallback is now controlled by `/api/health` and only works in demo/local mode.
- `/api/health` now exposes safe `otp_mode` and `otp_fallback_enabled` status.
- Production phone OTP now fails safely until an approved SMS provider is connected.
- Razorpay live-key warning now instructs small controlled pilot use only after verification.
- Booking shortcuts now route into Client Portal before focusing the booking desk.
- Service Room now explains controlled beta verification, support email, and local fallback sync.
- Mobile Admin/RNA action controls now stack and wrap cleanly.
- Unwired beta buttons now show a status message instead of feeling broken.

## Remaining Paid-Pilot Blockers

- Confirm live Resend sender domain and deliverability.
- Perform one small Razorpay live payment test and one failed verification test.
- Confirm all paid flows create private receipts under the logged-in user.
- Add tester accounts and execute one full Client, Advocate, RNA/Admin, and Intern walkthrough.
- Confirm the backend is awake enough for pilot usage or move Render service to a plan without cold-start issues.

## Remaining Public-Launch Blockers

- Final privacy policy, terms, refund policy, and disclaimer review by counsel.
- Final Play Store Data Safety declaration.
- SMS OTP provider and phone verification.
- Real call/video provider for Legal SOS.
- Formal Razorpay webhook production verification and reconciliation.
- Operational SOP for refunds, work completion approval, complaint handling, and data deletion.
- Source licensing workflow for any SCC Online, Bar & Bench, Indian Kanoon, or other licensed content.

## Android AAB

Android AAB not required for these web/backend changes. A new AAB is required only for native Android changes such as icon, splash, permissions, manifest, WebView settings, package name, or version fields.
