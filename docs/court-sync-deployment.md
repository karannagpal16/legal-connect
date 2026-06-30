# Court Sync Phase 1 Deployment Notes

Legal Connect should keep using official eCourts Services data only through permitted access, then present it inside the custom Legal Connect UI as cards, reminders, timelines and mission triggers. Do not copy government app screens or flows.

## Render Services

1. API Server
   - Folder: `artifacts/api-server`
   - Start: `node server.js`
   - Purpose: static app, demo bookings, LawBot mock endpoint, case tracking endpoints.

2. Court Sync Worker
   - Folder: `services/court-sync`
   - Start: `node index.js`
   - Purpose: poll tracked cases every 6 hours and create case update events.

3. Notify Worker
   - Folder: `services/notify-worker`
   - Start: `node index.js`
   - Purpose: consume case update events and prepare web push, email and SMS notifications.

## Required Real-Mode Permissions

- Official eCourts Services access route and permitted endpoint documentation.
- Database URL for persisted cases, bookings, missions and reminders.
- Redis URL or PostgreSQL NOTIFY/LISTEN for queue delivery.
- Web Push VAPID public/private keys.
- SendGrid or equivalent email key.
- SMS provider key if SMS reminders are required.
- Razorpay keys only when real escrow/payment flow is enabled.

## Demo Endpoints

- `POST /api/cases`
- `GET /api/cases/:id`
- `POST /api/cases/:id/complete`
- `GET /api/case-updates`
- `POST /api/notify/test`

## Current Limitation

This is a Phase 1 mock/demo bridge. It does not fetch live court records, does not send real notifications, and does not trigger real payments. Real mode starts after official access, database, queue and provider keys are configured.
