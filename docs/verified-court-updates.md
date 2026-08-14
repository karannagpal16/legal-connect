# Verified Court Updates

Compliance-first court data integration for Legal Connect. **Not** an eCourts scraper.

## Product promise

- Feature name: **Verified Court Updates** (not “real-time” unless a contracted provider supplies webhooks).
- Every record shows: official source link, last successful sync, freshness (`Live` / `Updated today` / `Stale` / `Sync unavailable`), hearing confirmed vs scheduled, and the court-records-prevail disclaimer.
- Provider priority: approved commercial/institutional API → expressly permitted court feeds → manual official-link verification.
- **No CAPTCHA automation or bypass.**

## MVP scope (this release)

District Court **CNR** tracking through the **fixture** provider (demo) or `official_link` (manual verification), with:

- Search → preview → idempotent track
- Append-only snapshots + semantic change events
- Manual refresh (rate-limited, queued `202`) + worker due-job processing
- Official order links (no arbitrary URL fetch / SSRF)
- Advocate tracker + case-workspace Official Court Status panel

High Courts, Supreme Court, cause-list polling, SMS, and document storage follow after Phase 0 provider sign-off.

## Environment

| Variable | Default | Notes |
|---|---|---|
| `COURT_DATA_PROVIDER` | `fixture` | `fixture` \| `official_link` \| `commercial` (unsupported until contracted) |
| `POLL_FREQ_MIN` | `30` | Worker poll interval |
| `COURT_SYNC_BATCH_SIZE` | `25` | Cases claimed per cycle |
| `DATA_ENCRYPTION_KEY` | — | Encrypts raw provider payloads at rest |

## API

```text
GET    /api/court-sync/status
POST   /api/court-cases/search
POST   /api/court-cases/track
GET    /api/court-cases
GET    /api/court-cases/:caseId
POST   /api/court-cases/:caseId/sync      → 202 Accepted
DELETE /api/court-cases/:caseId/tracking
GET    /api/court-cases/:caseId/events
GET    /api/court-cases/:caseId/orders
GET    /api/court-orders/:orderId/download
```

CNR validation: exactly **16 alphanumeric** characters after removing spaces/hyphens.

## Worker

```bash
cd services/court-sync
node index.js --once   # process due jobs once
node index.js          # loop
```

Uses `FOR UPDATE SKIP LOCKED` when Postgres is available; memory fallback for local demo.

## Demo CNRs (fixture provider)

- `DLSA010012342024`
- `DLCT010098762023`

## Tests

```bash
node artifacts/api-server/court-sync/court-sync.test.js
```

## Release gates (before public tracking)

- Provider agreement permits intended use
- No CAPTCHA automation present
- Supported courts documented
- Authorization + duplicate-notification tests pass
- Source + freshness on every displayed record
- PDF handling security checks (when storage enabled)
- Provider outage does not break the rest of Legal Connect
