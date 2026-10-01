# Phase 1 — Hearing Closure and NDOH Audit

## Scope

This implementation adds a manual, advocate-only hearing closure flow to the
existing Chamber Command Today board. It does not add AI, OCR, client-facing
hearing notices, automatic scheduling, or new matter identifiers.

## Existing model reuse

`cases.id` remains the matter identifier. `case_hearing_assignments` remains
the single assignment record for a matter and hearing date. `chamber_tasks`
is reused for optional post-hearing follow-up work. Existing notifications and
audit logging are reused for assigned work and material hearing changes.

`case_updates` was deliberately not reused: it is a client-facing Legal
Connect review queue and cannot safely store internal chamber directions or
operational hearing history.

## New operational ledger

`case_hearing_updates` is an append-only operational ledger keyed to the
existing matter, chamber, and hearing assignment. It records manual outcome,
NDOH, purpose, court directions, internal note, order status, author and
timestamp. Corrections create a new record with `supersedes_id`; the earlier
record is retained for history and audit.

The Today read model exposes only safe operational status, outcome and NDOH.
Internal notes and court directions are not sent in its response.

## Access and workflow

Only the assigned advocate or chamber owner may record a closure. The owner
may assign only verified advocates; a resulting follow-up can be assigned
only to an active chamber member. The UI requires an explicit review and
confirm step before submitting the manual record.

For a pass-over, the advocate can mark the day as still in progress; this
keeps the assignment `in_court` rather than completing it. A disposed matter
cannot receive an NDOH.
