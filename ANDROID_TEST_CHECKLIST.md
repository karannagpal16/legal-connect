# Legal Connect Android Internal Testing Checklist

Mark each item as Pass/Fail before uploading to Google Play Internal Testing.

| # | Test | Pass | Fail | Notes |
|---|------|------|------|-------|
| 1 | App installs on Android phone. | [ ] | [ ] | |
| 2 | Splash screen appears with dark navy/gold Legal Connect branding. | [ ] | [ ] | |
| 3 | Loading screen says `Legal Connect` and `Your Case. Our Mission.` | [ ] | [ ] | |
| 4 | `https://www.legal-connect.in` loads inside the app. | [ ] | [ ] | |
| 5 | Login works. | [ ] | [ ] | |
| 6 | Client Portal opens. | [ ] | [ ] | |
| 7 | Advocate Portal opens. | [ ] | [ ] | |
| 8 | Admin/RNA panel opens. | [ ] | [ ] | |
| 9 | Intern panel opens. | [ ] | [ ] | |
| 10 | LawBot opens. | [ ] | [ ] | |
| 11 | Legal SOS opens. | [ ] | [ ] | |
| 12 | Case tracker opens. | [ ] | [ ] | |
| 13 | File upload opens Android file picker and returns selected file to web flow. | [ ] | [ ] | Camera capture is not enabled in the native shell; use file picker for beta. |
| 14 | Razorpay checkout opens. | [ ] | [ ] | |
| 15 | Razorpay does not force UPI. | [ ] | [ ] | |
| 16 | Payment verification returns to Legal Connect web flow. | [ ] | [ ] | |
| 17 | Failed payment does not mark booking as paid. | [ ] | [ ] | |
| 18 | Work Completion Hold activates only after verified payment. | [ ] | [ ] | |
| 19 | Android back button navigates WebView history first. | [ ] | [ ] | |
| 20 | Android back button exits normally when no web history remains. | [ ] | [ ] | |
| 21 | Offline screen appears when internet is unavailable. | [ ] | [ ] | |
| 22 | Privacy Policy opens: `https://www.legal-connect.in/#privacy`. | [ ] | [ ] | |
| 23 | Terms opens: `https://www.legal-connect.in/#terms`. | [ ] | [ ] | |
| 24 | Refund Policy opens. | [ ] | [ ] | |
| 25 | No duplicate UI appears. | [ ] | [ ] | |
| 26 | No broken internal links. | [ ] | [ ] | |
| 27 | External links open safely in browser. | [ ] | [ ] | |
| 28 | Keyboard does not break login, chat, LawBot, or payment screens. | [ ] | [ ] | |
| 29 | App remains portrait. | [ ] | [ ] | |
| 30 | App does not crash on rotation/back/payment. | [ ] | [ ] | |
| 31 | App icon appears on launcher. | [ ] | [ ] | |
| 32 | Play Console reviewer notes are filled from `store-assets/reviewer-notes.txt`. | [ ] | [ ] | |

Beta limitation to note if needed:

```text
If Razorpay checkout fails inside WebView during beta, test payment through mobile browser fallback.
```
