# Public launch checklist (Render only)

Host: `https://legal-connect.in` / `https://legal-connect-7ewz.onrender.com`  
Do **not** deploy to Vercel.

Phase 1 is a **litigation workspace**: authentication, Case Diary, Proxy Hub, tasks, Work Completion Hold, source-locked LawBot, intern workspace, and payments.

## Product flows live in code

### Flow A — Client advisory
Password login → identity check → book counsel → (free first chat or paid) → Legal Connect assigns an independent advocate → supervised engagement → optional LC Gateway retention.

### Flow B — Proxy Hub (Work Completion Hold)
1. Advocate **Pay & post** → funds **Locked** on a Work Completion Hold
2. Admin sees the posted task → **assigns proxy** only after the hold is active and payment is verified
3. Proxy: conflict declare → day-of check-in → **upload order-sheet proof**
4. **Main counsel** reviews proof: **OK** or **Not OK + reason** (hold stays locked)
5. On Not OK → LC opens a dispute; refund goes to the posting advocate's original payment method. On OK (or 24–48h auto-approval) → LC **split-settles**
6. Direct split (never gross-to-ProxyHub-then-payout): **ProxyHub merchant share** (flat technology fee + GST) → ProxyHub company current account; **professional fee** → appearing advocate's verified bank account. Each booking has a unique `booking_id` and stays `LOCKED` until that split.

## Done in product code

- [x] Portal routers fixed
- [x] LawBot source-locked (answers only from approved chunks)
- [x] Wipe endpoint locked unless `ALLOW_OPERATIONAL_RESET=true`
- [x] Master/owner login hidden from public (`/login?owner=1` only); Admin is not a public role picker
- [x] Aadhaar gate before booking + free first-chat race fixed
- [x] Admin notified on signup/login
- [x] Admin intake Case Cards with PDFs
- [x] ProxyHub post-task on advocate + admin dashboards
- [x] Main counsel proof OK / Not OK + reason
- [x] Work Completion Hold assign gate (locked + payment verified)
- [x] LC payment-lock layer + ProxyHub merchant split settlement (signed webhooks)
- [x] Direct advocate↔client chat stays supervised (no private hiring)
- [x] Unofficial eCourt tracker and judge roster retired (Coming Soon)
- [x] Disclaimer and Contact pages live
- [x] User-facing copy says Work Completion Hold, not escrow

## You must confirm in Render dashboard (ops)

- [ ] PostgreSQL `DATABASE_URL` connected (production refuses API work without it)
- [ ] Razorpay **live** keys (`RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET`)
- [ ] ProxyHub merchant: `PROXYHUB_RAZORPAY_ACCOUNT_ID` (Route linked account), `PROXYHUB_BANK_IFSC`, `PROXYHUB_BANK_ACCOUNT_LAST4`, optional `PROXYHUB_WEBHOOK_URL` / `PROXYHUB_WEBHOOK_SECRET`
- [ ] Confirm `GET /api/payments/config` → `mode: live`
- [ ] `ALLOWED_ORIGINS=https://legal-connect.in,https://www.legal-connect.in`
- [ ] `ALLOW_MASTER_TEST_LOGIN=false`
- [ ] Seed LawBot approved sources; admin `/api/health` shows `legal_chunks_count > 0`
- [ ] One live paid advisory smoke + one Proxy Hub paid post → assign → proof → counsel OK → release
- [ ] Upgrade off Render free plan if you need always-on
- [ ] Hard refresh all four portals after deploy

## Intentionally hidden / Coming Soon

| Surface | Behavior |
|---------|----------|
| `/client/cases` fake eCourt tracker | Coming Soon — authorized court status |
| `/advocate/judges` sample roster | Coming Soon — not an official roster |
| `/court-radar` | Coming Soon |
| Wellness / rights / reminders / generic AI | DemoFeatureGate |
| Direct advocate↔client chat | SupervisedMessagingGate |
| LawBot | Answers only from approved chunks; refuses otherwise |
| Proxy payout after release | LC split settlement: ProxyHub merchant share + proxy fee. Queued until Razorpay Route linked accounts are set |
| Panel expansion / public lawyer discovery | Held pending BCI guidance — see `docs/compliance/` |
