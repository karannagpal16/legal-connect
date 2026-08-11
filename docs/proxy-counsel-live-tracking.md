# Proxy counsel live tracking — product plan

## The story (Isha → Ayush)

| Step | Who | What admin sees |
|------|-----|-----------------|
| 1 | Main counsel **Isha** (practice **Dwarka**) | Posts paid mission at **Saket** · escrow locked |
| 2 | Legal Connect | Acknowledges posting · assigns **Ayush** (practice **Saket**) |
| 3 | Proxy **Ayush** | Accepts mission · conflict declare · check-in · uploads order-sheet proof |
| 4 | Legal Connect | Verifies proof · forwards to Isha |
| 5a | Isha **satisfied** | Admin chooses **Release funds** or **Refund** |
| 5b | Isha **not satisfied** (+ reason) | Admin acknowledges reason · **Refund** to main counsel |
| 6 | On release | Gross − 10% platform − 3% tax/GST = **net to proxy** (manual settlement this release) |

## Roles

- **Main counsel** — pays, writes passover notes, reviews proof (satisfied / not + reason).
- **Proxy counsel** — accepts assignment, appears, uploads proof. Cannot self-claim paid missions.
- **Legal Connect Admin** — assigns by court match + interest, verifies proof, settles release or refund.

## Live track (always visible)

```
Main counsel Isha · Dwarka
  → Task posted at Saket (escrow locked)
  → LC acknowledged & assigned
  → Proxy Ayush · Saket · accepted
  → Proof uploaded → LC verified
  → Isha satisfied | not satisfied (+ reason)
  → Funds released (net ₹…) | Refunded
```

## Money rules (publish-safe)

- Escrow stays **Locked** until Admin release or refund.
- Release writes settlement split (87 / 10 / 3) and marks hold **Released**.
- Refund marks hold **Refunded** — Razorpay refund remains **manual** until payout APIs are enabled.
- UI and receipts must never claim automated bank credit.

## Publish loose ends (checklist)

### Critical before public traffic
1. Rotate Postgres + `SESSION_SECRET`; keep `DATA_ENCRYPTION_KEY` stable once vault is live.
2. Production Resend + Razorpay live keys + webhook secret.
3. Remove or lock master password / demo OTP paths for non-owners.
4. One E2E: post → assign → accept → proof → counsel OK → release.

### High (this ship)
- Counsel live track with practice courts on every mission card (admin + parties).
- Explicit proxy accept step.
- Satisfied → Admin **Release | Refund**; Not satisfied → Admin **Acknowledge & refund**.
- Assign picker prefers advocates whose practice courts match mission court.

### Medium (next)
- Automated Razorpay refund / RazorpayX payout.
- Scheduled no-appearance scan worker.
- Hide or label mock Connect Chat / sample case trackers / mock revenue chart.
- Full env matrix in `.env.example`.
