# Legal Connect Google Play Data Safety Mapping

Status: draft mapping based on current code.  
Do not submit this file directly to Play Console without legal/business review.

Evidence reviewed: `artifacts/api-server/server.js`, `artifacts/api-server/db.js`, `index.html`, `app.js`, and synced public assets.

## High-Level Position

- App category: legal-tech service platform.
- Account creation/login: yes.
- Account deletion request path: yes, in-app and public `/data-deletion`.
- Data sale: no code evidence of selling personal data.
- Payment processor: Razorpay.
- Email processor: Resend.
- Hosting/database: Render/PostgreSQL.
- Android app: WebView wrapper loading the live web app.

## Data Safety Categories

| Play category | Collected | Shared | Purpose | Required / optional | Deletion support | Code evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Name | Yes | Processor-dependent | Account profile, role workspace, receipts, audit context | Required for user account/service flow | Deletion request supported; not automatic hard deletion | `users.name`, login form |
| Email address | Yes | Yes, with Resend when configured | Login OTP, notifications, support/account identification | Email or phone needed for login; email needed for email OTP | Deletion request supported; provider retention must be checked | `users.email`, `login_verifications.email`, `sendEmail()` |
| Phone number | Yes if provided | Processor-dependent; no SMS provider code confirmed in current backend | Login/contact/account identification, service coordination | Optional if email flow used, but service contact may require it | Deletion request supported | `users.phone`, `login_verifications.phone`, contact fields |
| User IDs | Yes | Processor-dependent | Link records to logged-in account | Required for account-based records | Deletion request supported; audit/payment retention may apply | `users.id`, `user_id`, signed session token |
| Payment info | Partial app-side collection | Yes, Razorpay | Payment order, verification, receipts, refunds/disputes | Required for paid services | Deletion request supported; payment/tax/dispute records may be retained | `razorpay_order_id`, `razorpay_payment_id`, `/api/payments/*` |
| Full card/UPI PIN/CVV | No code evidence | Razorpay handles instrument data outside app code | Payment processing | Required by Razorpay checkout, not collected by app backend | Governed by Razorpay and payment rules | No app fields for full card/CVV/UPI PIN |
| Legal service requests / app activity | Yes | Processor-dependent; internal RNA/Admin access | Bookings, Legal SOS, draft requests, court missions, case tracking, receipts | Required for requested services | Deletion request supported; service/audit/legal records may be retained | `bookings`, `sos_requests`, `tasks`, `cases`, `receipts` |
| Files and documents | Yes where user uploads/selects legal source PDFs or draft-support files | Processor-dependent | Legal source library, draft/service support | Optional, based on user/admin action | Source deletion/admin handling exists; full file retention workflow depends on storage used | `/api/admin/legal-sources/pdf`, frontend file/draft controls |
| Messages / notifications | Yes | Yes, Resend for email notifications where configured | OTP, reminders, status updates, receipt communications | Required for authentication/service updates where used | Deletion request supported; some audit/payment messages may be retained | `notifications`, `sendEmail()`, `/api/notify/test` |
| LawBot questions and feedback | Yes | Processor-dependent; no open AI provider is used by current source-locked route | Source-locked legal information and quality review | Optional | Deletion request supported; review retention not automated | `lawbot_chats`, `lawbot_queries`, `lawbot_feedback` |
| Location | User-provided only / unclear | Processor-dependent | Doorstep/court/service routing if user enters location in request payload | Optional, based on service request | Deletion request supported; service records may be retained | No background location permission/table found; free-text payload may include location |
| Photos/videos/audio | No dedicated collection confirmed in backend | No dedicated processor confirmed | File picker may be used for documents/proof if user uploads files | Optional if implemented in flow | Needs review if native Android upload/capture permissions are added | Current code references upload/proof URLs, not media capture storage |
| Contacts | No code evidence | No | Not used | Not applicable | Not applicable | No contacts API/table found |
| Health/fitness | No code evidence | No | Not used | Not applicable | Not applicable | No health data fields found |
| Device or other IDs | No dedicated app database collection found | Provider-dependent | Hosting/security logs may process request metadata | Not directly requested by app | Provider-controlled | No device fingerprint table; hosting may log IP/user-agent outside app DB |
| Crash/diagnostics/performance | Unclear/provider-dependent | Provider-dependent | Hosting/browser diagnostics | Not directly controlled in app code | Provider-controlled | No custom crash analytics SDK found in inspected code |

## Security / Handling Statements Supported by Code

The following cautious statements are supported:

- Session tokens are backend-signed and do not include raw email or phone.
- OTP codes are stored as hashes in PostgreSQL when DB is available.
- Receipts, bookings, cases, tasks, and notifications are filtered by logged-in user unless the user is RNA/Admin.
- Admin/RNA routes require elevated role checks.
- Razorpay secrets and Resend API keys are read from environment variables and are not exposed in frontend code.
- The app has a public data deletion page and an in-app account deletion request path.

Avoid claiming:

- Full DPDP compliance.
- End-to-end encryption.
- Government/court integration certification.
- SCC/Bar & Bench live integration.
- Automatic deletion timelines.
- Certified security standard compliance.

## Play Console Notes

Use `/data-deletion` as the public account deletion web resource after deployment.

For Play Data Safety, mark uncertain provider-level logs and file categories conservatively until Android permissions, file upload storage, and provider retention settings are reviewed.
