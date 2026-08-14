# Real eCourts & Order PDF Sync Engine

Agency-facing **Verified Court Updates** layer with Virtual Courtroom, milestone bar, AI order summaries, and cause-list aggregation.

Built on the compliance-first foundation:

- No CAPTCHA automation
- Provider abstraction (`fixture` / `official_link` / contracted commercial)
- Official source + freshness on every record
- Court records prevail disclaimer

## UI

- `ECourtsMirror.tsx` — CNR lookup, District / High Court / SCI tabs, demo CNR chips
- `VirtualCourtroomWidget` — live cause-list badge + room/item/ETA
- `StageMilestoneBar` — Filing → … → Judgment
- `OrderPDFViewerModal` — in-app fixture PDF stream + 3-bullet plain-language summary

Wired into:

- Case workspace → **eCourts Mirror** tab
- Advocate Case Tracker → mirror + today’s cause-list aggregator

## API aliases

```text
POST /api/court-sync/search-cnr
POST /api/court-sync/search-case
POST /api/court-sync/track
GET  /api/court-sync/cases
DELETE /api/court-sync/cases/:id
GET  /api/court-sync/orders/:id/pdf
POST /api/court-sync/orders/:id/ai
GET  /api/court-sync/status
```

Canonical routes under `/api/court-cases/*` remain supported.

## Driver

`services/court-sync/ecourts-driver.mjs`

- `parseCNR` — 16 alphanumeric
- `fetchLiveCNRData` — provider bridge (fixture by default)
- `fetchHighCourtData` / `fetchSupremeCourtData` — coverage-aware unsupported until contracted
- `summarizeOrderPlainLanguage` — deterministic 3-bullet summarizer

## Demo CNRs

- `DLCT010012342023` — live cause-list fixture (hearing today, Item #18, bail order PDF)
- `DLSA010012342024`
- `DLCT010098762023`

## Tests

```bash
node artifacts/api-server/court-sync/court-sync.test.js
node --check services/court-sync/ecourts-driver.mjs
node services/court-sync/index.js --once
pnpm build
```
