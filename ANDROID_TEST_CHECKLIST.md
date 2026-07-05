# Legal Connect Android Internal Testing Checklist

Use this before uploading to Google Play Internal Testing and again after tester access is live.

1. App installs on Android phone.
2. Splash screen appears with Legal Connect branding.
3. `https://www.legal-connect.in` loads inside the app.
4. Login works.
5. Client Portal opens.
6. Advocate Portal opens.
7. Admin/RNA panel opens.
8. Intern panel opens.
9. LawBot opens.
10. Legal SOS opens.
11. Case tracker opens.
12. Document upload works, or limitation is noted in tester notes.
13. Razorpay checkout opens.
14. Razorpay does not force UPI.
15. Payment verification works.
16. Failed payment does not mark booking as paid.
17. Work Completion Hold activates only after verified payment.
18. Android back button navigates web history first.
19. Android back button exits normally when no web history remains.
20. Offline screen appears when internet is unavailable.
21. Privacy Policy is accessible.
22. Terms are accessible.
23. Refund Policy is accessible.
24. No duplicate UI.
25. No broken internal links.
26. External links open safely.
27. Keyboard does not break login, chat, or payment screens.
28. App remains portrait.
29. App icon appears on launcher.
30. Play Console reviewer notes are filled from `store-assets/reviewer-notes.txt`.
