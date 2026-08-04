# Legal Connect — Perfect Ops Implementation Plan

Host: Render only (`legal-connect.in`). No Vercel.

## Product principles

1. **Mobile OTP** is the primary identity gate to connect with Legal Connect.
2. **Aadhaar approved by LC** is required before booking counsel.
3. Clients never hire advocates directly — **LC assigns** and **LC supervises**.
4. Booking creates a structured **Case Card** for Admin Ops.
5. After assign, client + advocate meet in an **LC Consultation Room** (chat/call/video).
6. ProxyHub: advocate posts → LC reviews → LC assigns proxy → Q&A only via LC.

---

## Phase 1 — Booking reliability + Case Card (NOW)

Goal: free/paid booking never dies with a generic 500; Admin sees a complete case card.

- [x] Free first-chat path: skip second payment call when already activated
- [x] `create-order` idempotent for already-paid free bookings
- [x] Aadhaar hard-gate before `book-advisory` (server) + Client CTA / CounselIntake (UI)
- [x] Admin notify on signup + login
- [x] Admin intake card shows case name, client, opposite party, notes, PDFs, channel, status
- [ ] Smoke: free chat + paid call + PDF upload on production

## Phase 2 — Identity-first access

- [ ] Mobile OTP primary login (Twilio SMS)
- [ ] Email OTP remains backup
- [ ] Login/signup always pings Admin Ops desk
- [x] Client “Book counsel” CTA blocked until Aadhaar = approved/verified

## Phase 3 — LC Consultation Room

- [ ] After Admin assign, open room by channel (chat first)
- [ ] Advocate + client participate; LC can audit
- [ ] Call/Video = scheduled room stubs → real RTC later
- [ ] Keep `SupervisedMessagingGate` (no unsupervised private chat)

## Phase 4 — ProxyHub polish

Already structurally live. Remaining UX:

- [ ] Advocate ProxyHub clearly shows “Awaiting LC review”
- [ ] Admin Proxy tab assignment + supervised Q&A (done)
- [ ] Proof → approve → work-hold release (done; manual settlement)

## Phase 5 — Public paid launch

- [ ] Razorpay **live** keys (`rzp_live_…`)
- [ ] Webhook secret on `/api/payments/webhook`
- [ ] Confirm `/api/payments/config` → `mode: live`
- [ ] One real payment smoke test
- [ ] `ALLOW_MASTER_TEST_LOGIN=false`

---

## Status machine (booking)

`draft` → `paid_escrow_hold` → `lc_under_review` → `advocate_assigned` → `advisory_in_progress` → `advisory_completed`  
Optional: `request_retention` → Gateway retention machine.

## API contracts touched in Phase 1

| API | Change |
|---|---|
| `POST /api/consultations/book-advisory` | Aadhaar gate; free path returns `paymentRequired:false`; notify hardened |
| `POST /api/payments/create-order` | Idempotent if booking already paid |
| `POST /api/auth/strict/register` | Notify admins |
| `POST /api/auth/strict/login` | Notify admins |
| `POST /api/auth/login` | Notify admins |
| `GET /api/admin/intakes` | Attachments + case-card fields |
| `GET /api/bookings/attachments/:id/download` | Admin/client secure PDF download |
| Client `CounselIntake` | KYC gate + free-path skip order + soft-fail uploads |
| Client Home | Book CTA blocked until Aadhaar approved |
| Admin Ops Desk | Richer intake case card UI |
