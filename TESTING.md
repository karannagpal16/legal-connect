# Testing Legal Connect

## Unit tests

```
pnpm test
```

## Test accounts (one per role)

`artifacts/api-server/scripts/seed-test-accounts.js` creates 7 accounts through the real
sign-up and admin-approval APIs: admin, two clients, a chamber owner advocate, an associate
(invited to and accepted into the owner's chamber), a proxy counsel, and an intern.

- Passwords are random on every run and are printed once.
- Emails use plus-addressing on `TEST_EMAIL_BASE` (default `legalconnect0s@gmail.com`), e.g.
  `legalconnect0s+lc-test-client@gmail.com`, so all test mail lands in the support inbox.
- Client and advocate identities are approved by the seed admin; the test chamber gets a
  30-day complimentary Chamber Pro entitlement (no fake payment record).
- It refuses to run against `legal-connect.in` / `onrender.com` unless you add `--allow-production`.

From your computer, using the database's *External* URL from Render:

```
cd artifacts/api-server
DATABASE_URL="<external database url>" API_URL="https://<your-staging>.onrender.com" \
  node scripts/seed-test-accounts.js --out lc.test-accounts.json
```

Remove all test accounts and their data:

```
DATABASE_URL="<external database url>" API_URL="https://<your-staging>.onrender.com" \
  node scripts/seed-test-accounts.js --cleanup
```

Sign in on the Login page, pick the role, and use email + password.

## End-to-end check (109 checks)

Needs the Razorpay **TEST-mode** key secret (never live keys) to sign test payments:

```
RAZORPAY_KEY_SECRET=<test secret> RAZORPAY_WEBHOOK_SECRET=<test webhook secret> \
  node scripts/e2e-smoke.js lc.test-accounts.json
```

It covers sign-in for every role, role boundaries, client bookings (free first chat once),
server-side prices, the ₹1 / cheap-order / reused-payment / fake-paid-record attacks, webhook
amount checks, chamber invites, the Chamber court day (assign → accept → close hearing), the
whole ProxyHub job (post, interest, assign, accept, conflict declaration, check-in, order-sheet
upload, LC verification, counsel review), and LC Admin supervision: the needs-attention queue,
suspensions, the unverified-advocate gate, SOS and deletion handling, and protected edits/deletes.

## LC Admin supervision (what the server enforces)

| Control | Where |
| --- | --- |
| Suspend / reactivate any account (reason required, sessions revoked, sign-in blocked) | `POST /api/admin/users/:id/suspend` · `/reactivate`, Users page |
| Advocates must be Bar-verified before paid or client work; admin can only assign verified advocates | `supervision.js` guard |
| One queue of everything waiting on LC | `GET /api/admin/supervision`, admin Overview |
| Legal SOS: acknowledge / resolve with a note | `GET /api/admin/sos`, `PATCH /api/admin/sos/:id` |
| Account deletion requests: review / done / refuse with a note | `PATCH /api/admin/deletion-requests/:id` |
| Counsel stage changes and client↔counsel messages go through LC | existing LC review + client↔LC channel |
| Paid bookings, paid missions and matters can't be deleted; payment fields can't be edited | booking / task / case routes |
| Every admin action above is audit-logged | `audit_logs` |

## Production settings to add on Render

- `MASTER_FREE_EMAILS` — family/tester accounts that get free access (they were removed from code).
- `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (and `S3_REGION`) — court-order uploads in Chamber Vault.
- Razorpay live keys + webhook secret, Resend (email OTP), as before.
