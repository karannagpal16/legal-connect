# Legal Connect Privacy and Personal Data Audit

Audit date: 13 July 2026  
Platform: Legal Connect  
Live URL: https://www.legal-connect.in  
Android package: in.legalconnect.app  
Support email: karannagpal16@gmail.com  
UDYAM: UDYAM-DL-11-0164811

This audit is based on the current codebase, especially `artifacts/api-server/server.js`, `artifacts/api-server/db.js`, `index.html`, `app.js`, and the synced files under `artifacts/api-server/public/`. It does not certify legal compliance. It records what the app currently collects, stores, shares with configured processors, exposes to roles, retains, and deletes.

## Summary

Legal Connect currently processes personal data for login, role-based workspaces, case/service tracking, Legal SOS, bookings, court missions/tasks, receipts, notifications, payment verification, source-locked LawBot usage, legal source library administration, and audit logs.

Critical privacy hardening completed in this pass:

- Session tokens are now signed by the backend and do not include raw email or phone.
- Request-body `userId` / `user_id` is no longer trusted for ownership of new writes.
- Anonymous reads for cases, bookings, tasks, receipts, notifications, and case detail endpoints are restricted or return no private records.
- Admin summary and task-action routes require RNA/Admin access.
- Account deletion requests now require login, explicit confirmation, a stored request record, and an audit log.
- Login privacy acknowledgement is not pre-ticked and links to Privacy Policy and Terms are visible before login.
- Public `/data-deletion` route returns HTTP 200 instructions for account/data deletion requests.

## Data Inventory

| Data category | Exact fields or examples | Where collected | Why processed | Where stored | Role access | Third-party processor/provider | Current retention behavior | Current deletion behavior | Privacy risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Account profile | `id`, `name`, `email`, `phone`, `role`, `created_at`, `email_verified_at`, `phone_verified_at`, `consent_at` | Login/signup form and `/api/auth/login` | Identify user, open role workspace, record verification and consent acknowledgement | `users` table or memory fallback | User sees masked profile state; RNA/Admin can review operational records | Render/PostgreSQL infrastructure; Resend receives email address for email OTP where configured | No automatic purge job implemented | User can request deletion; hard deletion workflow not automated | Contact details and role data identify a person |
| Login verification / OTP | `email`, `phone`, `code_hash`, `purpose`, `expires_at`, `consumed_at`, `created_at` | `/api/auth/request-code` and `/api/auth/verify-code` | Verify account access | `login_verifications` table or memory fallback | Backend; RNA/Admin may see related audit context, not raw code | Resend for email OTP if configured | Expiry is recorded; no automatic cleanup job implemented | Covered by account deletion request review | Authentication metadata can reveal user activity |
| Session token | Signed token payload containing `id`, `name`, `role`, `iat` | `/api/auth/login` response | Maintain login state | Browser localStorage as `legalConnectSession` | User device/browser; backend verifies signature | No dedicated third party beyond browser/device and hosting | Until browser/app storage is cleared or token is replaced | User can clear app/site data; deletion request does not remotely clear local device storage | Shared devices can expose account session |
| Local app state | `legalConnectWebVersion`, `legalConnectLocalOtp`, `legalConnectClientBooking`, `legalConnectLocalReceipts`, `legalConnectNotifyTest`, `legalConnectPaymentVerified`, `legalConnectMission`, `legalConnectCourtSyncCase`, `legalConnectLastCaseId` | Frontend interactions in `app.js` | Offline continuity, status display, local receipt preview, local dev OTP fallback | Browser localStorage | User device/browser only | No dedicated third party beyond browser/device | Until user clears app/site storage | User must clear local app storage separately | Sensitive legal summaries may remain on shared devices |
| Cases / case tracker | `user_id`, `title`, `court`, `case_number`, `cnr`, `next_date`, `status`, `notes`, `payload`, timestamps | Case tracker / court sync UI and `/api/cases` | Track matter status, calendar reminders, case diary | `cases` table or memory fallback | Owner; RNA/Admin; assigned user if stored in payload | Render/PostgreSQL | No automatic purge job implemented | Covered by deletion request review; legal/service records may be retained | Case numbers and notes can reveal legal matters |
| Case updates | `case_id`, `update_type`, `message`, `payload`, `created_at` | Case diary/update UI and `/api/case-updates` | Store diary events, calendar decisions, reminder state | `case_updates` table or memory fallback | Linked user context; RNA/Admin through operational dashboards | Render/PostgreSQL | No automatic purge job implemented | Covered by deletion request review | Updates can contain sensitive litigation information |
| Bookings and service requests | `user_id`, `service_type`, `amount`, `payment_status`, `receipt_no`, `next_destination`, `razorpay_order_id`, `razorpay_payment_id`, `work_hold_status`, `failure_reason`, `verified_at`, `payload`, `created_at` | Client booking, Legal SOS, drafts/templates, payment flow | Create service request, show status, support payment and receipt flow | `bookings` table or memory fallback | Owner; RNA/Admin; limited operational team access through dashboards | Razorpay for payments; Render/PostgreSQL | No automatic purge job implemented | Covered by deletion request review; payment/dispute/audit records may be retained | Reveals legal support need and transaction metadata |
| Court missions / tasks | `title`, `court`, `task_type`, `amount`, `escrow_status`/work hold status, `status`, `posted_by`, `accepted_by`, `proof_url`, `payload`, timestamps | Advocate mission/task UI and `/api/tasks`; RNA/Admin task actions | Coordinate court work, work completion hold, proof review, assignment | `tasks` table or memory fallback | Poster/assignee; intern where assigned; RNA/Admin | Render/PostgreSQL | No automatic purge job implemented | Covered by deletion request review; audit/payment/work records may be retained | Could expose matter location, client issue, proof details |
| Legal SOS requests | `user_id`, `service_type`, `urgency`, `status`, `payload`, `created_at` | Floating SOS panel and `/api/sos` | Emergency legal support routing and RNA/Admin tracking | `sos_requests` table or memory fallback | Requesting user; RNA/Admin | Render/PostgreSQL | No automatic purge job implemented | Covered by deletion request review; urgent/dispute records may be retained | High sensitivity because request may describe urgent legal issue |
| Draft/document requests | Draft type, receipt preference, stamp paper preference, contact detail, free-text facts, file selection metadata where used, `payload` | Documents Without Drama UI, bookings endpoint | Prepare agreements/templates/draft support and receipts | Usually `bookings.payload`; localStorage fallback; legal source PDFs use separate source library route | Requesting user; RNA/Admin | Render/PostgreSQL; email/WhatsApp links only if user initiates receipt share | No automatic purge job implemented | Covered by deletion request review; legal/service records may be retained | User may enter confidential facts or upload documents |
| Uploaded legal source text/PDF-derived text | Source type/name/title/citation/source URL/text content/chunks/status/uploaded by | Admin/RNA Legal AI Source Library | Source-locked LawBot retrieval | `legal_sources`, `legal_chunks` | RNA/Admin management; approved chunks used by LawBot answers | Render/PostgreSQL | No automatic purge job implemented | Admin can delete sources; account deletion does not automatically delete public/legal reference sources | Risk if licensed/confidential material is uploaded without authority |
| LawBot queries and feedback | `user_id`, `question`, `answer`, `sources`, `confidence`, `mode`, `rating`, `comment`, timestamps | LawBot UI and `/api/lawbot/query`, `/api/ai/chat`, `/api/lawbot/feedback` | Provide source-locked legal information and improve review | `lawbot_chats`, `lawbot_queries`, `lawbot_feedback` | User context; RNA/Admin may review aggregate/recent questions | Render/PostgreSQL | No automatic purge job implemented | Covered by deletion request review | Legal questions may reveal disputes or facts |
| Receipts | `receipt_no`, `user_id`, `actor_id`, `actor_role`, `receipt_type`, `title`, `message`, `status`, `amount`, `target_type`, `target_id`, `visibility`, `payload`, `created_at` | Login, booking, payment, SOS, case update, task actions | Transparency trail, user confirmation, audit support | `receipts` table or localStorage fallback | Owner/actor; RNA/Admin all receipts | Render/PostgreSQL; user may initiate email/WhatsApp share | No automatic purge job implemented | Account deletion review may retain payment/audit/dispute receipts | Receipts may reveal service, amount, matter status |
| Notifications | `user_id`, `event_type`, `title`, `message`, `read_at`, `payload`, `created_at` | Backend events and admin notification test | In-app reminders and email notification test | `notifications` table or memory fallback | User-specific/public; RNA/Admin can review | Resend for email notification where configured; Render/PostgreSQL | No automatic purge job implemented | Covered by deletion request review | Notification text can expose legal/service updates |
| Audit logs | `actor_id`, `actor_role`, `action`, `target_type`, `target_id`, `message`, `payload`, `created_at` | Backend audit events | Accountability for admin, payment, role, source, deletion, notification actions | `audit_logs` table or memory fallback | RNA/Admin | Render/PostgreSQL | No automatic purge job implemented | Usually retained for legal/audit/fraud/dispute reasons | Can reveal operational actions and linked identifiers |
| Payment gateway data | Amount, receipt/order IDs, Razorpay order ID, Razorpay payment ID, payment status, webhook event metadata | Razorpay order/verify/webhook routes and checkout frontend | Create/verify payments and mark Work Completion Hold status | `bookings`, `receipts`, audit logs | User/RNA/Admin depending on record | Razorpay receives payment order and handles payment instrument data | No automatic purge job implemented | Payment/tax/dispute records may need retention | Financial metadata is sensitive; full card/UPI PIN/CVV are not stored by app code |
| Email notification data | Recipient email, subject, message body, provider message ID | OTP and `/api/notify/test`; Resend email service | Send OTP and notifications | Notification/audit record; Resend dashboard/provider systems | Backend/RNA/Admin audit context | Resend when configured | No automatic purge job implemented in app | Covered by deletion request review; provider retention governed by provider terms | Email content may reveal app activity |
| Technical/provider logs | HTTP request metadata may be processed by hosting/provider; app code does not create a dedicated IP/device table | Render/hosting and browser/WebView runtime | Hosting, debugging, abuse prevention | Provider logs outside app DB; not explicitly modeled in app schema | Provider/admin infrastructure level | Render/hosting, browser/WebView | Not controlled by current app code | Not controlled by current app code | IP/device metadata may exist outside app database |

## Access Control Observations

- Role model includes `client`, `advocate`, `rna`, `intern`, and `admin`.
- `rna` and `admin` are treated as elevated roles through `canSeeAll(user)`.
- Current hardening requires signed session tokens and blocks anonymous admin routes inspected in this pass.
- Normal users are limited to their own bookings, cases, receipts, deletion requests, tasks relevant to them, and user/public notifications.
- Admin/RNA governance views expose more operational data; this is necessary for the current product design but must be covered by internal access policies.

## Third-Party Providers Observed in Code

- Render/hosting/PostgreSQL: app hosting and database infrastructure.
- Razorpay: payment order creation, checkout, payment verification, webhook status.
- Resend: email OTP and notification test where configured.
- Browser/Android WebView: localStorage/session state on user device.

No code evidence was found that Legal Connect stores full card numbers, CVV, UPI PIN, precise background location, contact list, or a dedicated biometric/device fingerprint table.

## Current Deletion Flow

- Logged-in users can open `Profile / Account - Privacy & Data`.
- User must explicitly confirm before submitting deletion request.
- Backend stores `account_deletion_requests` with user ID, timestamp, status, and payload.
- Backend writes `account_deletion_requested` audit log.
- Admin/RNA can view deletion requests through governance view.
- Public `/data-deletion` explains how to request account and associated personal data deletion.

Deletion is currently request-based. Automatic hard deletion/anonymisation of linked records is not implemented. Records may need to be retained where required for payment, tax, fraud prevention, dispute resolution, audit, legal, or compliance reasons.

## Current Launch Gaps

- No automated retention or deletion job exists.
- No separate marketing consent exists because marketing communications are not currently implemented as a separate flow.
- No formal Data Principal request workflow beyond deletion request and support email is implemented.
- Legal basis, retention periods, grievance officer/process, and role-based internal access policy need counsel/business approval before public scale.
- Provider retention and cross-border processing disclosures should be confirmed against Render, Razorpay, and Resend account settings and contracts.
