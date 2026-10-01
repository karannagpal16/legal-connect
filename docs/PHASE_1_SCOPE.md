# Legal Connect — Phase 1 Scope Lock

## Mission

Legal Connect Phase 1 is a **Litigation Operating System** for operating the chamber court-day workflow from matter allocation to hearing closure, next-date capture, chamber work, draft approval, and filing.

## Core loop

```text
Today's Matters
→ Assignment
→ Hearing
→ Hearing Closure
→ NDOH
→ Next Action
→ Draft
→ Review
→ Approval
→ Filing
→ Next Hearing
```

Every Phase-1 feature must materially support this loop.

## Active modules

### Advocate / Chamber

1. Today
2. Chamber Command
3. Matters
4. Case Diary
5. Draft & Filing Room
6. Proxy Hub
7. LawBot / Legal Library
8. Notifications
9. Profile / Chamber Settings

### Client

1. My Matters
2. Case Updates
3. Book Counsel
4. Legal SOS Request
5. Documents
6. Payments
7. Notifications

### Intern

1. Assigned Work
2. Drafting Tasks
3. Research Tasks
4. Deadlines
5. XP / Rewards
6. Legal Library

### Admin

1. Users
2. Chambers
3. Advocate Verification
4. Proxy Hub
5. Payments
6. LawBot Sources
7. Grievances
8. Audit Logs
9. System Health

## Matter is the system of record

`matter_id` is the mandatory parent for hearing records, next dates, orders, chamber membership and assignments, tasks, drafts, applications, filing, client updates, documents, proxy work, and audit history.

Do not create disconnected records for a draft, filing, proxy, hearing, or case. New objects must reference an authorised matter.

## Matter states

- Active
- Next Hearing Scheduled
- Action Required
- Awaiting Filing
- Awaiting Order
- Order Reserved
- Disposed

Alerts are separate from state so the state machine remains small and clear.

## Roles

| Role | Phase-1 authority |
| --- | --- |
| Chamber Owner / Senior Advocate | Create and view chamber matters; allocate hearings; assign work; review drafts; approve filing; manage members and permissions; view audit history. |
| Associate | Access permitted matters; attend hearings; enter NDOH; upload orders; create tasks; supervise interns; review authorised drafts; complete filing. |
| Intern | Access assigned tasks only; upload research and drafts; receive corrections and upload revisions. Cannot approve filings, alter official hearing history, or view unrestricted chamber data. |
| Filing / Clerk | Future restricted filing queue: acknowledgements, filing numbers, and objections only. |

Server-side authorisation is authoritative. UI visibility never grants a capability.

## AI safety principle

> AI may extract, summarise and suggest. AI may not independently modify verified matter records, approve drafts, determine final legal strategy, release payments, or create authoritative court deadlines. An authorised chamber member must confirm material extracted by AI before it becomes verified matter data.

All material uses one provenance label:

- **Verified** — confirmed by an authorised user
- **Manual** — entered by a user, pending verification where applicable
- **AI Suggested** — never authoritative until confirmed

## Deferred modules

Do not delete deferred work. Keep it unavailable in production through the existing launch-feature configuration / feature flags, with a clear `COMING SOON` treatment where it is intentionally discoverable.

- Chamber Huddle / video conference
- Court Radar
- Full automated eCourts sync and live courtroom tracking
- Wellness
- Rights Feed
- Intern AI
- Advanced client AI
- Advanced native mobile flows

## Advocate navigation

```text
Today · Matters · Diary · Chamber · Drafts & Filing · Proxy Hub · Law · Notifications · Profile
```

`Law` contains LawBot, Bare Acts, judgments, and the Legal Library. `Chamber Command` is people and workflow; `Chamber Vault` is documents: pleadings, orders, evidence, applications, drafts, research, and client documents.

## Delivery order

1. Today / Start My Court Day
2. Matter
3. Hearing and NDOH
4. Chamber Command and assignments
5. Tasks
6. Drafts, review, approval, and filing

No broad redesigns or feature expansion are permitted before the relevant step is designed, implemented, and tested.
