# Phase 1 Today — Compatibility Audit

## Existing model mapping

| Phase-1 term | Existing production model | Decision |
| --- | --- | --- |
| Matter | `cases` / `cases.id` | `cases.id` remains the authoritative `matter_id`; no rename is made. |
| Listed hearing | `cases.next_date` plus optional case payload fields | Today shows only cases whose recorded `next_date` equals the requested date. |
| Chamber | `chambers`, `chamber_members` | Owner and active member access is server-authorised. |
| Matter allocation | `case_assignments` | Preserved for long-lived matter access. |
| Hearing allocation | `case_hearing_assignments` | New additive, date-scoped record; it does not replace `case_assignments`. |
| Chamber work | `chamber_tasks` | Retained; not repurposed as an authoritative hearing record. |
| Audit | existing `writeAuditLog` | Used for assignment and acceptance. |

## Today endpoint

`GET /api/chamber/today` is a composed read model for the authenticated advocate. It returns real same-day listed matters, eligible verified chamber counsel, deterministic same-time clashes, and reliable attention records only.

`POST /api/chamber/today/hearings/:caseId/assign` is restricted to the Chamber Owner. It requires the matter’s recorded hearing date and an eligible verified advocate who is either the owner or an active associate.

`POST /api/chamber/today/hearings/:caseId/accept` is restricted to the assigned advocate.

## Explicitly not inferred

The current schema has no authoritative filing queue, draft-review queue, hearing-closure record, or travel-time model. The Today view therefore does not expose those counts or simulate them. Those will be added only in their respective Phase-1 steps.
