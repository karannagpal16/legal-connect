# Legal Connect Data Retention Plan

Status: proposed plan for counsel/business approval.  
Implementation status: no destructive automatic retention or deletion jobs were added in this task.

This document translates the current Legal Connect data model into proposed retention categories. It is not legal advice and should be reviewed before being presented as a final retention policy.

## Current State

- Records are stored in PostgreSQL when `DB_URL` / `DATABASE_URL` is configured.
- The app also stores some user-device state in browser localStorage / Android WebView storage.
- Account deletion requests are now stored in `account_deletion_requests`.
- Linked records are not automatically hard-deleted or anonymised.
- No scheduled cleanup worker currently purges expired OTP records, notifications, LawBot queries, receipts, bookings, tasks, SOS requests, legal source uploads, or audit logs.

## Proposed Retention Categories

| Category | Tables / storage | Proposed treatment | Notes before launch |
| --- | --- | --- | --- |
| Account data | `users` | Keep while account is active. On verified deletion request, disable/delete account profile where permitted and retain minimal tombstone/audit reference if required. | Needs final business/legal decision on deactivation vs hard deletion. |
| OTP verification records | `login_verifications` | Keep short-term only; periodically delete expired/consumed codes after a defined period. | Code stores hashes, not raw OTP, but cleanup should still be added. |
| Cases / case diary | `cases`, `case_updates` | Keep while service/account is active and for a legally approved post-service period. | May be legally sensitive; deletion may be restricted where service, dispute, or audit obligations remain. |
| Bookings and service requests | `bookings` | Keep for service fulfilment, payment reconciliation, dispute handling, and audit/tax needs. | Define exact retention once accounting and legal obligations are confirmed. |
| Legal SOS requests | `sos_requests` | Keep while request is active and for a limited legally approved period after closure. | High sensitivity; access should remain tightly role-controlled. |
| Draft requests / uploaded facts | Usually `bookings.payload`; possibly localStorage | Keep for service delivery and agreed post-service period; delete/anonymise on verified request unless retention is required. | If real document upload storage is added, add object-storage deletion workflow. |
| Missions / tasks / proof records | `tasks` | Keep for work assignment, proof review, payment/work hold, disputes, and audit. | Proof URLs/documents need separate storage retention policy if file storage is added. |
| Receipts and payment references | `receipts`, `bookings` payment fields, Razorpay IDs | Retain for accounting, audit, tax, refund, and dispute requirements. | Do not delete if required for payment/legal recordkeeping; consider minimisation/anonymisation where possible. |
| Notifications | `notifications` | Keep recent operational notifications; purge or archive after a defined period unless tied to disputes/audit. | Avoid storing sensitive facts in notification message bodies where possible. |
| LawBot queries and feedback | `lawbot_chats`, `lawbot_queries`, `lawbot_feedback` | Keep for user history and source-quality review; allow deletion/anonymisation on request unless retention needed. | Legal questions can be sensitive; consider shorter retention by default. |
| Legal source library | `legal_sources`, `legal_chunks` | Keep approved legal reference content while authorised; delete rejected/unauthorised uploads when no longer needed. | Must not retain licensed or confidential content without authority. |
| Audit logs | `audit_logs` | Retain for a defined audit/security period; do not silently alter original timestamps. | Deletion requests should generally not rewrite audit history. |
| Account deletion requests | `account_deletion_requests` | Retain as proof of request handling and accountability. | Admin/RNA should be able to review status without changing original request timestamp. |
| Browser/WebView localStorage | User device | Provide user-facing instructions to clear app/site data; app can clear its own local keys on logout/deletion workflow if added later. | Server-side deletion cannot guarantee removal from the user's device cache. |

## Recommended Implementation Roadmap

1. Add an account status field such as `users.status` and `users.deleted_at` instead of immediate hard deletion.
2. Add an admin/RNA deletion review action that records decision, reason, completed timestamp, and retained categories.
3. Add a cleanup job for expired OTP verification records.
4. Add a notification cleanup/archive job.
5. Add exportable receipt/deletion request reports for accountability.
6. Add a data minimisation review for notification messages, SOS payloads, draft payloads, and LawBot questions.
7. If document/object storage is added, implement file deletion and retention metadata at upload time.
8. Confirm retention periods with counsel for payments, tax/accounting, disputes, legal services, audit logs, and source library material.

## Public Policy Wording Guardrail

Until the roadmap is implemented, public wording should say that deletion is request-based and that certain records may be retained where required for legal, payment, fraud prevention, dispute resolution, audit, tax, accounting, or compliance purposes. Do not claim automatic deletion timelines unless a verified job exists.
