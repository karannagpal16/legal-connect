# Legal Connect — Master Architectural Blueprint

Runtime implementation of Flows A/B, role workflows, state machines, and product APIs.

## Flow A — Advisory → LC Gateway retention

1. Client books a **1-time advisory** via `POST /api/consultations/book-advisory` (Counsel Intake UI).
2. Payment places fee in **Work Completion Hold** (`paid_escrow_hold`).
3. After the session: `POST /api/consultations/:id/complete-advisory` → `advisory_completed`.
4. Client (or assigned advocate) calls `POST /api/intakes/request-retention`.
5. Admin **LC Gateway** desk (Ops Command → LC Gateway tab) runs four one-click actions:
   - `start-review` → `lc_under_review`
   - `request-info` → documents requested
   - `quote-terms` → `terms_quoted`
   - `assign-panel` → `panel_lawyer_assigned`

**Hard rule:** Clients cannot hire an advocate directly in the app. Full court representation is LC Gateway only.

## Flow B — Proxy mission → escrow release

1. Advocate posts mission via existing `POST /api/tasks` (+ ProxyHub escrow payment).
2. Admin assigns proxy: `POST /api/admin/proxy-tasks/:id/assign-proxy` → `proxy_assigned_by_lc`.
3. Supervised inter-counsel Q&A: `POST|GET /api/proxy-tasks/:id/qa`.
4. Proof upload (existing task proof APIs) → LC verifies → posting counsel approves (or 24–48h auto-approval) → LC **split-settles**:
   ProxyHub merchant share (flat technology fee + GST) and the appearing advocate's professional fee.
   Legal Connect is the lock layer; ProxyHub is the KYC merchant. Gross is never transferred to ProxyHub first.

## State machines

| Machine | States |
|---|---|
| Consultation | `draft` → `paid_escrow_hold` → `advisory_in_progress` → `advisory_completed` |
| Retention | `requested` → `lc_under_review` → `terms_quoted` → `panel_lawyer_assigned` |
| Proxy task | `escrow_paid` → `pending_admin_review` → `proxy_assigned_by_lc` → … → `proof_approved` → `escrow_released` |

Inspect live contracts: `GET /api/blueprint/meta`.

## Product APIs

| Method | Path | Role |
|---|---|---|
| POST | `/api/consultations/book-advisory` | Client |
| POST | `/api/consultations/:id/complete-advisory` | Client / Admin |
| POST | `/api/intakes/request-retention` | Client / Advocate / Admin |
| POST | `/api/admin/gateway/retention/:id/{start-review\|request-info\|quote-terms\|assign-panel}` | Admin |
| POST | `/api/tasks` | Advocate (existing) |
| POST | `/api/admin/proxy-tasks/:id/assign-proxy` | Admin |
| POST/GET | `/api/proxy-tasks/:id/qa` | Advocates + Admin |
| POST | `/api/admin/legal-sources/seed` | Admin |

Module: `artifacts/api-server/master-blueprint.js` (wired in `server.js`).

## Portal surfaces

- **Client:** 1-time advisory booking, no-direct-hiring disclaimer, LC Gateway retention CTA, LawBot.
- **Advocate:** Advisory Session Desk (`/advocate/bookings`), retention trigger, ProxyHub, Chamber Vault.
- **Admin:** Ops Command tabs — Intakes, **LC Gateway**, Proxy Missions (+ supervised Q&A), **LawBot Seeder**.
- **Intern:** Chamber Quests / XP (existing Intern Hub; unchanged by this blueprint).

## Hosting

Render only (`render.yaml` auto-deploys `main`). Do not deploy this app to Vercel.
