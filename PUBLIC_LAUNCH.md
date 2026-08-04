# Public launch checklist (Render only)

Host: `https://legal-connect.in` / `https://legal-connect-7ewz.onrender.com`  
Do **not** deploy to Vercel.

## Product flows live in code

### Flow A — Client advisory
OTP/login → Aadhaar approved → book counsel → (free first chat or paid) → LC assigns advocate → supervised engagement → optional LC Gateway retention.

### Flow B — ProxyHub escrow (fully furnished)
1. Advocate **Pay & post** (min ₹400) → funds **Locked**
2. Admin sees posted task → **assigns proxy** only after funds held
3. Proxy: conflict declare → day-of check-in → **upload order-sheet proof**
4. **Main counsel** reviews proof: **OK** or **Not OK + reason** (escrow stays held)
5. On Not OK → proxy re-uploads; on OK → LC Admin **releases net funds**
6. Release math: Gross − **10% platform** − **3% app/GST tax** = **net to proxy** (manual settlement, not automated Razorpay payout)

## Done in product code

- [x] Portal routers fixed
- [x] LawBot seeded / source-locked
- [x] Wipe endpoint locked unless `ALLOW_OPERATIONAL_RESET=true`
- [x] Master/owner login hidden from public (`/login?owner=1` only)
- [x] Aadhaar gate before booking + free first-chat race fixed
- [x] Admin notified on signup/login
- [x] Admin intake Case Cards with PDFs
- [x] ProxyHub post-task on advocate + admin dashboards
- [x] Main counsel proof OK / Not OK + reason
- [x] Escrow assign gate (funds must be held)
- [x] Taxed escrow release with settlement receipt
- [x] Direct advocate↔client chat stays supervised (no private hiring)

## You must confirm in Render dashboard (ops)

- [ ] Razorpay **live** keys (`RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET`)
- [ ] Confirm `/api/payments/config` → `mode: live`
- [ ] `ALLOW_MASTER_TEST_LOGIN=false` (owner desk still works via your real account password when login is enabled)
- [ ] One live paid advisory smoke + one ProxyHub paid post → assign → proof → counsel OK → release
- [ ] Upgrade off Render free plan if you need always-on
- [ ] Hard refresh all four portals after deploy

## Intentionally manual / gated

| Surface | Behavior |
|---------|----------|
| Proxy payout after release | Manual bank/settlement by Admin (receipt shows net after tax) |
| Wellness / rights / reminders / generic AI | DemoFeatureGate |
| Direct advocate↔client chat | SupervisedMessagingGate |
| LawBot | Answers only from approved chunks |
