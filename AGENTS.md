# AGENTS.md

## Cursor Cloud specific instructions

This is a pnpm workspace monorepo for **Legal Connect** (a React SPA + Express API). The
update script already runs `pnpm install`, so dependencies are present when you start.

### Services

| Service | Package / dir | Dev start | Port |
| --- | --- | --- | --- |
| API server (Express; also serves built SPA) | `artifacts/api-server` | `pnpm dev:api` (`node artifacts/api-server/server.js`) | 5000 |
| Web frontend (Vite React SPA) | `artifacts/law-firm` | `pnpm dev:web` | 5173 |

Run both together with the root `pnpm dev` (see caveat below). The web dev server proxies
`/api` to the API server.

### Running the full stack (important caveat)

The committed `artifacts/api-server/.env` sets `PORT=5000`, but the Vite dev proxy defaults
to `http://127.0.0.1:3000`. Start the stack with the proxy target aligned to 5000:

```
API_PROXY_TARGET=http://127.0.0.1:5000 pnpm dev
```

Do NOT export a global `PORT` to fix this — Vite also reads `PORT` for its own listen port,
so setting it globally makes Vite and the API collide. Use `API_PROXY_TARGET` instead.

### Database

`artifacts/api-server/.env` contains a `DATABASE_URL` pointing at a remote Render Postgres
that is not reachable from the cloud VM. On startup the API logs
`Database mode: local fallback` and serves from an in-memory demo store. This is expected and
fine for development — the app is fully usable without a database. Do NOT run
`pnpm --filter db push` (or `scripts/post-merge.sh`) in the cloud VM; it targets that remote
DB and needs connectivity you don't have.

### Auth / demo accounts (needed to exercise core APIs)

CRUD resources (`/api/cases`, `/api/tasks`, `/api/users`, ...) require login. In dev there are
built-in demo accounts with a fixed OTP `123456`:

- `client@demo.legal-connect.in` (client portal)
- `lawyer@demo.legal-connect.in` (advocate portal)
- `intern@demo.legal-connect.in` (intern portal)

Login flow: `POST /api/auth/request-code` → `POST /api/auth/verify-code` (code `123456`) →
`POST /api/auth/login` (returns a token). Authenticated API calls use
`Authorization: Bearer <token>`. A master test login is also enabled in non-production.
Health check: `GET /api/healthz`.

### Lint / test / build

- No repo-wide lint or root test runner exists.
- Backend tests use Node's built-in runner: `node --test artifacts/api-server/__tests__/portal-auth.test.js`.
- Typecheck (frontend): `pnpm --dir artifacts/law-firm typecheck`.
- Build (SPA + `node --check` of backend): `pnpm build`. Output goes to
  `artifacts/api-server/public` (SPA is served by the API in production via `pnpm start`).
