# Legal Connect — Product Strategy (execution notes)

Source brief summarized for the engineering repo. Full narrative lives with product; this file tracks what shipped in the buildout.

## ProxyHub 5-layer transparency

1. **Posting** — CNR, room, passover script, appearance type, hearing date mandatory; Rule 36 copy guard
2. **Acceptance** — conflict of interest declaration digitally recorded + audit logged
3. **Day-of** — check-in opens proof upload window; missing check-in triggers no-appearance alerts
4. **Proof** — order sheet SHA-256 hash prevents reuse; Admin review required before escrow unlock
5. **Client visibility** — `notify()` fan-out at each layer, including urgent “No appearance recorded today”

## Top-10 build status

| # | Item | Implementation |
|---|---|---|
| 1 | ProxyHub proof gate + client visibility | `strategy-features.js` task lifecycle + ProxyHub UI |
| 2 | 360° Notification Engine | `notify()` + PortalLayout bell |
| 3 | Transparency Ledger | `GET /api/public/transparency` + `/transparency` |
| — | LC-supervised case updates | `POST/GET /api/cases/:id/updates`, admin approve/return desk |
| — | Public legal pages | `/privacy`, `/terms`, `/refund` |
| — | Developer account | `karannagpal16@gmail.com` — free unlock on all portals |
| 4 | Case Health Score | computed in workspace enrichment + `/api/cases/:id/health` |
| 5 | Cloudinary documents | `POST /api/cases/:id/documents` with Cloudinary when configured |
| 6 | Grievance Redressal | `/api/grievances` + `/client/grievance` |
| 7 | Terms of Engagement | `/api/engagements/*` + `/client/engagement` |
| 8 | NDOH WhatsApp reminders | `reminder_jobs` + `/api/reminders/ndoh/*` + notify-worker |
| 9 | Bar Council Rule 36 guard | `assertRule36Safe` + `/api/compliance/rule36` |
| 10 | ProxyHub bi-directional ratings | `/api/tasks/:id/rate` + ProxyHub UI |

## Fee split (ledger)

- Advocate 87%
- Platform 10%
- Gateway + GST 3%
