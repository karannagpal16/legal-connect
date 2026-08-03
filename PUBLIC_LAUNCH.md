# Public launch checklist (Render only)

Host: `https://legal-connect.in` / `https://legal-connect-7ewz.onrender.com`  
Do **not** deploy to Vercel.

## Done

- [x] Portal routers fixed (no nest path-doubling 404s)
- [x] LawBot seeded (10 approved sources / 10 chunks) — re-run with `node artifacts/api-server/scripts/seed-lawbot-sources.mjs`
- [x] Wipe endpoint locked unless `ALLOW_OPERATIONAL_RESET=true`
- [x] Master card default **off** in production (`ALLOW_MASTER_TEST_LOGIN=false`)
- [x] Demo / unfinished surfaces stay gated (wellness, rights feed, reminders, generic AI, direct chat)

## You must confirm in Render dashboard

- [ ] Razorpay **live** keys (`RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET`)  
  Current production is **TEST** (`rzp_test…`). Real UPI will fail until live keys are set.
- [ ] Env `ALLOW_MASTER_TEST_LOGIN=false` present (blueprint updated; verify dashboard if service was created earlier)
- [ ] Upgrade Render plan off **free** if you need always-on (no cold starts)
- [ ] Hard refresh + click-through all four portals after deploy

## Intentionally not live yet

| Surface | Behavior |
|---------|----------|
| Wellness / rights / reminders / generic AI | DemoFeatureGate |
| Direct advocate↔client chat | SupervisedMessagingGate → LC supervised path |
| LawBot | Source-locked; answers only from approved chunks |
