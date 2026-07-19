# Google Play App Access Instructions

Use this only for Google Play Console app review. Do not commit the review email or code anywhere in source code.

## Render Environment Variables

Add these to the Render web service environment:

```text
PLAY_REVIEW_ENABLED=true
PLAY_REVIEW_EMAIL=<dedicated reviewer email>
PLAY_REVIEW_CODE=<dedicated reusable reviewer code>
```

Keep normal production OTP settings active:

```text
EMAIL_PROVIDER=resend
RESEND_API_KEY=<stored only in Render>
FROM_EMAIL=<verified sender>
SUPPORT_EMAIL=legalconnect0s@gmail.com
NODE_ENV=production
```

## Google Play Console Reviewer Notes

Provide Google Play with:

```text
Open Legal Connect.
Tap Login / Secure Login.
Use the dedicated Google Play review email provided in this form.
Tap Send Code.
Enter the dedicated Google Play review code provided in this form.
Tap Verify Code.
Choose Client, Advocate, or Intern.
Accept Privacy & Data consent.
Tap Open My Board.

The review account opens isolated synthetic data only:
- Client Portal
- Advocate Portal
- Intern Board
- one seeded booking
- one seeded receipt
- one seeded Legal SOS request
- one seeded Court Mission
- one seeded notification

No real payment is required. The review account can inspect the Service Room and receipt flow without Razorpay charging money.
Admin, RNA Control Room, source deletion, payment release, and real user data access are intentionally blocked.
```

## Safety Rules

- Do not use a real client or advocate email for the review account.
- Do not grant the review account `admin` or `rna` access.
- Do not enter the review code in frontend files, screenshots, README files, or Play public store text.
- Rotate `PLAY_REVIEW_CODE` after review if needed.
- Leave `PLAY_REVIEW_ENABLED=false` if Google Play review access is no longer required.

## Verification Checklist

1. `GET /api/health` shows `google_play_review_access: "enabled"`.
2. Review email + wrong code fails.
3. Review email + exact code succeeds.
4. Review account can switch only between Client, Advocate, and Intern.
5. Admin/RNA routes reject the review account.
6. Booking/payment inspection does not create a Razorpay checkout.
7. Normal users still use Resend OTP in production.
