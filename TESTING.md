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

## End-to-end check (59 checks)

Needs the Razorpay **TEST-mode** key secret (never live keys) to sign test payments:

```
RAZORPAY_KEY_SECRET=<test secret> RAZORPAY_WEBHOOK_SECRET=<test webhook secret> \
  node scripts/e2e-smoke.js lc.test-accounts.json
```

It covers sign-in for every role, role boundaries, client bookings (free first chat once),
server-side prices, the ₹1/ cheap-order/ reused-payment attacks, webhook amount checks,
chamber invites, and the whole ProxyHub job: post, interest, assign, accept, conflict
declaration, check-in, order-sheet upload, LC verification and counsel review.
