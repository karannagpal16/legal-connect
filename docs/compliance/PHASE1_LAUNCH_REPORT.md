# Legal Connect Phase-1 launch report

This is the engineering record for the Phase-1 production pass. It is not a claim that Render
environment variables or live Razorpay keys are already set — those remain ops steps.

## 1. What was inspected

Frontend (`artifacts/law-firm/src`), Express API (`artifacts/api-server`), PostgreSQL schema
(`artifacts/api-server/db.js`), authentication and RBAC, Proxy Hub / Work Completion Hold, Case
Diary, LawBot source lock, Razorpay webhooks, legal pages, `render.yaml`, `.env.example`,
`PUBLIC_LAUNCH.md`, and existing unit tests.

## 2. What was fixed

- Unofficial eCourt tracker (`/client/cases`) and sample judge roster (`/advocate/judges`) retired
  to Coming Soon screens. `/court-radar`, `/disclaimer` and `/contact` added.
- Public login no longer offers Admin; Home no longer links “Admin access”. Owner desk remains
  `/login?owner=1`.
- Proxy assignment requires an active Work Completion Hold **and** verified payment. Amount alone
  is not enough. The Control Desk no longer falls back to `/api/tasks/:id/accept` to skip that gate.
- LawBot feedback requires a logged-in user and binds `userId` to the session.
- Public `/api/health` now states `lawbot: "source-locked"` without leaking source counts.
- User-facing “escrow” copy replaced with Work Completion Hold.
- `PUBLIC_LAUNCH.md` updated to the flat-fee model and the hidden-surface list.

## 3. What was already working

- JWT sessions with live DB role reload (stale admin tokens cannot stay admin).
- Demo login and demo OTP blocked in production.
- Production fail-closed without `DATABASE_URL` and a dedicated `SESSION_SECRET`.
- LawBot answers only from `status = 'approved'` chunks and refuses when none match.
- Razorpay webhook HMAC required in production; secrets are redacted from logs.
- Case Diary CRUD (`MyDiary` + `/api/cases`) with owner/admin authorization.
- Supervised messaging gate on direct client↔advocate chat.
- DemoFeatureGate already hid wellness, rights, generic AI, and intern AI.

## 4. What was intentionally not changed

- Razorpay integration architecture (order → verify → webhook).
- Chamber Vault SaaS subscriptions.
- Intern XP / quests / leaderboard (training, not advocate advertising).
- The court-sync worker remains a documented mock and is not marketed as live.
- No new court scraping, CIS access, or unofficial live board.
- No second database, no rewrite of working modules.

## 5. Features hidden / Coming Soon

| Surface | Status |
|---|---|
| `/client/cases` unofficial tracker | Coming Soon |
| `/advocate/judges` sample roster | Coming Soon |
| `/court-radar` | Coming Soon |
| Wellness, rights feed, legal guide, reminders, generic AI | Gated |
| Public lawyer directory / ratings / paid leads | Not built; prohibited |
| Panel expansion for institutions | Held pending BCI guidance |

## 6. Security issues found and fixed

| Issue | Fix |
|---|---|
| Assign proxy if `amount > 0` even without a hold | `isWorkHoldActive` requires locked hold + verified payment |
| Control Desk `/accept` fallback skipped the hold gate | Fallback removed; `/accept` now uses the same gate |
| Unauthenticated LawBot feedback writes | 401 + session-bound user id |
| Public Admin role picker | Hidden unless owner desk unlocked |
| Misleading unofficial court UI | Replaced with Coming Soon |

## 7. Database changes

None. No destructive migrations. New service-record table creation remains additive (from the
compliance commit) and is `CREATE TABLE IF NOT EXISTS`.

## 8. API changes

| Endpoint | Change |
|---|---|
| `POST /api/admin/proxy-tasks/:id/assign-proxy` | Hold gate tightened (`WORK_HOLD_REQUIRED`) |
| `POST /api/tasks/:id/accept` | Same hold gate |
| `POST /api/lawbot/feedback` | Auth required |
| `GET /api/health` | Public payload includes `lawbot: "source-locked"` |
| `GET /api/compliance/policy` | Unchanged from compliance commit |
| `POST /api/tasks/:id/rate` | Still HTTP 410 (compliance commit) |
| `POST /api/tasks/:id/service-record` | Operational record (compliance commit) |

## 9. Tests executed

```text
node artifacts/api-server/compliance-policy.test.js   OK
node artifacts/api-server/work-hold.test.js           OK
node artifacts/api-server/launch-readiness.test.js    OK
node artifacts/api-server/security.test.js            OK
node artifacts/api-server/identity-vault.test.js      OK
node artifacts/api-server/__tests__/portal-auth.test.js  3/3 pass
```

Live smoke (`NODE_ENV=development PORT=4599`):

- `GET /api/health` → `{ ok, status, app, db, lawbot: "source-locked" }`
- `GET /api/healthz` → `{ ok, status, app, started_at }`
- `POST /api/lawbot/feedback` unauthenticated → 401
- `POST /api/lawbot/query` unauthenticated → 401
- Authenticated LawBot on “What is the capital of France?” → source-locked refusal, empty citations
- `POST /api/admin/proxy-tasks/:id/assign-proxy` on an unlocked demo task → 409 `WORK_HOLD_REQUIRED`

## 10. Production build

`pnpm install --frozen-lockfile && pnpm run build` — succeeded (Vite production bundle + Node syntax checks of API and workers).

## 11. Remaining blockers (ops, not code)

1. Live `DATABASE_URL` on Render.
2. Live Razorpay keys + webhook secret; smoke one paid advisory and one Proxy Hub mission.
3. Seed approved LawBot sources so production answers are not all refusals.
4. `ALLOWED_ORIGINS` set to the production hostnames.
5. Independent counsel sign-off on Privacy / Terms / Refund (pages still carry a draft banner).
6. Independent professional-conduct opinion before dispatching the BCI representation
   (`docs/compliance/`).

## 12. Recommendation

**NOT READY — BLOCKED BY ops configuration (database, Razorpay live keys, LawBot seed) and
counsel sign-off on legal pages.**

The application code for Phase 1 is launch-hardened. Do not flip the site to paid public traffic
until the six items in §11 are done. After those, the recommendation becomes **READY FOR
PRODUCTION**.
