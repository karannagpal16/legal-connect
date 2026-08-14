# Court Sync Deployment Notes

Legal Connect presents **Verified Court Updates** inside the custom UI with official source attribution and freshness badges. Do not copy government app screens or flows. Do not automate CAPTCHA.

See [verified-court-updates.md](./verified-court-updates.md) for the full architecture, API, and release gates.

## Render Services

1. API Server — `artifacts/api-server` · `node server.js`
2. Court Sync Worker — `services/court-sync` · `node index.js`
3. Notify Worker — `services/notify-worker` · `node index.js`

## Current mode

- Default provider: `COURT_DATA_PROVIDER=fixture` (deterministic demo CNRs).
- `official_link` stores CNR + official eCourts status URL for manual verification.
- `commercial` returns `unsupported` until a vendor is contracted (coverage, redistribution, SLA, DPDP).
- Worker processes database-backed due jobs (or in-memory fallback), not the old demo array.

## Required before live courts

- Signed provider coverage matrix and permitted-use confirmation
- Sample payloads per court category
- Retention / deletion policy for snapshots, alerts, and documents
- Cost model (per lookup / per tracked case)
